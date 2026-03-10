import { create } from 'zustand';
import type { SSHKeyInfo, AppView } from '@/types';

interface AppStore {
  // View state
  currentView: AppView;
  selectedKey: SSHKeyInfo | null;
  keys: SSHKeyInfo[];
  isLoading: boolean;
  error: string | null;

  // Key content
  publicKeyContent: string | null;
  privateKeyContent: string | null;
  showPrivateKey: boolean;

  // Dialog states
  showDeleteDialog: boolean;
  showRenameDialog: boolean;
  keyToDelete: SSHKeyInfo | null;
  keyToRename: SSHKeyInfo | null;
  renameValue: string;

  // Actions
  setCurrentView: (view: AppView) => void;
  setSelectedKey: (key: SSHKeyInfo | null) => void;
  setKeys: (keys: SSHKeyInfo[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPublicKeyContent: (content: string | null) => void;
  setPrivateKeyContent: (content: string | null) => void;
  setShowPrivateKey: (show: boolean) => void;
  setShowDeleteDialog: (show: boolean) => void;
  setShowRenameDialog: (show: boolean) => void;
  setKeyToDelete: (key: SSHKeyInfo | null) => void;
  setKeyToRename: (key: SSHKeyInfo | null) => void;
  setRenameValue: (value: string) => void;

  // Complex actions
  loadKeys: () => Promise<void>;
  selectKey: (key: SSHKeyInfo) => Promise<void>;
  deleteSelectedKey: () => Promise<boolean>;
  renameSelectedKey: (newName: string) => Promise<boolean>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  currentView: 'list',
  selectedKey: null,
  keys: [],
  isLoading: false,
  error: null,
  publicKeyContent: null,
  privateKeyContent: null,
  showPrivateKey: false,
  showDeleteDialog: false,
  showRenameDialog: false,
  keyToDelete: null,
  keyToRename: null,
  renameValue: '',

  // Simple setters
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedKey: (key) => set({ selectedKey: key }),
  setKeys: (keys) => set({ keys }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setPublicKeyContent: (content) => set({ publicKeyContent: content }),
  setPrivateKeyContent: (content) => set({ privateKeyContent: content }),
  setShowPrivateKey: (show) => set({ showPrivateKey: show }),
  setShowDeleteDialog: (show) => set({ showDeleteDialog: show }),
  setShowRenameDialog: (show) => set({ showRenameDialog: show }),
  setKeyToDelete: (key) => set({ keyToDelete: key }),
  setKeyToRename: (key) => set({ keyToRename: key }),
  setRenameValue: (value) => set({ renameValue: value }),

  // Load all keys from the SSH directory
  loadKeys: async () => {
    set({ isLoading: true, error: null });
    try {
      const keys = await window.electronAPI.listKeys();
      set({ keys, isLoading: false });

      // If there was a selected key, update it with new data
      const { selectedKey } = get();
      if (selectedKey) {
        const updatedKey = keys.find(k => k.privateKeyPath === selectedKey.privateKeyPath);
        if (updatedKey) {
          set({ selectedKey: updatedKey });
        } else {
          // Key was deleted, clear selection
          set({ selectedKey: null, publicKeyContent: null, privateKeyContent: null });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load keys';
      set({ error: message, isLoading: false });
    }
  },

  // Select a key and load its contents
  selectKey: async (key) => {
    set({ selectedKey: key, showPrivateKey: false, error: null });
    try {
      const [publicKey, privateKey] = await Promise.all([
        window.electronAPI.readKey(key.publicKeyPath),
        window.electronAPI.readKey(key.privateKeyPath),
      ]);
      set({ publicKeyContent: publicKey, privateKeyContent: privateKey });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load key contents';
      set({ error: message });
    }
  },

  // Delete the selected key
  deleteSelectedKey: async () => {
    const { keyToDelete } = get();
    if (!keyToDelete) return false;

    try {
      const result = await window.electronAPI.deleteKey(keyToDelete.privateKeyPath);
      if (result.success) {
        set({ showDeleteDialog: false, keyToDelete: null });
        await get().loadKeys();
        return true;
      } else {
        set({ error: result.error || 'Failed to delete key' });
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete key';
      set({ error: message });
      return false;
    }
  },

  // Rename a key
  renameSelectedKey: async (newName) => {
    const { keyToRename } = get();
    if (!keyToRename) return false;

    try {
      const result = await window.electronAPI.renameKey(keyToRename.privateKeyPath, newName);
      if (result.success) {
        set({ showRenameDialog: false, keyToRename: null, renameValue: '' });
        await get().loadKeys();
        return true;
      } else {
        set({ error: result.error || 'Failed to rename key' });
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to rename key';
      set({ error: message });
      return false;
    }
  },

}));
