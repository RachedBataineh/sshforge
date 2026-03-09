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
 * Formats Ed25519 public key in OpenSSH format
 */
function formatEd25519PublicKey(publicKeyBuffer: Buffer): Buffer {
  // Ed25519 public key in OpenSSH format: ssh-ed25519 <base64-encoded>
  // The base64 part is: string("ssh-ed25519") + string(public_key)
  const keyType = 'ssh-ed25519';
  return Buffer.concat([
    writeString(keyType),
    writeString(publicKeyBuffer),
  ]);
}

/**
 * Formats Ed25519 private key in OpenSSH native format (unencrypted)
 */
function formatEd25519PrivateKeyOpenSSH(
  privateKeyBuffer: Buffer,
  publicKeyBuffer: Buffer,
  comment: string
): string {
  const AUTH_MAGIC = Buffer.from('openssh-key-v1\0');
  const cipherName = 'none';
  const kdfName = 'none';
  const kdfOptions = Buffer.alloc(0);
  const numKeys = 1;

  // Public key blob
  const publicKeyBlob = formatEd25519PublicKey(publicKeyBuffer);

  // Check ints (random, must match)
  const checkInt = crypto.randomBytes(4);

  // Key type
  const keyType = 'ssh-ed25519';

  // Private section
  let privateSection = Buffer.concat([
    checkInt,
    checkInt,
    writeString(keyType),
    writeString(publicKeyBuffer),
    writeString(privateKeyBuffer),
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
 * Formats RSA public key in OpenSSH format from SPKI DER
 */
function formatRSAPublicKey(spkidDer: Buffer): Buffer {
  // Find the BIT STRING (tag 0x03)
  let bitStringStart = -1;
  for (let i = 0; i < spkidDer.length - 1; i++) {
    if (spkidDer[i] === 0x03) {
      bitStringStart = i;
      break;
    }
  }

  if (bitStringStart === -1) {
    throw new Error('Invalid RSA SPKI format: BIT STRING not found');
  }

  // Skip tag and length bytes
  let offset = bitStringStart + 1;
  let length = spkidDer[offset];
  offset++;

  // Handle long-form length if needed
  if (length & 0x80) {
    const numBytes = length & 0x7f;
    length = 0;
    for (let i = 0; i < numBytes; i++) {
      length = (length << 8) | spkidDer[offset + i];
    }
    offset += numBytes;
  }

  // Skip unused bits byte
  offset++;

  // Now we're at the RSAPublicKey SEQUENCE
  if (spkidDer[offset] !== 0x30) {
    throw new Error('Invalid RSA public key format');
  }
  offset++;

  // Skip SEQUENCE length
  let seqLength = spkidDer[offset];
  offset++;
  if (seqLength & 0x80) {
    const numBytes = seqLength & 0x7f;
    seqLength = 0;
    for (let i = 0; i < numBytes; i++) {
      seqLength = (seqLength << 8) | spkidDer[offset + i];
    }
    offset += numBytes;
  }

  // Parse n (INTEGER)
  if (spkidDer[offset] !== 0x02) {
    throw new Error('Expected INTEGER for n');
  }
  offset++;

  let nLength = spkidDer[offset];
  offset++;
  if (nLength & 0x80) {
    const numBytes = nLength & 0x7f;
    nLength = 0;
    for (let i = 0; i < numBytes; i++) {
      nLength = (nLength << 8) | spkidDer[offset + i];
    }
    offset += numBytes;
  }

  const n = spkidDer.slice(offset, offset + nLength);
  offset += nLength;

  // Parse e (INTEGER)
  if (spkidDer[offset] !== 0x02) {
    throw new Error('Expected INTEGER for e');
  }
  offset++;

  let eLength = spkidDer[offset];
  offset++;
  if (eLength & 0x80) {
    const numBytes = eLength & 0x7f;
    eLength = 0;
    for (let i = 0; i < numBytes; i++) {
      eLength = (eLength << 8) | spkidDer[offset + i];
    }
    offset += numBytes;
  }

  const e = spkidDer.slice(offset, offset + eLength);

  // Build OpenSSH format
  const keyType = 'ssh-rsa';
  return Buffer.concat([
    writeString(keyType),
    writeMpint(e),
    writeMpint(n),
  ]);
}

/**
 * Formats ECDSA public key in OpenSSH format from SPKI DER
 */
function formatECDSAPublicKey(spkidDer: Buffer): Buffer {
  // Find the BIT STRING (tag 0x03)
  let bitStringStart = -1;
  for (let i = 0; i < spkidDer.length - 1; i++) {
    if (spkidDer[i] === 0x03) {
      bitStringStart = i;
      break;
    }
  }

  if (bitStringStart === -1) {
    throw new Error('Invalid ECDSA SPKI format');
  }

  // Skip tag and length
  let offset = bitStringStart + 1;
  let length = spkidDer[offset];
  offset++;

  if (length & 0x80) {
    const numBytes = length & 0x7f;
    offset += numBytes;
  }

  // Skip unused bits byte
  offset++;

  // Extract the point
  const point = spkidDer.slice(offset);

  // Build OpenSSH format
  const keyType = 'ecdsa-sha2-nistp521';
  const curve = 'nistp521';

  return Buffer.concat([
    writeString(keyType),
    writeString(curve),
    writeString(point),
  ]);
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
    case 'rsa-4096':
      sshKeyBuffer = formatRSAPublicKey(keyData);
      break;
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
function generateRSAKey(passphrase?: string): { privateKey: string; publicKeyData: Buffer } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicExponent: 0x10001,
  });

  // Export public key in SPKI DER format
  const publicKeySpki = publicKey.export({ type: 'spki', format: 'der' });

  // Export private key
  let privateKeyPem: string;
  if (passphrase) {
    privateKeyPem = privateKey.export({
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: passphrase,
    }) as string;
  } else {
    privateKeyPem = privateKey.export({
      type: 'pkcs8',
      format: 'pem',
    }) as string;
  }

  return { privateKey: privateKeyPem, publicKeyData: publicKeySpki };
}

/**
 * Generates an ECDSA P-521 key pair
 */
function generateECDSAKey(passphrase?: string): { privateKey: string; publicKeyData: Buffer } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-521',
  });

  // Export public key in SPKI DER format
  const publicKeySpki = publicKey.export({ type: 'spki', format: 'der' });

  // Export private key
  let privateKeyPem: string;
  if (passphrase) {
    privateKeyPem = privateKey.export({
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: passphrase,
    }) as string;
  } else {
    privateKeyPem = privateKey.export({
      type: 'pkcs8',
      format: 'pem',
    }) as string;
  }

  return { privateKey: privateKeyPem, publicKeyData: publicKeySpki };
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
      keyPair = generateRSAKey(passphrase);
      break;
    case 'ecdsa':
      keyPair = generateECDSAKey(passphrase);
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
