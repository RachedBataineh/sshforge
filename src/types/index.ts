export type KeyAlgorithm = 'ed25519' | 'rsa-4096' | 'ecdsa';

export interface KeyGenerationOptions {
  algorithm: KeyAlgorithm;
  keyName: string;
  passphrase?: string;
  email?: string;
}

export interface GeneratedKey {
  privateKey: string;
  publicKey: string;
  fingerprint: string;
  algorithm: KeyAlgorithm;
  keyName: string;
}

export interface SaveOptions {
  privateKey: string;
  publicKey: string;
  keyName: string;
  savePath: string;
}

export interface AppPreferences {
  defaultSaveLocation: string;
  lastUsedAlgorithm: KeyAlgorithm;
  rememberPassphrase: boolean;
}

export interface FileSaveResult {
  success: boolean;
  privateKeyPath: string;
  publicKeyPath: string;
  error?: string;
}

// SSH Key Management Types
export interface SSHKeyInfo {
  name: string;
  privateKeyPath: string;
  publicKeyPath: string;
  hasPublicKey: boolean;
  hasPrivateKey: boolean;
  algorithm: string;
  created: string | null;
  modified: string | null;
  fingerprint?: string;
  comment?: string;
}

export interface KeyDeleteResult {
  success: boolean;
  error?: string;
}

export interface KeyRenameResult {
  success: boolean;
  newPrivateKeyPath?: string;
  newPublicKeyPath?: string;
  error?: string;
}

export type AppView = 'list' | 'create';
