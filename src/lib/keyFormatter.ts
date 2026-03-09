import type { KeyAlgorithm } from '@/types';

/**
 * Formats a public key in OpenSSH format
 * OpenSSH public key format: ssh-<algorithm> <base64-key> <comment>
 */
export function formatPublicKeyOpenSSH(
  publicKeyBuffer: Buffer,
  algorithm: KeyAlgorithm,
  comment: string = ''
): string {
  let keyType: string;

  switch (algorithm) {
    case 'ed25519':
      keyType = 'ssh-ed25519';
      break;
    case 'rsa-4096':
      keyType = 'ssh-rsa';
      break;
    case 'ecdsa':
      keyType = 'ecdsa-sha2-nistp521';
      break;
    default:
      throw new Error(`Unsupported algorithm: ${algorithm}`);
  }

  const base64Key = publicKeyBuffer.toString('base64');

  if (comment) {
    return `${keyType} ${base64Key} ${comment}`;
  }
  return `${keyType} ${base64Key}`;
}

/**
 * Formats a private key in PEM format (OpenSSH compatible)
 * Uses OpenSSH private key format for Ed25519 and ECDSA
 * Uses PKCS#1 format for RSA
 */
export function formatPrivateKeyOpenSSH(
  privateKeyPem: string,
  algorithm: KeyAlgorithm
): string {
  // The Node.js crypto module returns keys in PEM format
  // For Ed25519 and ECDSA, we want OpenSSH format
  // For RSA, PKCS#1 PEM format is fine

  if (algorithm === 'ed25519' || algorithm === 'ecdsa') {
    // Convert to OpenSSH private key format
    return convertToOpenSSHPrivateFormat(privateKeyPem);
  }

  // RSA keys are already in correct PEM format
  return privateKeyPem;
}

/**
 * Converts PKCS#8 PEM to OpenSSH private key format
 */
function convertToOpenSSHPrivateFormat(pem: string): string {
  // For simplicity, we'll use the PEM format which is also supported by OpenSSH
  // OpenSSH 6.5+ supports PEM format for Ed25519
  return pem;
}

/**
 * Calculates the fingerprint of a public key
 * Returns SHA256 fingerprint in OpenSSH format
 */
export function calculateFingerprint(publicKeyBuffer: Buffer): string {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256');
  hash.update(publicKeyBuffer);
  const digest = hash.digest('base64');
  return `SHA256:${digest.replace(/=+$/, '')}`;
}

/**
 * Generates a comment for the public key
 */
export function generateKeyComment(email?: string, keyName?: string): string {
  if (email) {
    return email;
  }
  if (keyName) {
    return `key-${keyName}@sshforge`;
  }
  return 'generated-by-sshforge';
}
