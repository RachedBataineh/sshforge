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
  'ecdsa-p256': {
    name: 'ECDSA P-256',
    description: 'NIST P-256 curve. Good compatibility with most systems.',
    recommended: false,
    keySize: '256 bits',
    speed: 'fast',
  },
  'ecdsa-p384': {
    name: 'ECDSA P-384',
    description: 'NIST P-384 curve. Higher security than P-256.',
    recommended: false,
    keySize: '384 bits',
    speed: 'medium',
  },
  'ecdsa-p521': {
    name: 'ECDSA P-521',
    description: 'NIST P-521 curve. Highest security ECDSA option.',
    recommended: false,
    keySize: '521 bits',
    speed: 'medium',
  },
};

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
