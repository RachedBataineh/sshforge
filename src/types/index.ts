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

export type SaveLocation = 'default' | 'custom';

export interface FileSaveResult {
  success: boolean;
  privateKeyPath: string;
  publicKeyPath: string;
  error?: string;
}
