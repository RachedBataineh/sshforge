import { create } from 'zustand';
import type { KeyAlgorithm, GeneratedKey, SaveLocation } from '@/types';

interface KeyStore {
  // Form state
  algorithm: KeyAlgorithm;
  keyName: string;
  email: string;
  passphrase: string;
  confirmPassphrase: string;
  saveLocation: SaveLocation;
  customPath: string;
  defaultPath: string;

  // Generated key
  generatedKey: GeneratedKey | null;

  // Saved file paths
  privateKeyPath: string;
  publicKeyPath: string;

  // UI state
  isGenerating: boolean;
  isSaving: boolean;
  showSuccess: boolean;
  showOverwriteDialog: boolean;
  error: string | null;

  // Actions
  setAlgorithm: (algo: KeyAlgorithm) => void;
  setKeyName: (name: string) => void;
  setEmail: (email: string) => void;
  setPassphrase: (pass: string) => void;
  setConfirmPassphrase: (pass: string) => void;
  setSaveLocation: (loc: SaveLocation) => void;
  setCustomPath: (path: string) => void;
  setDefaultPath: (path: string) => void;
  setGeneratedKey: (key: GeneratedKey | null) => void;
  setPrivateKeyPath: (path: string) => void;
  setPublicKeyPath: (path: string) => void;
  setIsGenerating: (value: boolean) => void;
  setIsSaving: (value: boolean) => void;
  setShowSuccess: (show: boolean) => void;
  setShowOverwriteDialog: (show: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  algorithm: 'ed25519' as KeyAlgorithm,
  keyName: 'id_ed25519',
  email: '',
  passphrase: '',
  confirmPassphrase: '',
  saveLocation: 'default' as SaveLocation,
  customPath: '',
  defaultPath: '',
  generatedKey: null,
  privateKeyPath: '',
  publicKeyPath: '',
  isGenerating: false,
  isSaving: false,
  showSuccess: false,
  showOverwriteDialog: false,
  error: null,
};

export const useKeyStore = create<KeyStore>((set) => ({
  ...initialState,

  setAlgorithm: (algorithm) => {
    set({ algorithm });
    // Update default key name based on algorithm
    const defaultName = algorithm === 'rsa-4096' ? 'id_rsa' :
                        algorithm === 'ecdsa' ? 'id_ecdsa' :
                        'id_ed25519';
    set({ keyName: defaultName });
  },

  setKeyName: (keyName) => set({ keyName }),
  setEmail: (email) => set({ email }),
  setPassphrase: (passphrase) => set({ passphrase }),
  setConfirmPassphrase: (confirmPassphrase) => set({ confirmPassphrase }),
  setSaveLocation: (saveLocation) => set({ saveLocation }),
  setCustomPath: (customPath) => set({ customPath }),
  setDefaultPath: (defaultPath) => set({ defaultPath }),
  setGeneratedKey: (generatedKey) => set({ generatedKey }),
  setPrivateKeyPath: (privateKeyPath) => set({ privateKeyPath }),
  setPublicKeyPath: (publicKeyPath) => set({ publicKeyPath }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setIsSaving: (isSaving) => set({ isSaving }),
  setShowSuccess: (showSuccess) => set({ showSuccess }),
  setShowOverwriteDialog: (showOverwriteDialog) => set({ showOverwriteDialog }),
  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));
