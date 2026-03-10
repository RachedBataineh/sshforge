export type KeyAlgorithm = 'ed25519' | 'rsa-4096' | 'ecdsa-p256' | 'ecdsa-p384' | 'ecdsa-p521';

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
  overwrite?: boolean;
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

// SSH Server Connection Types
export interface SSHServerConnection {
  alias: string;           // Host alias (e.g., "my-server")
  hostName: string;        // IP or domain (e.g., "192.168.1.100")
  user: string;            // SSH username
  port?: number;           // Optional port (default 22)
  identityFilePath: string; // Path to private key
}

export interface SSHConfigEntry {
  host: string;
  hostName: string;
  user: string;
  identityFile: string;
  port?: number;
}
