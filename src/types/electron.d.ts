import type { KeyGenerationOptions, GeneratedKey, SaveOptions, FileSaveResult } from './index';

declare global {
  interface Window {
    electronAPI: {
      // Key generation
      generateKey: (options: KeyGenerationOptions) => Promise<{
        success: boolean;
        key?: GeneratedKey;
        error?: string;
      }>;

      // File operations
      getDefaultPath: () => Promise<string>;
      selectDirectory: (defaultPath?: string) => Promise<string | null>;
      saveKey: (options: SaveOptions) => Promise<FileSaveResult>;
      checkFileExists: (filePath: string) => Promise<boolean>;
      openInFileManager: (filePath: string) => Promise<boolean>;

      // Platform info
      getPlatform: () => Promise<string>;

      // Events
      onKeyGenerated: (callback: (result: { success: boolean; key?: GeneratedKey; error?: string }) => void) => void;
      onKeyError: (callback: (error: string) => void) => void;
      onFileSaved: (callback: (result: FileSaveResult) => void) => void;

      // Cleanup
      removeAllListeners: (channel: string) => void;
    };
  }
}

export {};
