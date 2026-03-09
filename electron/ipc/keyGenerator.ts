import { ipcMain } from 'electron';
import crypto from 'crypto';
import type { KeyAlgorithm, KeyGenerationOptions, GeneratedKey } from '../../src/types';

/**
 * Helper function to write a 32-bit big-endian integer to a buffer
 */
function writeUint32BE(value: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(value, 0);
  return buf;
}

/**
 * Helper function to write a string with length prefix (SSH format)
 */
function writeString(str: string | Buffer): Buffer {
  const strBuffer = typeof str === 'string' ? Buffer.from(str) : str;
  return Buffer.concat([writeUint32BE(strBuffer.length), strBuffer]);
}

/**
 * Helper function to write a big integer with length prefix (SSH mpint format)
 */
function writeMpint(bignum: Buffer): Buffer {
  // Add leading zero if high bit is set (to ensure positive number)
  let buffer = bignum;
  if (buffer[0] & 0x80) {
    buffer = Buffer.concat([Buffer.from([0]), buffer]);
  }
  return writeString(buffer);
}

/**
 * Base function to create OpenSSH private key format
 */
function createOpenSSHPrivateKey(
  publicKeyBlob: Buffer,
  privateSectionData: Buffer,
  comment: string
): string {
  const AUTH_MAGIC = Buffer.from('openssh-key-v1\0');
  const cipherName = 'none';
  const kdfName = 'none';
  const kdfOptions = Buffer.alloc(0);
  const numKeys = 1;

  // Check ints (random, must match)
  const checkInt = crypto.randomBytes(4);

  // Build private section
  let privateSection = Buffer.concat([
    checkInt,
    checkInt,
    privateSectionData,
    writeString(comment),
  ]);

  // Padding (block cipher size 8 for AES-256-CTR)
  const blockSize = 8;
  const paddingLength = blockSize - (privateSection.length % blockSize);
  const padding = Buffer.alloc(paddingLength);
  for (let i = 1; i <= paddingLength; i++) {
    padding[i - 1] = i;
  }
  privateSection = Buffer.concat([privateSection, padding]);

  // Build full key structure
  const fullKey = Buffer.concat([
    AUTH_MAGIC,
    writeString(cipherName),
    writeString(kdfName),
    writeString(kdfOptions),
    writeUint32BE(numKeys),
    writeString(publicKeyBlob),
    writeString(privateSection),
  ]);

  // Format as PEM
  const base64Key = fullKey.toString('base64');
  const lines: string[] = [];
  for (let i = 0; i < base64Key.length; i += 70) {
    lines.push(base64Key.slice(i, i + 70));
  }

  return [
    '-----BEGIN OPENSSH PRIVATE KEY-----',
    ...lines,
    '-----END OPENSSH PRIVATE KEY-----',
    '',
  ].join('\n');
}

/**
 * Formats Ed25519 public key in OpenSSH format
 */
function formatEd25519PublicKey(publicKeyBuffer: Buffer): Buffer {
  const keyType = 'ssh-ed25519';
  return Buffer.concat([
    writeString(keyType),
    writeString(publicKeyBuffer),
  ]);
}

/**
 * Formats Ed25519 private key in OpenSSH native format
 */
function formatEd25519PrivateKeyOpenSSH(
  privateKeyBuffer: Buffer,
  publicKeyBuffer: Buffer,
  comment: string
): string {
  const publicKeyBlob = formatEd25519PublicKey(publicKeyBuffer);
  const keyType = 'ssh-ed25519';

  const privateSectionData = Buffer.concat([
    writeString(keyType),
    writeString(publicKeyBuffer),
    writeString(privateKeyBuffer),
  ]);

  return createOpenSSHPrivateKey(publicKeyBlob, privateSectionData, comment);
}

/**
 * Formats RSA public key in OpenSSH format
 */
function formatRSAPublicKey(n: Buffer, e: Buffer): Buffer {
  const keyType = 'ssh-rsa';
  return Buffer.concat([
    writeString(keyType),
    writeMpint(e),
    writeMpint(n),
  ]);
}

/**
 * Formats RSA private key in OpenSSH native format
 */
function formatRSAPrivateKeyOpenSSH(
  n: Buffer, e: Buffer, d: Buffer,
  iqmp: Buffer, p: Buffer, q: Buffer,
  comment: string
): string {
  const keyType = 'ssh-rsa';

  // Public key blob
  const publicKeyBlob = formatRSAPublicKey(n, e);

  // Private section data for RSA
  const privateSectionData = Buffer.concat([
    writeString(keyType),
    writeMpint(n),
    writeMpint(e),
    writeMpint(d),
    writeMpint(iqmp),
    writeMpint(p),
    writeMpint(q),
  ]);

  return createOpenSSHPrivateKey(publicKeyBlob, privateSectionData, comment);
}

/**
 * Formats ECDSA public key in OpenSSH format
 */
function formatECDSAPublicKey(point: Buffer): Buffer {
  const keyType = 'ecdsa-sha2-nistp521';
  const curve = 'nistp521';

  return Buffer.concat([
    writeString(keyType),
    writeString(curve),
    writeString(point),
  ]);
}

/**
 * Formats ECDSA private key in OpenSSH native format
 */
function formatECDSAPrivateKeyOpenSSH(
  point: Buffer,
  scalar: Buffer,
  comment: string
): string {
  const keyType = 'ecdsa-sha2-nistp521';
  const curve = 'nistp521';

  // Public key blob
  const publicKeyBlob = formatECDSAPublicKey(point);

  // Private section data for ECDSA
  const privateSectionData = Buffer.concat([
    writeString(keyType),
    writeString(curve),
    writeString(point),
    writeMpint(scalar),
  ]);

  return createOpenSSHPrivateKey(publicKeyBlob, privateSectionData, comment);
}

/**
 * ASN.1 parser helpers
 */
function parseASN1Length(buffer: Buffer, offset: number): { length: number; offset: number } {
  let length = buffer[offset];
  offset++;

  if (length & 0x80) {
    const numBytes = length & 0x7f;
    length = 0;
    for (let i = 0; i < numBytes; i++) {
      length = (length << 8) | buffer[offset + i];
    }
    offset += numBytes;
  }

  return { length, offset };
}

function parseASN1Integer(buffer: Buffer, offset: number): { value: Buffer; offset: number } {
  if (buffer[offset] !== 0x02) {
    throw new Error(`Expected INTEGER tag (0x02), got 0x${buffer[offset].toString(16)}`);
  }
  offset++;

  const { length, offset: newOffset } = parseASN1Length(buffer, offset);
  const value = buffer.slice(newOffset, newOffset + length);

  // Remove leading zero if present (used for sign in ASN.1)
  let result = value;
  if (value[0] === 0 && value.length > 1) {
    result = value.slice(1);
  }

  return { value: result, offset: newOffset + length };
}

/**
 * Extract RSA key components from PKCS#1 DER
 */
function parseRSAPrivateKeyPKCS1(der: Buffer): {
  n: Buffer; e: Buffer; d: Buffer;
  p: Buffer; q: Buffer;
  dmp1: Buffer; dmq1: Buffer; iqmp: Buffer;
} {
  // RSAPrivateKey ::= SEQUENCE {
  //   version           Version,
  //   modulus           INTEGER,  -- n
  //   publicExponent    INTEGER,  -- e
  //   privateExponent   INTEGER,  -- d
  //   prime1            INTEGER,  -- p
  //   prime2            INTEGER,  -- q
  //   exponent1         INTEGER,  -- d mod (p-1) = dmp1
  //   exponent2         INTEGER,  -- d mod (q-1) = dmq1
  //   coefficient       INTEGER   -- (inverse of q) mod p = iqmp
  // }

  let offset = 0;

  // SEQUENCE tag
  if (der[offset] !== 0x30) {
    throw new Error('Expected SEQUENCE');
  }
  offset++;

  // Skip SEQUENCE length
  const { offset: newOffset } = parseASN1Length(der, offset);
  offset = newOffset;

  // Version
  const version = parseASN1Integer(der, offset);
  offset = version.offset;

  // n (modulus)
  const n = parseASN1Integer(der, offset);
  offset = n.offset;

  // e (public exponent)
  const e = parseASN1Integer(der, offset);
  offset = e.offset;

  // d (private exponent)
  const d = parseASN1Integer(der, offset);
  offset = d.offset;

  // p (prime1)
  const p = parseASN1Integer(der, offset);
  offset = p.offset;

  // q (prime2)
  const q = parseASN1Integer(der, offset);
  offset = q.offset;

  // dmp1 (exponent1)
  const dmp1 = parseASN1Integer(der, offset);
  offset = dmp1.offset;

  // dmq1 (exponent2)
  const dmq1 = parseASN1Integer(der, offset);
  offset = dmq1.offset;

  // iqmp (coefficient)
  const iqmp = parseASN1Integer(der, offset);

  return {
    n: n.value,
    e: e.value,
    d: d.value,
    p: p.value,
    q: q.value,
    dmp1: dmp1.value,
    dmq1: dmq1.value,
    iqmp: iqmp.value,
  };
}

/**
 * Extract ECDSA key components from PKCS#8 DER
 */
function parseECDSAPrivateKeyPKCS8(der: Buffer): { scalar: Buffer; point: Buffer } {
  // ECPrivateKey ::= SEQUENCE {
  //   version        INTEGER,
  //   privateKey     OCTET STRING,
  //   parameters [0] ECParameters OPTIONAL,
  //   publicKey  [1] BIT STRING OPTIONAL
  // }

  // First, find the ECPrivateKey inside the PKCS#8 wrapper
  // PKCS#8: SEQUENCE { version, privateKeyAlgorithm, privateKey }

  let offset = 0;

  // Outer SEQUENCE
  if (der[offset] !== 0x30) {
    throw new Error('Expected SEQUENCE');
  }
  offset++;

  const { offset: outerOffset } = parseASN1Length(der, offset);
  offset = outerOffset;

  // Version (INTEGER)
  const version = parseASN1Integer(der, offset);
  offset = version.offset;

  // privateKeyAlgorithm SEQUENCE
  if (der[offset] !== 0x30) {
    throw new Error('Expected privateKeyAlgorithm SEQUENCE');
  }
  offset++;

  const { length: algoLength, offset: algoOffset } = parseASN1Length(der, offset);
  offset = algoOffset + algoLength;

  // privateKey OCTET STRING
  if (der[offset] !== 0x04) {
    throw new Error('Expected OCTET STRING for privateKey');
  }
  offset++;

  const { length: pkLength, offset: pkOffset } = parseASN1Length(der, offset);
  const ecPrivateKeyDer = der.slice(pkOffset, pkOffset + pkLength);

  // Parse ECPrivateKey
  let ecOffset = 0;

  // SEQUENCE
  if (ecPrivateKeyDer[ecOffset] !== 0x30) {
    throw new Error('Expected SEQUENCE in ECPrivateKey');
  }
  ecOffset++;

  const { offset: ecSeqOffset } = parseASN1Length(ecPrivateKeyDer, ecOffset);
  ecOffset = ecSeqOffset;

  // Version
  const ecVersion = parseASN1Integer(ecPrivateKeyDer, ecOffset);
  ecOffset = ecVersion.offset;

  // privateKey OCTET STRING (the scalar)
  if (ecPrivateKeyDer[ecOffset] !== 0x04) {
    throw new Error('Expected OCTET STRING for scalar');
  }
  ecOffset++;

  const { length: scalarLength, offset: scalarOffset } = parseASN1Length(ecPrivateKeyDer, ecOffset);
  const scalar = ecPrivateKeyDer.slice(scalarOffset, scalarOffset + scalarLength);
  ecOffset = scalarOffset + scalarLength;

  // Skip parameters [0] if present
  if (ecPrivateKeyDer[ecOffset] === 0xa0) {
    ecOffset++;
    const { length: paramLength, offset: paramOffset } = parseASN1Length(ecPrivateKeyDer, ecOffset);
    ecOffset = paramOffset + paramLength;
  }

  // publicKey [1] BIT STRING
  let point: Buffer;
  if (ecPrivateKeyDer[ecOffset] === 0xa1) {
    ecOffset++;
    const { length: pubLength, offset: pubOffset } = parseASN1Length(ecPrivateKeyDer, ecOffset);
    // Skip unused bits byte
    point = ecPrivateKeyDer.slice(pubOffset + 1, pubOffset + pubLength);
  } else {
    throw new Error('Public key not found in ECPrivateKey');
  }

  return { scalar, point };
}

/**
 * Extract public key point from ECDSA SPKI DER
 */
function parseECDSAPublicKeySPKI(der: Buffer): Buffer {
  // Find the BIT STRING (tag 0x03)
  let bitStringStart = -1;
  for (let i = 0; i < der.length - 1; i++) {
    if (der[i] === 0x03) {
      bitStringStart = i;
      break;
    }
  }

  if (bitStringStart === -1) {
    throw new Error('Invalid ECDSA SPKI format');
  }

  let offset = bitStringStart + 1;
  const { length, offset: newOffset } = parseASN1Length(der, offset);
  offset = newOffset;

  // Skip unused bits byte
  offset++;

  return der.slice(offset, offset + length - 1);
}

/**
 * Extract n and e from RSA SPKI DER
 */
function parseRSAPublicKeySPKI(der: Buffer): { n: Buffer; e: Buffer } {
  // Find the BIT STRING (tag 0x03)
  let bitStringStart = -1;
  for (let i = 0; i < der.length - 1; i++) {
    if (der[i] === 0x03) {
      bitStringStart = i;
      break;
    }
  }

  if (bitStringStart === -1) {
    throw new Error('Invalid RSA SPKI format');
  }

  let offset = bitStringStart + 1;
  const { offset: newOffset } = parseASN1Length(der, offset);
  offset = newOffset;

  // Skip unused bits byte
  offset++;

  // RSAPublicKey SEQUENCE
  if (der[offset] !== 0x30) {
    throw new Error('Expected SEQUENCE for RSAPublicKey');
  }
  offset++;

  const { offset: seqOffset } = parseASN1Length(der, offset);
  offset = seqOffset;

  // n
  const n = parseASN1Integer(der, offset);
  offset = n.offset;

  // e
  const e = parseASN1Integer(der, offset);

  return { n: n.value, e: e.value };
}

/**
 * Formats public key in OpenSSH format
 */
function formatPublicKeyOpenSSH(
  keyData: Buffer,
  algorithm: KeyAlgorithm,
  comment: string
): string {
  let sshKeyBuffer: Buffer;

  switch (algorithm) {
    case 'ed25519':
      sshKeyBuffer = formatEd25519PublicKey(keyData);
      break;
    case 'rsa-4096': {
      const { n, e } = parseRSAPublicKeySPKI(keyData);
      sshKeyBuffer = formatRSAPublicKey(n, e);
      break;
    }
    case 'ecdsa':
      sshKeyBuffer = formatECDSAPublicKey(keyData);
      break;
    default:
      throw new Error(`Unsupported algorithm: ${algorithm}`);
  }

  const keyType = algorithm === 'ed25519' ? 'ssh-ed25519' :
                  algorithm === 'rsa-4096' ? 'ssh-rsa' :
                  'ecdsa-sha2-nistp521';

  const base64Key = sshKeyBuffer.toString('base64');

  if (comment) {
    return `${keyType} ${base64Key} ${comment}`;
  }
  return `${keyType} ${base64Key}`;
}

/**
 * Generates an Ed25519 key pair
 */
function generateEd25519Key(_passphrase?: string, comment?: string): { privateKey: string; publicKeyData: Buffer } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

  // Export public key in SPKI DER format
  const publicKeySpki = publicKey.export({ type: 'spki', format: 'der' });

  // Extract raw 32-byte public key from SPKI
  const rawPublicKey = publicKeySpki.slice(-32);

  // Export private key in PKCS#8 DER format to extract raw key
  const privateKeyPkcs8 = privateKey.export({ type: 'pkcs8', format: 'der' });

  // Extract raw 32-byte private key from PKCS#8
  const rawPrivateKey = privateKeyPkcs8.slice(-32);

  // Format in OpenSSH native format
  const openSshPrivateKey = formatEd25519PrivateKeyOpenSSH(
    rawPrivateKey,
    rawPublicKey,
    comment || ''
  );

  return { privateKey: openSshPrivateKey, publicKeyData: rawPublicKey };
}

/**
 * Generates an RSA 4096-bit key pair
 */
function generateRSAKey(_passphrase?: string, comment?: string): { privateKey: string; publicKeyData: Buffer } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicExponent: 0x10001,
  });

  // Export public key in SPKI DER format
  const publicKeySpki = publicKey.export({ type: 'spki', format: 'der' });

  // Export private key in PKCS#1 DER format to extract components
  const privateKeyPkcs1 = privateKey.export({ type: 'pkcs1', format: 'der' });

  // Parse the private key to extract components
  const components = parseRSAPrivateKeyPKCS1(privateKeyPkcs1);

  // Format in OpenSSH native format
  const openSshPrivateKey = formatRSAPrivateKeyOpenSSH(
    components.n,
    components.e,
    components.d,
    components.iqmp,
    components.p,
    components.q,
    comment || ''
  );

  return { privateKey: openSshPrivateKey, publicKeyData: publicKeySpki };
}

/**
 * Generates an ECDSA P-521 key pair
 */
function generateECDSAKey(_passphrase?: string, comment?: string): { privateKey: string; publicKeyData: Buffer } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-521',
  });

  // Export public key in SPKI DER format
  const publicKeySpki = publicKey.export({ type: 'spki', format: 'der' });

  // Extract the point from SPKI
  const point = parseECDSAPublicKeySPKI(publicKeySpki);

  // Export private key in PKCS#8 DER format to extract scalar
  const privateKeyPkcs8 = privateKey.export({ type: 'pkcs8', format: 'der' });

  // Parse to extract scalar
  const { scalar } = parseECDSAPrivateKeyPKCS8(privateKeyPkcs8);

  // Format in OpenSSH native format
  const openSshPrivateKey = formatECDSAPrivateKeyOpenSSH(
    point,
    scalar,
    comment || ''
  );

  return { privateKey: openSshPrivateKey, publicKeyData: point };
}

/**
 * Calculates SHA256 fingerprint
 */
function calculateFingerprint(sshKeyBuffer: Buffer): string {
  const hash = crypto.createHash('sha256');
  hash.update(sshKeyBuffer);
  const digest = hash.digest('base64');
  return `SHA256:${digest.replace(/=+$/, '')}`;
}

/**
 * Generates SSH key pair based on algorithm
 */
async function generateKeyPair(options: KeyGenerationOptions): Promise<GeneratedKey> {
  const { algorithm, passphrase, email, keyName } = options;

  // Generate comment
  const comment = email || `${keyName}@sshforge`;

  let keyPair: { privateKey: string; publicKeyData: Buffer };

  switch (algorithm) {
    case 'ed25519':
      keyPair = generateEd25519Key(passphrase, comment);
      break;
    case 'rsa-4096':
      keyPair = generateRSAKey(passphrase, comment);
      break;
    case 'ecdsa':
      keyPair = generateECDSAKey(passphrase, comment);
      break;
    default:
      throw new Error(`Unsupported algorithm: ${algorithm}`);
  }

  // Format public key in OpenSSH format
  const publicKeyOpenSSH = formatPublicKeyOpenSSH(keyPair.publicKeyData, algorithm, comment);

  // Calculate fingerprint from the base64 part
  const parts = publicKeyOpenSSH.split(' ');
  const sshKeyBuffer = Buffer.from(parts[1], 'base64');
  const fingerprint = calculateFingerprint(sshKeyBuffer);

  return {
    privateKey: keyPair.privateKey,
    publicKey: publicKeyOpenSSH,
    fingerprint,
    algorithm,
    keyName,
  };
}

/**
 * Register IPC handlers for key generation
 */
export function registerKeyGeneratorHandlers(): void {
  ipcMain.handle('key:generate', async (_event, options: KeyGenerationOptions) => {
    try {
      const key = await generateKeyPair(options);
      return { success: true, key };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Key generation error:', error);
      return { success: false, error: message };
    }
  });
}
