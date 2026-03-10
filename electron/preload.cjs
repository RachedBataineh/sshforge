"use strict";
const { contextBridge, ipcRenderer } = require("electron");

const electronAPI = {
  // Key generation
  generateKey: (options) => {
    return ipcRenderer.invoke("key:generate", options);
  },

  // File operations
  getDefaultPath: () => {
    return ipcRenderer.invoke("file:get-default-path");
  },

  selectDirectory: (defaultPath) => {
    return ipcRenderer.invoke("file:select-directory", defaultPath);
  },

  saveKey: (options) => {
    return ipcRenderer.invoke("file:save", options);
  },

  checkFileExists: (filePath) => {
    return ipcRenderer.invoke("file:check-exists", filePath);
  },

  openInFileManager: (filePath) => {
    return ipcRenderer.invoke("file:open-in-manager", filePath);
  },

  // Platform info
  getPlatform: () => {
    return ipcRenderer.invoke("app:get-platform");
  },

  // Key management
  listKeys: (dirPath) => {
    return ipcRenderer.invoke("file:list-keys", dirPath);
  },

  readKey: (filePath) => {
    return ipcRenderer.invoke("file:read-key", filePath);
  },

  deleteKey: (privateKeyPath) => {
    return ipcRenderer.invoke("file:delete-key", privateKeyPath);
  },

  renameKey: (oldPrivateKeyPath, newName) => {
    return ipcRenderer.invoke("file:rename-key", oldPrivateKeyPath, newName);
  },

  // Events
  onKeyGenerated: (callback) => {
    ipcRenderer.on("key:generated", (_event, result) => callback(result));
  },

  onKeyError: (callback) => {
    ipcRenderer.on("key:error", (_event, error) => callback(error));
  },

  onFileSaved: (callback) => {
    ipcRenderer.on("file:saved", (_event, result) => callback(result));
  },

  // Cleanup
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // SSH Config
  readSSHConfig: () => {
    return ipcRenderer.invoke("ssh:read-config");
  },

  addSSHConfigEntry: (entry) => {
    return ipcRenderer.invoke("ssh:add-config-entry", entry);
  },

  removeSSHConfigEntry: (alias) => {
    return ipcRenderer.invoke("ssh:remove-config-entry", alias);
  },

  openTerminal: (options) => {
    return ipcRenderer.invoke("ssh:open-terminal", options);
  },

  forgetServer: (hostname) => {
    return ipcRenderer.invoke("ssh:forget-server", hostname);
  },

  // SSH Agent
  listAgentKeys: () => {
    return ipcRenderer.invoke("ssh-agent:list");
  },

  addKeyToAgent: (privateKeyPath, passphrase) => {
    return ipcRenderer.invoke("ssh-agent:add", privateKeyPath, passphrase);
  },

  removeKeyFromAgent: (privateKeyPath) => {
    return ipcRenderer.invoke("ssh-agent:remove", privateKeyPath);
  },

  checkKeyInAgent: (privateKeyPath) => {
    return ipcRenderer.invoke("ssh-agent:check", privateKeyPath);
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
