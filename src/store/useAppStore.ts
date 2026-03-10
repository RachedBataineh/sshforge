import { create } from 'zustand';
import type { SSHKeyInfo, AppView, SSHServerConnection, SSHConfigEntry, SSHAgentKey } from '@/types';

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

  // Server connections
  serverConnections: SSHServerConnection[];
  showAddServerDialog: boolean;

  // SSH Agent
  agentKeys: SSHAgentKey[];
  keysInAgent: Set<string>; // Set of private key paths loaded in agent

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
  setShowAddServerDialog: (show: boolean) => void;

  // Complex actions
  loadKeys: () => Promise<void>;
  selectKey: (key: SSHKeyInfo) => Promise<void>;
  deleteSelectedKey: () => Promise<boolean>;
  renameSelectedKey: (newName: string) => Promise<boolean>;

  // Server connection actions
  loadServerConnections: () => Promise<void>;
  addServerConnection: (keyPath: string, connection: Omit<SSHServerConnection, 'identityFilePath'>) => Promise<boolean>;
  removeServerConnection: (alias: string) => Promise<boolean>;
  connectToServer: (connection: SSHServerConnection) => Promise<boolean>;
  forgetServer: (hostname: string) => Promise<boolean>;
  forgetServersForKey: (keyPath: string) => Promise<boolean>;

  // SSH Agent actions
  loadAgentKeys: () => Promise<void>;
  checkKeyInAgent: (privateKeyPath: string) => Promise<boolean>;
  addKeyToAgent: (privateKeyPath: string, passphrase: string) => Promise<boolean>;
  removeKeyFromAgent: (privateKeyPath: string) => Promise<boolean>;
  isKeyInAgent: (privateKeyPath: string) => boolean;
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
  serverConnections: [],
  showAddServerDialog: false,
  agentKeys: [],
  keysInAgent: new Set<string>(),

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
  setShowAddServerDialog: (show) => set({ showAddServerDialog: show }),

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

  // Load server connections from SSH config
  loadServerConnections: async () => {
    try {
      const result = await window.electronAPI.readSSHConfig();
      if (result.success) {
        const connections: SSHServerConnection[] = result.entries.map((entry: SSHConfigEntry) => ({
          alias: entry.host,
          hostName: entry.hostName,
          user: entry.user,
          port: entry.port,
          identityFilePath: entry.identityFile,
        }));
        set({ serverConnections: connections });
      } else {
        console.error('Failed to load SSH config:', result.error);
      }
    } catch (error) {
      console.error('Error loading server connections:', error);
    }
  },

  // Add a new server connection
  addServerConnection: async (keyPath: string, connection: Omit<SSHServerConnection, 'identityFilePath'>) => {
    try {
      const entry: SSHConfigEntry = {
        host: connection.alias,
        hostName: connection.hostName,
        user: connection.user,
        port: connection.port,
        identityFile: keyPath,
      };

      const result = await window.electronAPI.addSSHConfigEntry(entry);
      if (result.success) {
        await get().loadServerConnections();
        set({ showAddServerDialog: false });
        return true;
      } else {
        set({ error: result.error || 'Failed to add server connection' });
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add server connection';
      set({ error: message });
      return false;
    }
  },

  // Remove a server connection
  removeServerConnection: async (alias: string) => {
    try {
      const result = await window.electronAPI.removeSSHConfigEntry(alias);
      if (result.success) {
        await get().loadServerConnections();
        return true;
      } else {
        set({ error: result.error || 'Failed to remove server connection' });
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove server connection';
      set({ error: message });
      return false;
    }
  },

  // Connect to server via Terminal
  connectToServer: async (connection: SSHServerConnection) => {
    try {
      const result = await window.electronAPI.openTerminal({
        host: connection.hostName,
        user: connection.user,
        identityFile: connection.identityFilePath,
        port: connection.port,
        alias: connection.alias, // Use alias for simpler "ssh alias" command
      });
      if (result.success) {
        return true;
      } else {
        set({ error: result.error || 'Failed to open terminal' });
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open terminal';
      set({ error: message });
      return false;
    }
  },

  // Forget server (remove from known_hosts)
  forgetServer: async (hostname: string) => {
    try {
      const result = await window.electronAPI.forgetServer(hostname);
      if (result.success) {
        return true;
      } else {
        set({ error: result.error || 'Failed to forget server' });
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to forget server';
      set({ error: message });
      return false;
    }
  },

  // Forget all servers that use a specific key
  forgetServersForKey: async (keyPath: string) => {
    const { serverConnections } = get();
    const keyConnections = serverConnections.filter(
      (conn) => conn.identityFilePath === keyPath
    );

    let allSuccess = true;
    for (const connection of keyConnections) {
      const success = await get().forgetServer(connection.hostName);
      if (!success) {
        allSuccess = false;
      }
    }
    return allSuccess;
  },

  // Load keys currently in SSH agent
  loadAgentKeys: async () => {
    try {
      const result = await window.electronAPI.listAgentKeys();
      if (result.success) {
        set({ agentKeys: result.keys });
      }
    } catch (error) {
      console.error('Error loading agent keys:', error);
    }
  },

  // Check if a specific key is in the agent
  checkKeyInAgent: async (privateKeyPath: string) => {
    try {
      const result = await window.electronAPI.checkKeyInAgent(privateKeyPath);
      if (result.success) {
        const { keysInAgent } = get();
        const newSet = new Set(keysInAgent);
        if (result.isInAgent) {
          newSet.add(privateKeyPath);
        } else {
          newSet.delete(privateKeyPath);
        }
        set({ keysInAgent: newSet });
        return result.isInAgent;
      }
      return false;
    } catch (error) {
      console.error('Error checking key in agent:', error);
      return false;
    }
  },

  // Add key to SSH agent
  addKeyToAgent: async (privateKeyPath: string, passphrase: string) => {
    try {
      const result = await window.electronAPI.addKeyToAgent(privateKeyPath, passphrase);
      if (result.success) {
        // Update the set
        const { keysInAgent } = get();
        const newSet = new Set(keysInAgent);
        newSet.add(privateKeyPath);
        set({ keysInAgent: newSet });
        return true;
      } else {
        set({ error: result.error || 'Failed to add key to agent' });
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add key to agent';
      set({ error: message });
      return false;
    }
  },

  // Remove key from SSH agent
  removeKeyFromAgent: async (privateKeyPath: string) => {
    try {
      const result = await window.electronAPI.removeKeyFromAgent(privateKeyPath);
      if (result.success) {
        // Update the set
        const { keysInAgent } = get();
        const newSet = new Set(keysInAgent);
        newSet.delete(privateKeyPath);
        set({ keysInAgent: newSet });
        return true;
      } else {
        set({ error: result.error || 'Failed to remove key from agent' });
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove key from agent';
      set({ error: message });
      return false;
    }
  },

  // Check if key is in agent (synchronous, uses cached state)
  isKeyInAgent: (privateKeyPath: string) => {
    const { keysInAgent } = get();
    return keysInAgent.has(privateKeyPath);
  },

}));
