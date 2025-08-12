// PWA Styles Export

// Export the theme system (including pwaThemeManager)
export * from './theme.js';

// Export CSS module styles (these will be available at runtime)
export const PWA_STYLES = {
  // Component-specific style classes
  installPrompt: 'install-prompt',
  offlineIndicator: 'offline-indicator',
  pwaProvider: 'pwa-provider',

  // Theme classes
  themeBitcoin: 'theme-bitcoin',
  themeDefault: 'theme-default',
  themeCustom: 'theme-custom',

  // Position classes
  positionTop: 'position-top',
  positionBottom: 'position-bottom',
  positionCenter: 'position-center',

  // State classes
  online: 'online',
  offline: 'offline',
  pwaMode: 'pwa-mode',
  standalone: 'standalone',
} as const;

// CSS Custom Properties for theming (legacy support)
export const PWA_CSS_VARS = {
  // Colors
  '--pwa-primary': '#f7931a',
  '--pwa-secondary': '#e6851a',
  '--pwa-success': '#28a745',
  '--pwa-warning': '#ffc107',
  '--pwa-error': '#dc3545',

  // Text colors
  '--pwa-text-primary': '#000000',
  '--pwa-text-secondary': '#666666',
  '--pwa-text-inverse': '#ffffff',

  // Background colors
  '--pwa-bg-primary': '#ffffff',
  '--pwa-bg-secondary': '#f8f9fa',
  '--pwa-bg-overlay': 'rgba(0, 0, 0, 0.5)',

  // Spacing
  '--pwa-spacing-xs': '4px',
  '--pwa-spacing-sm': '8px',
  '--pwa-spacing-md': '16px',
  '--pwa-spacing-lg': '24px',
  '--pwa-spacing-xl': '32px',

  // Border radius
  '--pwa-radius-sm': '4px',
  '--pwa-radius-md': '8px',
  '--pwa-radius-lg': '16px',
  '--pwa-radius-xl': '24px',

  // Shadows
  '--pwa-shadow-sm': '0 2px 4px rgba(0, 0, 0, 0.1)',
  '--pwa-shadow-md': '0 4px 8px rgba(0, 0, 0, 0.15)',
  '--pwa-shadow-lg': '0 8px 16px rgba(0, 0, 0, 0.2)',
  '--pwa-shadow-xl': '0 16px 32px rgba(0, 0, 0, 0.25)',

  // Safe area insets (iOS)
  '--safe-area-top': '0px',
  '--safe-area-right': '0px',
  '--safe-area-bottom': '0px',
  '--safe-area-left': '0px',
} as const;

// PWA Style Files (for import in applications)
export const PWA_STYLE_FILES = {
  // Core PWA styles
  globals: './globals.css',
  designTokens: './design-tokens.css',
  iosPWA: './ios-pwa.css',

  // Component-specific styles
  installPrompt: './components/InstallPrompt.module.css',
  offlineIndicator: './components/OfflineIndicator.module.css',
  pwaProvider: './components/PWAProvider.module.css',
} as const;

// PWA Style Utilities
export const PWA_STYLE_UTILS = {
  // Theme utilities
  applyTheme: 'applyPWATheme',
  getThemeVars: 'getPWAThemeVars',

  // CSS utilities
  generateCSS: 'generatePWACSS',
  generateMetaTags: 'generatePWAHTMLMetaTags',
  generatePreloadTags: 'generatePWAPreloadTags',

  // Asset utilities
  getIconPath: 'getPWAIconPath',
  getSplashPath: 'getPWASplashPath',
  validateAssets: 'validatePWAAssets',
} as const;

// Helper function to apply PWA theme to an element (legacy support)
export function applyPWATheme(
  element: HTMLElement,
  theme: 'bitcoin' | 'default' | 'custom' = 'bitcoin'
): void {
  if (typeof window === 'undefined') return;

  const root =
    element.ownerDocument?.documentElement || document.documentElement;

  // Apply theme-specific CSS variables
  Object.entries(PWA_CSS_VARS).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });

  // Apply theme class
  element.classList.add(`pwa-theme-${theme}`);

  // Apply safe area insets if on iOS
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    const insets = getComputedStyle(root);
    const safeAreaTop = insets.getPropertyValue('--safe-area-top') || '0px';
    const safeAreaRight = insets.getPropertyValue('--safe-area-right') || '0px';
    const safeAreaBottom =
      insets.getPropertyValue('--safe-area-bottom') || '0px';
    const safeAreaLeft = insets.getPropertyValue('--safe-area-left') || '0px';

    root.style.setProperty('--safe-area-top', safeAreaTop);
    root.style.setProperty('--safe-area-right', safeAreaRight);
    root.style.setProperty('--safe-area-bottom', safeAreaBottom);
    root.style.setProperty('--safe-area-left', safeAreaLeft);
  }
}

// Helper function to get PWA theme CSS variables (legacy support)
export function getPWAThemeVars(
  theme: 'bitcoin' | 'default' | 'custom' = 'bitcoin'
) {
  const baseVars = { ...PWA_CSS_VARS } as Record<string, string>;

  if (theme === 'default') {
    baseVars['--pwa-primary'] = '#007bff';
    baseVars['--pwa-secondary'] = '#0056b3';
  }

  return baseVars;
}

// PWA Style Configuration
export const PWA_STYLE_CONFIG = {
  // Default theme
  defaultTheme: 'bitcoin-light',

  // Supported themes
  supportedThemes: [
    'bitcoin-light',
    'bitcoin-dark',
    'default-light',
    'default-dark',
  ],

  // Default mode
  defaultMode: 'auto',

  // Supported modes
  supportedModes: ['light', 'dark', 'auto'],

  // CSS custom properties prefix
  cssPrefix: '--pwa-',

  // Safe area support
  enableSafeArea: true,

  // iOS PWA optimizations
  enableIOSOptimizations: true,

  // Dark mode support
  enableDarkMode: true,

  // Theme persistence
  enableThemePersistence: true,
} as const;

// PWA Style Helpers
export class PWAStyleHelper {
  /**
   * Get the current theme from the document
   */
  static getCurrentTheme(): string {
    if (typeof window === 'undefined') return PWA_STYLE_CONFIG.defaultTheme;

    const root = document.documentElement;
    const themeClass = Array.from(root.classList).find((cls) =>
      cls.startsWith('theme-')
    );

    if (themeClass) {
      return themeClass.replace('theme-', '');
    }

    return PWA_STYLE_CONFIG.defaultTheme;
  }

  /**
   * Check if the current theme is dark
   */
  static isDarkTheme(): boolean {
    const currentTheme = this.getCurrentTheme();
    return currentTheme.includes('dark');
  }

  /**
   * Check if the current theme is Bitcoin variant
   */
  static isBitcoinTheme(): boolean {
    const currentTheme = this.getCurrentTheme();
    return currentTheme.includes('bitcoin');
  }

  /**
   * Get CSS custom property value
   */
  static getCSSVar(property: string, fallback?: string): string {
    if (typeof window === 'undefined') return fallback || '';

    const root = document.documentElement;
    const value = getComputedStyle(root).getPropertyValue(property);

    return value || fallback || '';
  }

  /**
   * Set CSS custom property value
   */
  static setCSSVar(property: string, value: string): void {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty(property, value);
  }

  /**
   * Check if safe area is supported
   */
  static hasSafeAreaSupport(): boolean {
    if (typeof window === 'undefined') return false;

    return CSS.supports('padding-top', 'env(safe-area-inset-top)');
  }

  /**
   * Get safe area insets
   */
  static getSafeAreaInsets(): {
    top: string;
    right: string;
    bottom: string;
    left: string;
  } {
    if (typeof window === 'undefined') {
      return { top: '0px', right: '0px', bottom: '0px', left: '0px' };
    }

    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);

    return {
      top: computedStyle.getPropertyValue('--safe-area-top') || '0px',
      right: computedStyle.getPropertyValue('--safe-area-right') || '0px',
      bottom: computedStyle.getPropertyValue('--safe-area-bottom') || '0px',
      left: computedStyle.getPropertyValue('--safe-area-left') || '0px',
    };
  }

  /**
   * Check if PWA is in standalone mode
   */
  static isStandaloneMode(): boolean {
    if (typeof window === 'undefined') return false;

    return window.matchMedia('(display-mode: standalone)').matches;
  }

  /**
   * Check if running on iOS
   */
  static isIOS(): boolean {
    if (typeof window === 'undefined') return false;

    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  /**
   * Check if running on Android
   */
  static isAndroid(): boolean {
    if (typeof window === 'undefined') return false;

    return /Android/.test(navigator.userAgent);
  }

  /**
   * Get device pixel ratio
   */
  static getDevicePixelRatio(): number {
    if (typeof window === 'undefined') return 1;

    return window.devicePixelRatio || 1;
  }

  /**
   * Get viewport dimensions
   */
  static getViewportDimensions(): { width: number; height: number } {
    if (typeof window === 'undefined') {
      return { width: 0, height: 0 };
    }

    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }
}

// Export the style helper instance
export const pwaStyleHelper = new PWAStyleHelper();
