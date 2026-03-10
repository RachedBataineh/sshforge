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
 * Expands ~ to home directory in paths
 */
function expandPath(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(app.getPath('home'), filePath.slice(2));
  }
  return filePath;
}

/**
 * Converts absolute path to ~ shorthand for SSH config
 */
function shortenPath(filePath: string): string {
  const homeDir = app.getPath('home');
  if (filePath.startsWith(homeDir)) {
    return '~' + filePath.slice(homeDir.length);
  }
  return filePath;
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
 * Opens Terminal.app with an SSH command using AppleScript
 */
function openTerminalWithSSH(options: { host: string; user?: string; identityFile?: string; port?: number; alias?: string }): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    try {
      const { alias, host } = options;

      // If we have an alias (from SSH config), just use "ssh alias"
      // Otherwise fall back to full command with options
      let sshCmd: string;
      if (alias) {
        // Use the alias - SSH will read the config automatically
        sshCmd = `ssh ${alias}`;
      } else {
        // Fall back to full command (for manual connections without config)
        const { user = 'root', identityFile, port } = options;
        sshCmd = 'ssh';
        if (identityFile) {
          sshCmd += ` -i ${shortenPath(identityFile)}`;
        }
        if (port && port !== 22) {
          sshCmd += ` -p ${port}`;
        }
        sshCmd += ` ${user}@${host}`;
      }

      console.log('[SSH Config] Opening terminal with command:', sshCmd);

      // AppleScript to open Terminal and run command
      const script = `
        tell application "Terminal"
          activate
          do script "${sshCmd.replace(/"/g, '\\"')}"
        end tell
      `;

      spawn('osascript', ['-e', script], {
        detached: true,
        stdio: 'ignore',
      }).unref();

      resolve({ success: true });
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
    try {
      // Use ssh-keygen -R to remove from known_hosts
      const process = spawn('ssh-keygen', ['-R', hostname], {
        stdio: 'pipe',
      });

      let stderr = '';
      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          // ssh-keygen -R returns 0 even if host wasn't found, but let's handle errors
          resolve({ success: true }); // Still consider it success
        }
      });

      process.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      resolve({ success: false, error: message });
    }
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
