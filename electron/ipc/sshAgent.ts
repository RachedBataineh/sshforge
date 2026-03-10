import { ipcMain } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * SSH Agent loaded key info
 */
export interface SSHAgentKey {
  publicKeyPath: string;
  fingerprint: string;
  type: string;
  comment: string;
}

/**
 * Lists all keys currently loaded in ssh-agent
 */
function listAgentKeys(): Promise<{ success: boolean; keys: SSHAgentKey[]; error?: string }> {
  return new Promise((resolve) => {
    try {
      const proc = spawn('ssh-add', ['-l'], { stdio: ['pipe', 'pipe', 'pipe'] });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          // No keys loaded or agent not running
          if (stderr.includes('The agent has no identities') || stderr.includes('Could not open a connection')) {
            resolve({ success: true, keys: [] });
          } else {
            resolve({ success: false, keys: [], error: stderr || 'Failed to list keys' });
          }
          return;
        }

        // Parse output like:
        // 256 SHA256:xxx... comment (ED25519)
        // 2048 SHA256:yyy... /Users/user/.ssh/id_rsa (RSA)
        const keys: SSHAgentKey[] = [];
        const lines = stdout.trim().split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          // Format: bits fingerprint comment (type)
          const match = line.match(/^(\d+)\s+(\S+)\s+(.+?)\s+\((\w+)\)$/);
          if (match) {
            const [, , fingerprint, comment, type] = match;

            // Try to find the public key path from comment
            let publicKeyPath = '';
            if (comment.includes('/.ssh/')) {
              // Comment is a path, convert to public key path
              if (comment.endsWith('.pub')) {
                publicKeyPath = comment;
              } else {
                publicKeyPath = comment + '.pub';
              }
            }

            keys.push({
              publicKeyPath,
              fingerprint,
              type,
              comment,
            });
          }
        }

        resolve({ success: true, keys });
      });

      proc.on('error', (err) => {
        resolve({ success: false, keys: [], error: err.message });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      resolve({ success: false, keys: [], error: message });
    }
  });
}

/**
 * Adds a key to ssh-agent with passphrase
 */
function addKeyToAgent(privateKeyPath: string, passphrase: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    try {
      // Check if key file exists
      if (!fs.existsSync(privateKeyPath)) {
        resolve({ success: false, error: 'Private key file not found' });
        return;
      }

      const proc = spawn('ssh-add', [privateKeyPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, DISPLAY: '', SSH_ASKPASS: '' }
      });

      let stderr = '';

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Send passphrase to stdin
      proc.stdin?.write(passphrase + '\n');
      proc.stdin?.end();

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          // Common errors
          if (stderr.includes('incorrect passphrase') || stderr.includes('bad passphrase')) {
            resolve({ success: false, error: 'Incorrect passphrase' });
          } else if (stderr.includes('Could not open a connection')) {
            resolve({ success: false, error: 'SSH agent is not running' });
          } else {
            resolve({ success: false, error: stderr || 'Failed to add key' });
          }
        }
      });

      proc.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      resolve({ success: false, error: message });
    }
  });
}

/**
 * Removes a key from ssh-agent
 */
function removeKeyFromAgent(privateKeyPath: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    try {
      const proc = spawn('ssh-add', ['-d', privateKeyPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stderr = '';

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: stderr || 'Failed to remove key' });
        }
      });

      proc.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      resolve({ success: false, error: message });
    }
  });
}

/**
 * Check if a specific key is loaded in ssh-agent by comparing fingerprints
 */
async function isKeyInAgent(privateKeyPath: string): Promise<boolean> {
  try {
    // Get fingerprint of the key file
    const pubKeyPath = privateKeyPath + '.pub';

    if (!fs.existsSync(pubKeyPath)) {
      return false;
    }

    // Get key fingerprint
    const fingerPrintProc = spawn('ssh-keygen', ['-lf', pubKeyPath]);
    let fpStdout = '';
    let fpStderr = '';

    fingerPrintProc.stdout?.on('data', (data) => {
      fpStdout += data.toString();
    });
    fingerPrintProc.stderr?.on('data', (data) => {
      fpStderr += data.toString();
    });

    await new Promise<void>((resolve) => {
      fingerPrintProc.on('close', () => resolve());
    });

    if (!fpStdout.trim()) {
      return false;
    }

    // Extract fingerprint from output: "256 SHA256:xxx... filename (ED25519)"
    const fpMatch = fpStdout.match(/(\d+)\s+(\S+)/);
    if (!fpMatch) {
      return false;
    }
    const keyFingerprint = fpMatch[2];

    // Get loaded keys
    const result = await listAgentKeys();
    if (!result.success) {
      return false;
    }

    // Check if our fingerprint is in the list
    return result.keys.some(k => k.fingerprint === keyFingerprint);
  } catch {
    return false;
  }
}

/**
 * Register IPC handlers for SSH agent operations
 */
export function registerSSHAgentHandlers(): void {
  console.log('[SSH Agent] Registering IPC handlers');

  // List keys in agent
  ipcMain.handle('ssh-agent:list', async () => {
    return listAgentKeys();
  });

  // Add key to agent
  ipcMain.handle('ssh-agent:add', async (_event, privateKeyPath: string, passphrase: string) => {
    return addKeyToAgent(privateKeyPath, passphrase);
  });

  // Remove key from agent
  ipcMain.handle('ssh-agent:remove', async (_event, privateKeyPath: string) => {
    return removeKeyFromAgent(privateKeyPath);
  });

  // Check if specific key is in agent
  ipcMain.handle('ssh-agent:check', async (_event, privateKeyPath: string) => {
    const isInAgent = await isKeyInAgent(privateKeyPath);
    return { success: true, isInAgent };
  });
}
