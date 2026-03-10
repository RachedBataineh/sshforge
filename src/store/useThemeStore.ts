import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme: Theme) => {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');

  let effectiveTheme: 'light' | 'dark';
  if (theme === 'system') {
    effectiveTheme = getSystemTheme();
    root.classList.add(effectiveTheme);
  } else {
    effectiveTheme = theme;
    root.classList.add(theme);
  }

  // Sync the native Windows titleBarOverlay button colors with the active theme.
  // No-op on macOS (traffic lights are always native) and safe in dev/browser.
  const isDark = effectiveTheme === 'dark';
  window.electronAPI?.setTitleBarOverlay?.({
    color: isDark ? '#0a0a0a' : '#ffffff',
    symbolColor: isDark ? '#ffffff' : '#000000',
  });
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
    }),
    {
      name: 'sshforge-theme',
      onRehydrateStorage: () => (state) => {
        // Apply theme on app load
        if (state) {
          applyTheme(state.theme);
        }
      },
    }
  )
);

// Initialize theme on load
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('sshforge-theme');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.state?.theme) {
        applyTheme(parsed.state.theme);
      }
    } catch {
      applyTheme('system');
    }
  } else {
    applyTheme('system');
  }

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme } = useThemeStore.getState();
    if (theme === 'system') {
      applyTheme('system');
    }
  });
}
