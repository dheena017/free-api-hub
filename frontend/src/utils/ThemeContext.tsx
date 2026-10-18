import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

export type Theme = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

export interface ThemeContextType {
  /** The currently selected theme preference ('dark', 'light', or 'system') */
  theme: Theme;
  /** The actively applied visual theme ('dark' or 'light') */
  resolvedTheme: ResolvedTheme;
  /** The current operating system preference ('dark' or 'light') */
  systemTheme: ResolvedTheme;
  /** True if the resolved visual theme is dark */
  isDark: boolean;
  /** True if the resolved visual theme is light */
  isLight: boolean;
  /** True if the user preference is set to follow system */
  isSystem: boolean;
  /** Quick toggle between dark and light themes */
  toggleTheme: () => void;
  /** Cycle through all available themes: system -> dark -> light */
  cycleTheme: () => void;
  /** Explicitly set the theme preference */
  setTheme: (theme: Theme) => void;
  /** List of all supported themes */
  availableThemes: readonly Theme[];
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Default theme when no stored preference is found (default: 'system') */
  defaultTheme?: Theme;
  /** Storage key used in localStorage (default: 'free_api_hub_theme') */
  storageKey?: string;
  /** Whether to dynamically update <meta name="theme-color"> (default: true) */
  enableThemeColorMeta?: boolean;
  /** Whether to prevent jarring CSS transition flickers during theme toggle (default: true) */
  disableTransitionOnChange?: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEME_STORAGE_KEY = 'free_api_hub_theme';
const AVAILABLE_THEMES: readonly Theme[] = ['system', 'dark', 'light'] as const;

// Hex colors for matching the <meta name="theme-color"> header bars
const THEME_META_COLORS: Record<ResolvedTheme, string> = {
  dark: '#1F1F1F',
  light: '#F8F9FA'
};

/**
 * Safely query current operating system color scheme preference.
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/**
 * Safely retrieve persisted theme from localStorage.
 */
function getStoredTheme(key: string, fallback: Theme): Theme {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // Fallback if localStorage is restricted (e.g. private mode / security policy)
  }
  return fallback;
}

/**
 * Temporarily disable all CSS transitions to avoid jarring element color animations during theme switch.
 */
function executeWithoutTransition(action: () => void) {
  if (typeof document === 'undefined') {
    action();
    return;
  }
  const css = document.createElement('style');
  css.appendChild(
    document.createTextNode(
      `*, *::before, *::after {
        -webkit-transition: none !important;
        -moz-transition: none !important;
        -o-transition: none !important;
        -ms-transition: none !important;
        transition: none !important;
      }`
    )
  );
  document.head.appendChild(css);
  action();
  // Force reflow
  void window.getComputedStyle(document.body);
  // Re-enable transitions on next animation frame
  requestAnimationFrame(() => {
    document.head.removeChild(css);
  });
}

/**
 * Free API Hub High-Performance Theme Provider.
 * Features:
 * - 3-Way Switching: 'dark', 'light', and 'system'
 * - Real-time OS color-scheme synchronization via matchMedia listener
 * - Instant Cross-Tab state synchronization via window storage events
 * - Dynamic <meta name="theme-color"> updates for mobile and PWA titlebars
 * - Flash-free transition suppression
 * - Custom DOM event dispatch for external or non-React widgets (Monaco, charts, etc.)
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'dark',
  storageKey = THEME_STORAGE_KEY,
  enableThemeColorMeta = true,
  disableTransitionOnChange = true
}) => {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme(storageKey, defaultTheme));
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());

  // Determine the effective visual theme ('dark' | 'light')
  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (theme === 'system') {
      return systemTheme;
    }
    return theme;
  }, [theme, systemTheme]);

  // Listen to OS prefers-color-scheme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if (typeof mediaQuery.addListener === 'function') {
      // Legacy Safari / older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Synchronize theme across multiple browser tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        const val = event.newValue;
        if (val === 'light' || val === 'dark' || val === 'system') {
          setThemeState(val);
        } else if (!val) {
          setThemeState(defaultTheme);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [storageKey, defaultTheme]);

  // Apply resolved theme to HTML root, colorScheme, and <meta name="theme-color">
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const applyThemeToDOM = () => {
      const root = document.documentElement;

      if (resolvedTheme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
        root.setAttribute('data-theme', 'dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
        root.style.colorScheme = 'light';
      }

      // Update mobile / browser header bar color
      if (enableThemeColorMeta) {
        let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = 'theme-color';
          document.head.appendChild(meta);
        }
        meta.content = THEME_META_COLORS[resolvedTheme];
      }

      // Dispatch custom DOM event for third-party libraries (e.g., CodeMirror, Monaco, charts)
      window.dispatchEvent(
        new CustomEvent('free-api-hub:theme-change', {
          detail: { theme, resolvedTheme, systemTheme }
        })
      );
    };

    if (disableTransitionOnChange) {
      executeWithoutTransition(applyThemeToDOM);
    } else {
      applyThemeToDOM();
    }
  }, [resolvedTheme, theme, systemTheme, enableThemeColorMeta, disableTransitionOnChange]);

  // Set theme with persistence
  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      try {
        window.localStorage.setItem(storageKey, newTheme);
      } catch {
        // Ignore localStorage quota/policy errors
      }
    },
    [storageKey]
  );

  // Toggle between dark and light
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  // Cycle through all themes: system -> dark -> light -> system
  const cycleTheme = useCallback(() => {
    setThemeState((current) => {
      const nextIndex = (AVAILABLE_THEMES.indexOf(current) + 1) % AVAILABLE_THEMES.length;
      const nextTheme = AVAILABLE_THEMES[nextIndex];
      try {
        window.localStorage.setItem(storageKey, nextTheme);
      } catch {
        // Ignore errors
      }
      return nextTheme;
    });
  }, [storageKey]);

  const contextValue = useMemo<ThemeContextType>(
    () => ({
      theme,
      resolvedTheme,
      systemTheme,
      isDark: resolvedTheme === 'dark',
      isLight: resolvedTheme === 'light',
      isSystem: theme === 'system',
      toggleTheme,
      cycleTheme,
      setTheme,
      availableThemes: AVAILABLE_THEMES
    }),
    [theme, resolvedTheme, systemTheme, toggleTheme, cycleTheme, setTheme]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

/**
 * Hook to access the current theme context, active theme, and theme controls.
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
