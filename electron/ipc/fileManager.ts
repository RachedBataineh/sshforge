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
 * Gets file stats including creation and modification dates
 */
function getFileStats(filePath: string): { created: Date; modified: Date } | null {
  try {
    const stats = fs.statSync(filePath);
    return {
      created: stats.birthtime,
      modified: stats.mtime,
    };
  } catch {
    return null;
  }
}

/**
 * SSH Key info interface
 */
interface SSHKeyInfo {
  name: string;
  privateKeyPath: string;
  publicKeyPath: string;
  hasPublicKey: boolean;
  hasPrivateKey: boolean;
  algorithm: string;
  created: Date | null;
  modified: Date | null;
  fingerprint?: string;
  comment?: string;
}

/**
 * Detects the algorithm type from a public key
 */
function detectAlgorithm(publicKeyContent: string): string {
  if (publicKeyContent.startsWith('ssh-ed25519')) return 'ed25519';
  if (publicKeyContent.startsWith('ssh-rsa')) return 'rsa';
  if (publicKeyContent.startsWith('ecdsa-sha2-nistp256')) return 'ecdsa-p256';
  if (publicKeyContent.startsWith('ecdsa-sha2-nistp384')) return 'ecdsa-p384';
  if (publicKeyContent.startsWith('ecdsa-sha2-nistp521')) return 'ecdsa-p521';
  if (publicKeyContent.startsWith('sk-ssh-ed25519')) return 'sk-ed25519';
  if (publicKeyContent.startsWith('sk-ecdsa-sha2-nistp256')) return 'sk-ecdsa';
  return 'unknown';
}

/**
 * Extracts fingerprint and comment from public key
 */
function parsePublicKey(publicKeyContent: string): { fingerprint?: string; comment?: string } {
  const parts = publicKeyContent.trim().split(' ');
  const result: { fingerprint?: string; comment?: string } = {};

  // Extract comment (everything after the key)
  if (parts.length >= 3) {
    result.comment = parts.slice(2).join(' ');
  }

  // We can't calculate fingerprint without the actual key bytes
  // The fingerprint shown by ssh-keygen is calculated differently
  return result;
}

/**
 * Lists all SSH keys in a directory
 */
function listSSHKeys(dirPath: string): SSHKeyInfo[] {
  const keys: SSHKeyInfo[] = [];

  if (!fs.existsSync(dirPath)) {
    return keys;
  }

  try {
    const files = fs.readdirSync(dirPath);

    // Find all private key files (not ending in .pub)
    const privateKeys = files.filter(file => {
      const fullPath = path.join(dirPath, file);
      const isFile = fs.statSync(fullPath).isFile();
      const isPublicKey = file.endsWith('.pub');
      const isHiddenFile = file.startsWith('.');
      const isKnownHosts = file === 'known_hosts' || file === 'known_hosts.old';
      const isConfig = file === 'config';
      const isAuthorizedKeys = file === 'authorized_keys' || file === 'authorized_keys2';
      return isFile && !isPublicKey && !isHiddenFile && !isKnownHosts && !isConfig && !isAuthorizedKeys;
    });

    for (const keyFile of privateKeys) {
      const privateKeyPath = path.join(dirPath, keyFile);
      const publicKeyPath = path.join(dirPath, `${keyFile}.pub`);
      const hasPublicKey = fs.existsSync(publicKeyPath);
      const stats = getFileStats(privateKeyPath);

      let algorithm = 'unknown';
      let comment: string | undefined;
      let fingerprint: string | undefined;

      if (hasPublicKey) {
        try {
          const publicKeyContent = fs.readFileSync(publicKeyPath, 'utf8');
          algorithm = detectAlgorithm(publicKeyContent);
          const parsed = parsePublicKey(publicKeyContent);
          comment = parsed.comment;
          fingerprint = parsed.fingerprint;
        } catch {
          // Ignore read errors
        }
      }

      keys.push({
        name: keyFile,
        privateKeyPath,
        publicKeyPath,
        hasPublicKey,
        hasPrivateKey: true,
        algorithm,
        created: stats?.created || null,
        modified: stats?.modified || null,
        fingerprint,
        comment,
      });
    }

    // Sort by modification date (newest first)
    keys.sort((a, b) => {
      if (!a.modified && !b.modified) return 0;
      if (!a.modified) return 1;
      if (!b.modified) return -1;
      return b.modified.getTime() - a.modified.getTime();
    });
  } catch (error) {
    console.error('Error listing SSH keys:', error);
  }

  return keys;
}

/**
 * Reads a key file content
 */
function readKeyFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Deletes a key pair
 */
function deleteKeyPair(privateKeyPath: string): { success: boolean; error?: string } {
  try {
    const publicKeyPath = `${privateKeyPath}.pub`;

    if (fs.existsSync(privateKeyPath)) {
      fs.unlinkSync(privateKeyPath);
    }

    if (fs.existsSync(publicKeyPath)) {
      fs.unlinkSync(publicKeyPath);
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Renames a key pair
 */
function renameKeyPair(oldPrivateKeyPath: string, newName: string): { success: boolean; newPrivateKeyPath?: string; newPublicKeyPath?: string; error?: string } {
  try {
    const dir = path.dirname(oldPrivateKeyPath);
    const oldPublicKeyPath = `${oldPrivateKeyPath}.pub`;

    const newPrivateKeyPath = path.join(dir, newName);
    const newPublicKeyPath = path.join(dir, `${newName}.pub`);

    // Check if new name already exists
    if (fs.existsSync(newPrivateKeyPath) || fs.existsSync(newPublicKeyPath)) {
      return { success: false, error: 'A key with this name already exists' };
    }

    if (fs.existsSync(oldPrivateKeyPath)) {
      fs.renameSync(oldPrivateKeyPath, newPrivateKeyPath);
    }

    if (fs.existsSync(oldPublicKeyPath)) {
      fs.renameSync(oldPublicKeyPath, newPublicKeyPath);
    }

    return {
      success: true,
      newPrivateKeyPath,
      newPublicKeyPath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Saves key pair to disk
 */
async function saveKeyPair(options: SaveOptions & { overwrite?: boolean }): Promise<FileSaveResult> {
  const { privateKey, publicKey, keyName, savePath, overwrite } = options;

  try {
    // Ensure directory exists
    ensureSSHDirectory(savePath);

    const privateKeyPath = path.join(savePath, keyName);
    const publicKeyPath = path.join(savePath, `${keyName}.pub`);

    // Check if files already exist (unless overwrite is true)
    if (!overwrite && (fileExists(privateKeyPath) || fileExists(publicKeyPath))) {
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
 * If filePath is a directory, opens it directly
 * If filePath is a file, opens its parent directory
 */
async function openInFileManager(filePath: string): Promise<void> {
  // Check if it's a directory or file
  try {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      await shell.openPath(filePath);
    } else {
      await shell.openPath(path.dirname(filePath));
    }
  } catch {
    // If we can't stat the path, just try to open the parent
    await shell.openPath(path.dirname(filePath));
  }
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

  // List SSH keys
  ipcMain.handle('file:list-keys', (_event, dirPath?: string) => {
    return listSSHKeys(dirPath || getDefaultSSHPath());
  });

  // Read key file
  ipcMain.handle('file:read-key', (_event, filePath: string) => {
    return readKeyFile(filePath);
  });

  // Delete key pair
  ipcMain.handle('file:delete-key', (_event, privateKeyPath: string) => {
    return deleteKeyPair(privateKeyPath);
  });

  // Rename key pair
  ipcMain.handle('file:rename-key', (_event, oldPrivateKeyPath: string, newName: string) => {
    return renameKeyPair(oldPrivateKeyPath, newName);
  });
}
