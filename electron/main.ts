import { app, BrowserWindow, shell, nativeTheme, Menu, MenuItem, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerKeyGeneratorHandlers } from './ipc/keyGenerator';
import { registerFileManagerHandlers } from './ipc/fileManager';
import { registerSSHConfigHandlers } from './ipc/sshConfig';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Disable hardware acceleration for better compatibility
app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;

// Check if running in development
const isDev = !app.isPackaged;

// Create production menu for macOS (without DevTools)
function createMacProductionMenu(): Menu {
  const template: Electron.MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    {
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    },
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'delete' as const },
        { type: 'separator' as const },
        { role: 'selectAll' as const },
      ],
    },
    // View menu (without DevTools)
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        { type: 'separator' as const },
        { role: 'front' as const },
        { type: 'separator' as const },
        { role: 'window' as const },
      ],
    },
    // Help menu
    {
      role: 'help' as const,
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://github.com/sshforge');
          },
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

function createWindow(): void {
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 500,
    show: false,
    // On macOS: hiddenInset keeps native traffic lights visible within the app chrome.
    // On Windows/Linux: 'hidden' removes the native title bar overlay entirely,
    // so only our custom React title bar renders (no double-bar stacking).
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac && { trafficLightPosition: { x: 15, y: 15 } }),
    // On Windows/Linux: restore the native min/max/close buttons via overlay.
    // height=40 matches our React custom bar (h-10). Colors blend with the app background.
    ...(!isMac && {
      titleBarOverlay: {
        color: nativeTheme.shouldUseDarkColors ? '#0a0a0a' : '#ffffff',
        symbolColor: nativeTheme.shouldUseDarkColors ? '#ffffff' : '#000000',
        height: 40,
      },
    }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      devTools: isDev,
    },
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0a0a0a' : '#ffffff',
  });

  // Load the app
  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    console.log('Loading dev server:', devServerUrl);
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    // Set platform-appropriate menu in production
    if (process.platform === 'darwin') {
      Menu.setApplicationMenu(createMacProductionMenu());
    } else {
      // On Windows/Linux, hide the menu bar entirely — window controls
      // (minimize/maximize/close) are handled natively by the OS frame
      // and our custom React title bar only contains the theme toggle.
      Menu.setApplicationMenu(null);
    }
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register IPC handlers
function registerHandlers(): void {
  registerKeyGeneratorHandlers();
  registerFileManagerHandlers();
  registerSSHConfigHandlers();

  // Allow the renderer to push titleBarOverlay colors when the user switches theme.
  // Only meaningful on Windows/Linux where titleBarOverlay is active.
  ipcMain.handle(
    'window:set-title-bar-overlay',
    (_event, colors: { color: string; symbolColor: string }) => {
      if (mainWindow && process.platform !== 'darwin') {
        mainWindow.setTitleBarOverlay({ ...colors, height: 40 });
      }
    }
  );
}

// Keep the overlay in sync when the OS itself switches between light/dark
// (relevant when the user has chosen 'system' theme).
nativeTheme.on('updated', () => {
  if (mainWindow && process.platform !== 'darwin') {
    const isDark = nativeTheme.shouldUseDarkColors;
    mainWindow.setTitleBarOverlay({
      color: isDark ? '#0a0a0a' : '#ffffff',
      symbolColor: isDark ? '#ffffff' : '#000000',
      height: 40,
    });
  }
});

// App lifecycle
app.whenReady().then(() => {
  registerHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
