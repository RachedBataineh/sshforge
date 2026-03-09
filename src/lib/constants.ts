import type { KeyAlgorithm } from '@/types';

export const APP_NAME = 'SSHForge';

export const ALGORITHM_INFO: Record<KeyAlgorithm, {
  name: string;
  description: string;
  recommended: boolean;
  keySize: string;
  speed: 'fast' | 'medium' | 'slow';
}> = {
  'ed25519': {
    name: 'Ed25519',
    description: 'Modern, secure, and fast. Recommended for most use cases.',
    recommended: true,
    keySize: '256 bits',
    speed: 'fast',
  },
  'rsa-4096': {
    name: 'RSA 4096',
    description: 'Legacy compatible. Use for older systems that don\'t support Ed25519.',
    recommended: false,
    keySize: '4096 bits',
    speed: 'slow',
  },
  'ecdsa': {
    name: 'ECDSA P-521',
    description: 'Elliptic curve alternative. Good balance of security and compatibility.',
    recommended: false,
    keySize: '521 bits',
    speed: 'medium',
  },
};

export const DEFAULT_KEY_NAME = 'id_ed25519';

export const IPC_CHANNELS = {
  // Renderer -> Main
  GENERATE_KEY: 'key:generate',
  SAVE_KEY: 'file:save',
  SELECT_DIRECTORY: 'file:select-directory',
  GET_DEFAULT_PATH: 'file:get-default-path',
  GET_PLATFORM: 'app:get-platform',
  CHECK_FILE_EXISTS: 'file:check-exists',

  // Main -> Renderer
  KEY_GENERATED: 'key:generated',
  KEY_ERROR: 'key:error',
  FILE_SAVED: 'file:saved',
} as const;

export const FILE_PERMISSIONS = {
  PRIVATE_KEY: 0o600,
  PUBLIC_KEY: 0o644,
  DIRECTORY: 0o700,
} as const;
