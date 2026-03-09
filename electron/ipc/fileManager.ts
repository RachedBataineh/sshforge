import { ipcMain, dialog, app, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import type { SaveOptions, FileSaveResult } from '../../src/types';
import { FILE_PERMISSIONS } from '../../src/lib/constants';

/**
 * Gets the default SSH directory path based on platform
 */
function getDefaultSSHPath(): string {
  const homeDir = app.getPath('home');
  return path.join(homeDir, '.ssh');
}

/**
 * Ensures the SSH directory exists with correct permissions
 */
function ensureSSHDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { mode: FILE_PERMISSIONS.DIRECTORY, recursive: true });
  }
}

/**
 * Checks if a file exists at the given path
 */
function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Saves key pair to disk
 */
async function saveKeyPair(options: SaveOptions): Promise<FileSaveResult> {
  const { privateKey, publicKey, keyName, savePath } = options;

  try {
    // Ensure directory exists
    ensureSSHDirectory(savePath);

    const privateKeyPath = path.join(savePath, keyName);
    const publicKeyPath = path.join(savePath, `${keyName}.pub`);

    // Check if files already exist
    if (fileExists(privateKeyPath) || fileExists(publicKeyPath)) {
      return {
        success: false,
        privateKeyPath,
        publicKeyPath,
        error: 'FILES_EXIST',
      };
    }

    // Write private key
    fs.writeFileSync(privateKeyPath, privateKey, {
      mode: FILE_PERMISSIONS.PRIVATE_KEY,
      encoding: 'utf8',
    });

    // Write public key
    fs.writeFileSync(publicKeyPath, publicKey, {
      mode: FILE_PERMISSIONS.PUBLIC_KEY,
      encoding: 'utf8',
    });

    return {
      success: true,
      privateKeyPath,
      publicKeyPath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      privateKeyPath: '',
      publicKeyPath: '',
      error: message,
    };
  }
}

/**
 * Opens directory selection dialog
 */
async function selectDirectory(defaultPath?: string): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    defaultPath: defaultPath || getDefaultSSHPath(),
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Select Directory',
    title: 'Select SSH Key Save Location',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}

/**
 * Opens the containing folder in file manager
 */
async function openInFileManager(filePath: string): Promise<void> {
  await shell.openPath(path.dirname(filePath));
}

/**
 * Register IPC handlers for file operations
 */
export function registerFileManagerHandlers(): void {
  // Get default SSH path
  ipcMain.handle('file:get-default-path', () => {
    return getDefaultSSHPath();
  });

  // Select directory
  ipcMain.handle('file:select-directory', async (_event, defaultPath?: string) => {
    return await selectDirectory(defaultPath);
  });

  // Save key pair
  ipcMain.handle('file:save', async (_event, options: SaveOptions) => {
    return await saveKeyPair(options);
  });

  // Check if file exists
  ipcMain.handle('file:check-exists', (_event, filePath: string) => {
    return fileExists(filePath);
  });

  // Open in file manager
  ipcMain.handle('file:open-in-manager', async (_event, filePath: string) => {
    await openInFileManager(filePath);
    return true;
  });

  // Get platform
  ipcMain.handle('app:get-platform', () => {
    return process.platform;
  });
}
