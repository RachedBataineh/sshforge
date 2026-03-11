import { ipcMain, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

/**
 * SSH Config Entry interface
 */
export interface SSHConfigEntry {
  host: string;
  hostName: string;
  user: string;
  identityFile: string;
  port?: number;
}

/**
 * Gets the SSH directory path
 */
function getSSHPath(): string {
  const homeDir = app.getPath('home');
  return path.join(homeDir, '.ssh');
}

/**
 * Gets the SSH config file path
 */
function getSSHConfigPath(): string {
  return path.join(getSSHPath(), 'config');
}

/**
 * Expands ~ to home directory in paths.
 * Handles both Unix (~/) and Windows (~\) tilde prefixes.
 */
function expandPath(filePath: string): string {
  const trimmed = filePath.trim();
  // Match ~/ or ~\ at the start
  if (trimmed.startsWith('~/') || trimmed.startsWith('~\\')) {
    return path.join(app.getPath('home'), trimmed.slice(2));
  }
  return trimmed;
}

/**
 * Converts absolute path to ~/... shorthand for SSH config.
 * Always uses forward slash separator so the config is portable and
 * round-trips correctly through expandPath on all platforms.
 */
function shortenPath(filePath: string): string {
  const homeDir = app.getPath('home');
  // Normalize both to forward slashes for comparison
  const normalizedFile = filePath.replace(/\\/g, '/');
  const normalizedHome = homeDir.replace(/\\/g, '/');
  if (normalizedFile.toLowerCase().startsWith(normalizedHome.toLowerCase())) {
    const relative = normalizedFile.slice(normalizedHome.length);
    // Ensure exactly one leading slash
    return '~' + (relative.startsWith('/') ? relative : '/' + relative);
  }
  return filePath;
}

/**
 * Normalizes a file path for reliable comparison across platforms.
 * - Converts \ to /
 * - Lowercases the whole string (Windows paths are case-insensitive)
 */
function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').toLowerCase();
}

/**
 * Parses SSH config file into entries array
 */
function parseSSHConfig(configPath: string): SSHConfigEntry[] {
  const entries: SSHConfigEntry[] = [];

  if (!fs.existsSync(configPath)) {
    console.log('[SSH Config] Config file does not exist:', configPath);
    return entries;
  }

  const content = fs.readFileSync(configPath, 'utf8');
  console.log('[SSH Config] File content:\n', content);

  const lines = content.split('\n');

  let currentEntry: Partial<SSHConfigEntry> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip comments and empty lines
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    // Parse Host directive (case-insensitive)
    const lowerTrimmed = trimmedLine.toLowerCase();
    if (lowerTrimmed.startsWith('host ') || lowerTrimmed.startsWith('host\t')) {
      // Save previous entry if exists and has required fields
      if (currentEntry && currentEntry.host && currentEntry.hostName && currentEntry.identityFile) {
        console.log('[SSH Config] Saving entry:', currentEntry);
        entries.push({
          host: currentEntry.host,
          hostName: currentEntry.hostName,
          user: currentEntry.user || 'root',
          identityFile: currentEntry.identityFile,
          port: currentEntry.port,
        });
      } else if (currentEntry) {
        console.log('[SSH Config] Skipping incomplete entry:', currentEntry);
      }

      // Start new entry - extract host alias
      const hostValue = trimmedLine.replace(/^host\s+/i, '').trim();
      currentEntry = {
        host: hostValue,
      };
      console.log('[SSH Config] Found Host:', hostValue);
      continue;
    }

    // Parse other directives
    if (currentEntry) {
      // Use regex to extract key-value pairs (handles spaces and tabs)
      const keyValueMatch = trimmedLine.match(/^(\w+)\s+(.+)$/);
      if (keyValueMatch) {
        const [, key, value] = keyValueMatch;
        const lowerKey = key.toLowerCase();

        switch (lowerKey) {
          case 'hostname':
            currentEntry.hostName = value.trim();
            console.log('[SSH Config]   HostName:', value.trim());
            break;
          case 'user':
            currentEntry.user = value.trim();
            console.log('[SSH Config]   User:', value.trim());
            break;
          case 'identityfile':
            currentEntry.identityFile = expandPath(value.trim());
            console.log('[SSH Config]   IdentityFile:', currentEntry.identityFile);
            break;
          case 'port':
            const portNum = parseInt(value.trim(), 10);
            if (!isNaN(portNum)) {
              currentEntry.port = portNum;
              console.log('[SSH Config]   Port:', portNum);
            }
            break;
        }
      }
    }
  }

  // Save last entry
  if (currentEntry && currentEntry.host && currentEntry.hostName && currentEntry.identityFile) {
    console.log('[SSH Config] Saving last entry:', currentEntry);
    entries.push({
      host: currentEntry.host,
      hostName: currentEntry.hostName,
      user: currentEntry.user || 'root',
      identityFile: currentEntry.identityFile,
      port: currentEntry.port,
    });
  } else if (currentEntry) {
    console.log('[SSH Config] Skipping incomplete last entry:', currentEntry);
  }

  console.log('[SSH Config] Total entries found:', entries.length);
  return entries;
}

/**
 * Adds a new entry to SSH config file
 */
function addSSHConfigEntry(configPath: string, entry: SSHConfigEntry): { success: boolean; error?: string } {
  try {
    // Ensure .ssh directory exists
    const sshDir = path.dirname(configPath);
    if (!fs.existsSync(sshDir)) {
      fs.mkdirSync(sshDir, { mode: 0o700, recursive: true });
    }

    // Build config entry text
    const lines: string[] = [];

    // Add a comment header
    lines.push('');
    lines.push(`# Added by SSHForge - ${entry.host}`);
    lines.push(`Host ${entry.host}`);
    lines.push(`    HostName ${entry.hostName}`);
    lines.push(`    User ${entry.user}`);
    lines.push(`    IdentityFile ${shortenPath(entry.identityFile)}`);
    if (entry.port && entry.port !== 22) {
      lines.push(`    Port ${entry.port}`);
    }

    const entryText = lines.join('\n');

    // Check if file exists and append, otherwise create
    if (fs.existsSync(configPath)) {
      const existingContent = fs.readFileSync(configPath, 'utf8');

      // Check if host already exists
      const hostPattern = new RegExp(`^host\\s+${escapeRegex(entry.host)}\\s*$`, 'im');
      if (hostPattern.test(existingContent)) {
        return { success: false, error: 'A host with this alias already exists in SSH config' };
      }

      // Append to existing file
      fs.appendFileSync(configPath, entryText, { encoding: 'utf8' });
    } else {
      // Create new file
      fs.writeFileSync(configPath, entryText.trim() + '\n', { mode: 0o644, encoding: 'utf8' });
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Removes an entry from SSH config file by host alias
 */
function removeSSHConfigEntry(configPath: string, hostAlias: string): { success: boolean; error?: string } {
  try {
    if (!fs.existsSync(configPath)) {
      return { success: false, error: 'SSH config file does not exist' };
    }

    const content = fs.readFileSync(configPath, 'utf8');
    const lines = content.split('\n');
    const newLines: string[] = [];
    let skipUntilNextHost = false;
    let found = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check for Host directive
      if (trimmedLine.toLowerCase().startsWith('host ')) {
        const hostMatch = trimmedLine.match(/^host\s+(.+)$/i);
        if (hostMatch && hostMatch[1].trim() === hostAlias) {
          skipUntilNextHost = true;
          found = true;
          continue;
        } else {
          skipUntilNextHost = false;
        }
      }

      if (!skipUntilNextHost) {
        newLines.push(line);
      }
    }

    if (!found) {
      return { success: false, error: 'Host not found in SSH config' };
    }

    // Write updated config
    fs.writeFileSync(configPath, newLines.join('\n'), { encoding: 'utf8' });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Escapes special regex characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Opens a terminal with an SSH command — cross-platform implementation.
 *
 * macOS  : AppleScript → Terminal.app
 * Windows: Windows Terminal (wt) → PowerShell → Command Prompt (fallback chain)
 * Linux  : x-terminal-emulator → gnome-terminal → xterm
 */
function openTerminalWithSSH(options: { host: string; user?: string; identityFile?: string; port?: number; alias?: string }): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    try {
      const { alias, host } = options;

      // Build the SSH command string
      let sshCmd: string;
      if (alias) {
        sshCmd = `ssh ${alias}`;
      } else {
        const { user = 'root', identityFile, port } = options;
        sshCmd = 'ssh';
        if (identityFile) {
          sshCmd += ` -i "${shortenPath(identityFile)}"`;
        }
        if (port && port !== 22) {
          sshCmd += ` -p ${port}`;
        }
        sshCmd += ` ${user}@${host}`;
      }

      console.log('[SSH Config] Opening terminal with command:', sshCmd);

      const platform = process.platform;

      if (platform === 'darwin') {
        // ── macOS ─────────────────────────────────────────────────────────────
        // Use multiple -e flags for osascript (required for proper parsing)
        const escaped = sshCmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        console.log('[SSH Config] macOS SSH command:', sshCmd);

        const osaProcess = spawn('osascript', [
          '-e', 'tell application "Terminal" to activate',
          '-e', `tell application "Terminal" to do script "${escaped}"`
        ], {
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe']
        });

        let errorOutput = '';
        osaProcess.stderr?.on('data', (data) => {
          errorOutput += data.toString();
          console.error('[SSH Config] osascript stderr:', data.toString());
        });

        osaProcess.on('error', (err) => {
          console.error('[SSH Config] Failed to spawn osascript:', err);
          resolve({ success: false, error: `Failed to open terminal: ${err.message}` });
        });

        osaProcess.on('close', (code) => {
          if (code === 0) {
            console.log('[SSH Config] Terminal opened successfully');
            resolve({ success: true });
          } else {
            console.error('[SSH Config] osascript exited with code:', code, errorOutput);
            resolve({ success: false, error: `Failed to open terminal: ${errorOutput || `Exit code ${code}`}` });
          }
        });

        osaProcess.unref();

      } else if (platform === 'win32') {
        // ── Windows ───────────────────────────────────────────────────────────
        // Try Windows Terminal first, then CMD with PowerShell.
        // Each opens a NEW visible window and keeps it open for user input.

        let resolved = false;
        console.log('[SSH Config] Windows SSH command:', sshCmd);

        const tryCMD = () => {
          // CMD opens a new window with 'start' and keeps it open with '/k'
          console.log('[SSH Config] Falling back to CMD...');
          const cmdProcess = spawn(
            'cmd.exe',
            ['/c', 'start', 'cmd.exe', '/k', sshCmd],
            { detached: true, stdio: 'ignore', shell: false, windowsHide: false }
          );
          cmdProcess.on('error', (err) => {
            console.error('[SSH Config] CMD failed:', err.message);
            if (!resolved) {
              resolved = true;
              resolve({ success: false, error: `Could not open terminal: ${err.message}` });
            }
          });
          cmdProcess.unref();
          if (!resolved) {
            resolved = true;
            console.log('[SSH Config] Terminal opened with CMD');
            resolve({ success: true });
          }
        };

        const tryPowerShell = () => {
          // PowerShell in a new window using start command
          console.log('[SSH Config] Falling back to PowerShell...');
          const psProcess = spawn(
            'cmd.exe',
            ['/c', 'start', 'powershell.exe', '-NoExit', '-Command', sshCmd],
            { detached: true, stdio: 'ignore', shell: false, windowsHide: false }
          );
          psProcess.on('error', (err) => {
            console.log('[SSH Config] PowerShell not available:', err.message);
            tryCMD();
          });
          psProcess.unref();
          if (!resolved) {
            resolved = true;
            console.log('[SSH Config] Terminal opened with PowerShell');
            resolve({ success: true });
          }
        };

        // Try Windows Terminal first
        console.log('[SSH Config] Trying Windows Terminal...');
        const wtProcess = spawn(
          'wt.exe',
          ['-p', 'PowerShell', 'powershell.exe', '-NoExit', '-Command', sshCmd],
          { detached: true, stdio: 'ignore', shell: false, windowsHide: false }
        );
        wtProcess.on('error', (err) => {
          console.log('[SSH Config] Windows Terminal not available:', err.message);
          tryPowerShell();
        });
        wtProcess.unref();
        if (!resolved) {
          resolved = true;
          console.log('[SSH Config] Terminal opened with Windows Terminal');
          resolve({ success: true });
        }

      } else {
        // ── Linux ─────────────────────────────────────────────────────────────
        // Properly escape the SSH command for shell execution
        const escapedCmd = sshCmd.replace(/'/g, "'\\''");
        const bashCommand = `${sshCmd}; exec bash`; // Keep terminal open after SSH exits

        // Terminal emulators with their specific argument formats
        const linuxTerminals = [
          { cmd: 'x-terminal-emulator', args: ['-e', 'bash', '-c', bashCommand] },
          { cmd: 'gnome-terminal',      args: ['--', 'bash', '-c', bashCommand] },
          { cmd: 'xfce4-terminal',      args: ['-e', 'bash', '-c', bashCommand] },
          { cmd: 'konsole',             args: ['-e', 'bash', '-c', bashCommand] },
          { cmd: 'xterm',               args: ['-e', 'bash', '-c', bashCommand] },
        ];

        let resolved = false;
        console.log('[SSH Config] Linux SSH command:', sshCmd);

        const tryNext = (index: number, lastError?: string) => {
          if (index >= linuxTerminals.length) {
            if (!resolved) {
              resolved = true;
              console.error('[SSH Config] No terminal emulator found');
              resolve({
                success: false,
                error: `No supported terminal emulator found. Tried: ${linuxTerminals.map(t => t.cmd).join(', ')}. Install gnome-terminal or xterm.`
              });
            }
            return;
          }

          const { cmd, args } = linuxTerminals[index];
          console.log(`[SSH Config] Trying ${cmd}...`);

          const proc = spawn(cmd, args, {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe']
          });

          let errorOutput = '';

          proc.stderr?.on('data', (data) => {
            errorOutput += data.toString();
          });

          proc.on('error', (err) => {
            console.log(`[SSH Config] ${cmd} not available:`, err.message);
            tryNext(index + 1, err.message);
          });

          proc.on('close', (code) => {
            if (code === 0 || code === null) {
              // code === null means process detached successfully
              if (!resolved) {
                resolved = true;
                console.log(`[SSH Config] Terminal opened with ${cmd}`);
                resolve({ success: true });
              }
            } else {
              console.log(`[SSH Config] ${cmd} exited with code ${code}:`, errorOutput);
              tryNext(index + 1, errorOutput || `Exit code ${code}`);
            }
          });

          // Give the process a moment to start before detaching
          setTimeout(() => {
            if (!resolved) {
              proc.unref();
            }
          }, 100);
        };

        tryNext(0);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      resolve({ success: false, error: message });
    }
  });
}

/**
 * Removes a host from known_hosts file
 */
function forgetServer(hostname: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    // ssh-keygen -R removes the host from known_hosts.
    // Works on macOS, Linux and Windows 10+ (built-in OpenSSH).
    const proc = spawn('ssh-keygen', ['-R', hostname], { stdio: 'pipe' });

    proc.stderr?.on('data', () => { /* consume stderr */ });

    proc.on('close', () => {
      // ssh-keygen -R exits 0 whether or not the host was present — always succeed.
      resolve({ success: true });
    });

    proc.on('error', (err) => {
      console.warn('[SSH Config] ssh-keygen not available:', err.message);
      // Non-fatal: app still works, just can't clear known_hosts automatically.
      resolve({
        success: false,
        error: 'ssh-keygen not found. On Windows, install OpenSSH Client via Settings → Apps → Optional Features.',
      });
    });
  });
}

/**
 * Register IPC handlers for SSH config operations
 */
export function registerSSHConfigHandlers(): void {
  console.log('[SSH Config] Registering IPC handlers');

  // Read SSH config file
  ipcMain.handle('ssh:read-config', async () => {
    console.log('[SSH Config] read-config called');
    try {
      const configPath = getSSHConfigPath();
      console.log('[SSH Config] Config path:', configPath);
      const entries = parseSSHConfig(configPath);
      console.log('[SSH Config] Returning entries:', entries);
      return { success: true, entries };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SSH Config] Error:', message);
      return { success: false, entries: [], error: message };
    }
  });

  // Add new SSH config entry
  ipcMain.handle('ssh:add-config-entry', async (_event, entry: SSHConfigEntry) => {
    const configPath = getSSHConfigPath();
    return addSSHConfigEntry(configPath, entry);
  });

  // Remove SSH config entry
  ipcMain.handle('ssh:remove-config-entry', async (_event, alias: string) => {
    const configPath = getSSHConfigPath();
    return removeSSHConfigEntry(configPath, alias);
  });

  // Open Terminal with SSH command
  ipcMain.handle('ssh:open-terminal', async (_event, options: { host: string; user?: string; identityFile?: string; port?: number; alias?: string }) => {
    return openTerminalWithSSH(options);
  });

  // Forget server (remove from known_hosts)
  ipcMain.handle('ssh:forget-server', async (_event, hostname: string) => {
    return forgetServer(hostname);
  });
}
