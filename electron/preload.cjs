const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI = {
  // Key generation
  generateKey: (options) => {
    return ipcRenderer.invoke('key:generate', options);
  },

  // File operations
  getDefaultPath: () => {
    return ipcRenderer.invoke('file:get-default-path');
  },

  selectDirectory: (defaultPath) => {
    return ipcRenderer.invoke('file:select-directory', defaultPath);
  },

  saveKey: (options) => {
    return ipcRenderer.invoke('file:save', options);
  },

  checkFileExists: (filePath) => {
    return ipcRenderer.invoke('file:check-exists', filePath);
  },

  openInFileManager: (filePath) => {
    return ipcRenderer.invoke('file:open-in-manager', filePath);
  },

  // Platform info
  getPlatform: () => {
    return ipcRenderer.invoke('app:get-platform');
  },

  // Events
  onKeyGenerated: (callback) => {
    ipcRenderer.on('key:generated', (_event, result) => callback(result));
  },

  onKeyError: (callback) => {
    ipcRenderer.on('key:error', (_event, error) => callback(error));
  },

  onFileSaved: (callback) => {
    ipcRenderer.on('file:saved', (_event, result) => callback(result));
  },

  // Cleanup
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

// Expose to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
