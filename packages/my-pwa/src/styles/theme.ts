// PWA Theme System with Dark/Light Mode Support

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ThemeVariant = 'bitcoin' | 'default' | 'custom';

export interface PWAThemeColors {
  // Primary colors
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryContrast: string;

  // Secondary colors
  secondary: string;
  secondaryDark: string;
  secondaryLight: string;
  secondaryContrast: string;

  // Semantic colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  backgroundOverlay: string;

  // Surface colors
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  surfaceBorder: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  textMuted: string;

  // Border colors
  border: string;
  borderSecondary: string;
  borderFocus: string;
  borderError: string;

  // Shadow colors
  shadow: string;
  shadowSecondary: string;
  shadowFocus: string;
}

export interface PWAThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
}

export interface PWAThemeTypography {
  fontFamily: string;
  fontFamilyMono: string;
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
    extrabold: number;
  };
  lineHeight: {
    tight: string;
    normal: string;
    relaxed: string;
    loose: string;
  };
}

export interface PWAThemeShadows {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  inner: string;
  none: string;
}

export interface PWAThemeBorderRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  full: string;
}

export interface PWAThemeZIndex {
  dropdown: number;
  sticky: number;
  fixed: number;
  modal: number;
  popover: number;
  tooltip: number;
  toast: number;
}

export interface PWATheme {
  name: string;
  variant: ThemeVariant;
  colors: PWAThemeColors;
  spacing: PWAThemeSpacing;
  typography: PWAThemeTypography;
  shadows: PWAThemeShadows;
  borderRadius: PWAThemeBorderRadius;
  zIndex: PWAThemeZIndex;
}

// Bitcoin Theme (Light Mode)
export const BITCOIN_LIGHT_THEME: PWATheme = {
  name: 'Bitcoin Light',
  variant: 'bitcoin',
  colors: {
    // Primary colors (Bitcoin orange)
    primary: '#f7931a',
    primaryDark: '#e68207',
    primaryLight: '#fef3c7',
    primaryContrast: '#ffffff',

    // Secondary colors
    secondary: '#1f2937',
    secondaryDark: '#111827',
    secondaryLight: '#6b7280',
    secondaryContrast: '#ffffff',

    // Semantic colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    // Background colors
    background: '#ffffff',
    backgroundSecondary: '#f9fafb',
    backgroundTertiary: '#f3f4f6',
    backgroundOverlay: 'rgba(0, 0, 0, 0.5)',

    // Surface colors
    surface: '#ffffff',
    surfaceSecondary: '#f9fafb',
    surfaceTertiary: '#f3f4f6',
    surfaceBorder: '#e5e7eb',

    // Text colors
    textPrimary: '#111827',
    textSecondary: '#4b5563',
    textTertiary: '#9ca3af',
    textInverse: '#ffffff',
    textMuted: '#6b7280',

    // Border colors
    border: '#e5e7eb',
    borderSecondary: '#f3f4f6',
    borderFocus: '#f7931a',
    borderError: '#ef4444',

    // Shadow colors
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowSecondary: 'rgba(0, 0, 0, 0.05)',
    shadowFocus: 'rgba(247, 147, 26, 0.25)',
  },
  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    '2xl': '3rem', // 48px
    '3xl': '4rem', // 64px
    '4xl': '6rem', // 96px
  },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontFamilyMono:
      'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem', // 48px
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
      loose: '2',
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    none: 'none',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem', // 2px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    xl: '0.75rem', // 12px
    '2xl': '1rem', // 16px
    full: '9999px',
  },
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
    toast: 1070,
  },
};

// Bitcoin Theme (Dark Mode)
export const BITCOIN_DARK_THEME: PWATheme = {
  name: 'Bitcoin Dark',
  variant: 'bitcoin',
  colors: {
    // Primary colors (Bitcoin orange)
    primary: '#f7931a',
    primaryDark: '#e68207',
    primaryLight: '#fef3c7',
    primaryContrast: '#ffffff',

    // Secondary colors
    secondary: '#f9fafb',
    secondaryDark: '#f3f4f6',
    secondaryLight: '#6b7280',
    secondaryContrast: '#111827',

    // Semantic colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    // Background colors
    background: '#111827',
    backgroundSecondary: '#1f2937',
    backgroundTertiary: '#374151',
    backgroundOverlay: 'rgba(0, 0, 0, 0.7)',

    // Surface colors
    surface: '#1f2937',
    surfaceSecondary: '#374151',
    surfaceTertiary: '#4b5563',
    surfaceBorder: '#4b5563',

    // Text colors
    textPrimary: '#f9fafb',
    textSecondary: '#d1d5db',
    textTertiary: '#9ca3af',
    textInverse: '#111827',
    textMuted: '#6b7280',

    // Border colors
    border: '#4b5563',
    borderSecondary: '#374151',
    borderFocus: '#f7931a',
    borderError: '#ef4444',

    // Shadow colors
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowSecondary: 'rgba(0, 0, 0, 0.2)',
    shadowFocus: 'rgba(247, 147, 26, 0.4)',
  },
  spacing: BITCOIN_LIGHT_THEME.spacing,
  typography: BITCOIN_LIGHT_THEME.typography,
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.2)',
    none: 'none',
  },
  borderRadius: BITCOIN_LIGHT_THEME.borderRadius,
  zIndex: BITCOIN_LIGHT_THEME.zIndex,
};

// Default Theme (Light Mode)
export const DEFAULT_LIGHT_THEME: PWATheme = {
  name: 'Default Light',
  variant: 'default',
  colors: {
    // Primary colors (Blue)
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    primaryLight: '#dbeafe',
    primaryContrast: '#ffffff',

    // Secondary colors
    secondary: '#6b7280',
    secondaryDark: '#4b5563',
    secondaryLight: '#9ca3af',
    secondaryContrast: '#ffffff',

    // Semantic colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    // Background colors
    background: '#ffffff',
    backgroundSecondary: '#f9fafb',
    backgroundTertiary: '#f3f4f6',
    backgroundOverlay: 'rgba(0, 0, 0, 0.5)',

    // Surface colors
    surface: '#ffffff',
    surfaceSecondary: '#f9fafb',
    surfaceTertiary: '#f3f4f6',
    surfaceBorder: '#e5e7eb',

    // Text colors
    textPrimary: '#111827',
    textSecondary: '#4b5563',
    textTertiary: '#9ca3af',
    textInverse: '#ffffff',
    textMuted: '#6b7280',

    // Border colors
    border: '#e5e7eb',
    borderSecondary: '#f3f4f6',
    borderFocus: '#3b82f6',
    borderError: '#ef4444',

    // Shadow colors
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowSecondary: 'rgba(0, 0, 0, 0.05)',
    shadowFocus: 'rgba(59, 130, 246, 0.25)',
  },
  spacing: BITCOIN_LIGHT_THEME.spacing,
  typography: BITCOIN_LIGHT_THEME.typography,
  shadows: BITCOIN_LIGHT_THEME.shadows,
  borderRadius: BITCOIN_LIGHT_THEME.borderRadius,
  zIndex: BITCOIN_LIGHT_THEME.zIndex,
};

// Default Theme (Dark Mode)
export const DEFAULT_DARK_THEME: PWATheme = {
  name: 'Default Dark',
  variant: 'default',
  colors: {
    // Primary colors (Blue)
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    primaryLight: '#dbeafe',
    primaryContrast: '#ffffff',

    // Secondary colors
    secondary: '#9ca3af',
    secondaryDark: '#6b7280',
    secondaryLight: '#d1d5db',
    secondaryContrast: '#111827',

    // Semantic colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    // Background colors
    background: '#111827',
    backgroundSecondary: '#1f2937',
    backgroundTertiary: '#374151',
    backgroundOverlay: 'rgba(0, 0, 0, 0.7)',

    // Surface colors
    surface: '#1f2937',
    surfaceSecondary: '#374151',
    surfaceTertiary: '#4b5563',
    surfaceBorder: '#4b5563',

    // Text colors
    textPrimary: '#f9fafb',
    textSecondary: '#d1d5db',
    textTertiary: '#9ca3af',
    textInverse: '#111827',
    textMuted: '#6b7280',

    // Border colors
    border: '#4b5563',
    borderSecondary: '#374151',
    borderFocus: '#3b82f6',
    borderError: '#ef4444',

    // Shadow colors
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowSecondary: 'rgba(0, 0, 0, 0.2)',
    shadowFocus: 'rgba(59, 130, 246, 0.4)',
  },
  spacing: BITCOIN_LIGHT_THEME.spacing,
  typography: BITCOIN_LIGHT_THEME.typography,
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.2)',
    none: 'none',
  },
  borderRadius: BITCOIN_LIGHT_THEME.borderRadius,
  zIndex: BITCOIN_LIGHT_THEME.zIndex,
};

// Theme Registry
export const PWA_THEMES = {
  'bitcoin-light': BITCOIN_LIGHT_THEME,
  'bitcoin-dark': BITCOIN_DARK_THEME,
  'default-light': DEFAULT_LIGHT_THEME,
  'default-dark': DEFAULT_DARK_THEME,
} as const;

export type PWAThemeKey = keyof typeof PWA_THEMES;

// Theme Manager
export class PWAThemeManager {
  private currentTheme: PWAThemeKey = 'bitcoin-light';
  private currentMode: ThemeMode = 'auto';
  private mediaQuery: MediaQueryList | null = null;
  private listeners: Set<(theme: PWATheme) => void> = new Set();

  constructor() {
    // Defer initialization to client after hydration to avoid SSR hydration mismatches
  }

  private initializeTheme(): void {
    // Check for saved theme preference
    const savedTheme = this.getSavedTheme();
    if (savedTheme) {
      this.currentTheme = savedTheme;
    }

    // Check for saved mode preference
    const savedMode = this.getSavedMode();
    if (savedMode) {
      this.currentMode = savedMode;
    }

    // Set up media query for auto mode
    this.setupMediaQuery();

    // Apply initial theme
    this.applyTheme();
  }

  /**
   * Initialize theme manager on the client after hydration.
   * This avoids mutating documentElement during module evaluation.
   */
  public initializeOnClient(): void {
    this.initializeTheme();
  }

  private setupMediaQuery(): void {
    if (typeof window !== 'undefined') {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQuery.addEventListener(
        'change',
        this.handleMediaQueryChange.bind(this)
      );
    }
  }

  private handleMediaQueryChange(): void {
    if (this.currentMode === 'auto') {
      this.applyTheme();
      this.notifyListeners();
    }
  }

  private getSavedTheme(): PWAThemeKey | null {
    if (typeof window === 'undefined') return null;
    // Skip persistence in test environment
    if (
      typeof process !== 'undefined' &&
      process.env &&
      process.env.NODE_ENV === 'test'
    ) {
      return null;
    }
    try {
      const storage = (window as unknown as { localStorage?: Storage })
        .localStorage;
      if (!storage) return null;
      return (storage.getItem('pwa-theme') as PWAThemeKey) || null;
    } catch {
      return null;
    }
  }

  private getSavedMode(): ThemeMode | null {
    if (typeof window === 'undefined') return null;
    // Skip persistence in test environment
    if (
      typeof process !== 'undefined' &&
      process.env &&
      process.env.NODE_ENV === 'test'
    ) {
      return null;
    }
    try {
      const storage = (window as unknown as { localStorage?: Storage })
        .localStorage;
      if (!storage) return null;
      return (storage.getItem('pwa-theme-mode') as ThemeMode) || null;
    } catch {
      return null;
    }
  }

  private saveTheme(theme: PWAThemeKey): void {
    if (typeof window === 'undefined') return;
    // Skip persistence in test environment
    if (
      typeof process !== 'undefined' &&
      process.env &&
      process.env.NODE_ENV === 'test'
    ) {
      return;
    }
    try {
      const storage = (window as unknown as { localStorage?: Storage })
        .localStorage;
      storage?.setItem('pwa-theme', theme);
    } catch {
      // ignore storage errors in tests/environments without storage
    }
  }

  private saveMode(mode: ThemeMode): void {
    if (typeof window === 'undefined') return;
    // Skip persistence in test environment
    if (
      typeof process !== 'undefined' &&
      process.env &&
      process.env.NODE_ENV === 'test'
    ) {
      return;
    }
    try {
      const storage = (window as unknown as { localStorage?: Storage })
        .localStorage;
      storage?.setItem('pwa-theme-mode', mode);
    } catch {
      // ignore storage errors in tests/environments without storage
    }
  }

  public setTheme(theme: PWAThemeKey): void {
    // Validate theme key
    if (!PWA_THEMES[theme]) {
      console.warn(
        `Invalid theme key: ${theme}, falling back to bitcoin-light`
      );
      theme = 'bitcoin-light';
    }

    this.currentTheme = theme;
    this.saveTheme(theme);
    this.applyTheme();
    this.notifyListeners();
  }

  public setMode(mode: ThemeMode): void {
    // Validate mode
    if (!['light', 'dark', 'auto'].includes(mode)) {
      console.warn(`Invalid mode: ${mode}, falling back to auto`);
      mode = 'auto';
    }

    this.currentMode = mode;
    this.saveMode(mode);
    this.applyTheme();
    this.notifyListeners();
  }

  public getTheme(): PWATheme {
    return this.getEffectiveTheme();
  }

  public getCurrentThemeKey(): PWAThemeKey {
    return this.currentTheme;
  }

  public getCurrentMode(): ThemeMode {
    return this.currentMode;
  }

  public getEffectiveTheme(): PWATheme {
    let themeKey = this.currentTheme;

    // Handle auto mode using current system preference at call time
    if (this.currentMode === 'auto') {
      let isDark = false;
      if (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function'
      ) {
        try {
          isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        } catch {
          isDark = false;
        }
      }
      // In auto mode, prefer dark when system requests dark and current theme is a light variant.
      // Do not force convert dark -> light when system is light to respect explicit dark selection.
      if (isDark && themeKey.endsWith('-light')) {
        themeKey = themeKey.replace('-light', '-dark') as PWAThemeKey;
      }
    }

    if (!PWA_THEMES[themeKey]) {
      themeKey = 'bitcoin-light';
    }

    return PWA_THEMES[themeKey];
  }

  public addListener(listener: (theme: PWATheme) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const theme = this.getEffectiveTheme();
    this.listeners.forEach((listener) => listener(theme));
  }

  public themeToCSSVars(theme: PWATheme): string[] {
    const vars = this.themeToCSSVarsObject(theme);
    return Object.entries(vars).map(
      ([property, value]) => `${property}: ${value}`
    );
  }

  private applyTheme(): void {
    if (typeof window === 'undefined') return;

    const theme = this.getEffectiveTheme();
    const root = document.documentElement;

    // Apply CSS custom properties
    const vars = this.themeToCSSVarsObject(theme);
    Object.entries(vars).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Apply theme class
    root.className = root.className.replace(/theme-\w+-\w+/g, '').trim();
    root.classList.add(
      `theme-${theme.variant}-${
        this.currentMode === 'auto' ? 'auto' : this.currentMode
      }`
    );
  }

  private themeToCSSVarsObject(theme: PWATheme): Record<string, string> {
    const vars: Record<string, string> = {};

    // Color variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      vars[`--pwa-${key}`] = value;
    });

    // Spacing variables
    Object.entries(theme.spacing).forEach(([key, value]) => {
      vars[`--pwa-spacing-${key}`] = value;
    });

    // Typography variables
    vars['--pwa-font-family'] = theme.typography.fontFamily;
    vars['--pwa-font-family-mono'] = theme.typography.fontFamilyMono;
    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      vars[`--pwa-font-size-${key}`] = value;
    });
    Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
      vars[`--pwa-font-weight-${key}`] = value.toString();
    });
    Object.entries(theme.typography.lineHeight).forEach(([key, value]) => {
      vars[`--pwa-line-height-${key}`] = value;
    });

    // Shadow variables
    Object.entries(theme.shadows).forEach(([key, value]) => {
      vars[`--pwa-shadow-${key}`] = value;
    });

    // Border radius variables
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      vars[`--pwa-radius-${key}`] = value;
    });

    // Z-index variables
    Object.entries(theme.zIndex).forEach(([key, value]) => {
      vars[`--pwa-z-${key}`] = value.toString();
    });

    return vars;
  }

  public destroy(): void {
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener(
        'change',
        this.handleMediaQueryChange.bind(this)
      );
    }
    this.listeners.clear();
  }
}

// Default theme manager instance
export const pwaThemeManager = new PWAThemeManager();

// Export default theme for backward compatibility
export const DEFAULT_BITCOIN_THEME = BITCOIN_LIGHT_THEME;
