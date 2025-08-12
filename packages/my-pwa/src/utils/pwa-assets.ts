// PWA Asset Management Utility

export interface PWAIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

export interface PWASplashScreen {
  src: string;
  sizes: string;
  type: string;
  media?: string;
}

export interface PWAManifestIcons {
  icons: PWAIcon[];
  appleTouchIcons: PWAIcon[];
  favicon: PWAIcon;
}

export interface PWAManifestSplashScreens {
  splashScreens: PWASplashScreen[];
  appleSplashScreens: PWASplashScreen[];
}

export interface PWAAssetConfig {
  baseUrl: string;
  iconPath: string;
  splashPath: string;
  iconFormats: string[];
  splashFormats: string[];
}

// Default PWA asset configuration
export const DEFAULT_PWA_ASSET_CONFIG: PWAAssetConfig = {
  baseUrl: '',
  iconPath: '/assets/icons/',
  splashPath: '/assets/splash/',
  iconFormats: ['png', 'svg'],
  splashFormats: ['png'],
};

// PWA Icon Sizes (standard sizes for different devices)
export const PWA_ICON_SIZES = {
  // Standard PWA icons
  '16x16': '16x16',
  '32x32': '32x32',
  '48x48': '48x48',
  '72x72': '72x72',
  '96x96': '96x96',
  '128x128': '128x128',
  '144x144': '144x144',
  '152x152': '152x152',
  '192x192': '192x192',
  '384x384': '384x384',
  '512x512': '512x512',

  // Apple touch icons
  '180x180': '180x180',
  '167x167': '167x167', // iPad
  '120x120': '120x120', // iPhone
  '87x87': '87x87', // iPhone 6 Plus

  // Android adaptive icons
  '108x108': '108x108',
  '36x36': '36x36',
} as const;

// PWA Splash Screen Sizes (iOS and Android)
export const PWA_SPLASH_SIZES = {
  // iOS splash screens
  '640x1136': '640x1136', // iPhone 5/SE 1st gen
  '750x1334': '750x1334', // iPhone 6/7/8/SE 2nd gen
  '828x1792': '828x1792', // iPhone XR/11
  '1125x2436': '1125x2436', // iPhone X/XS
  '1170x2532': '1170x2532', // iPhone 12/13 mini
  '1179x2556': '1179x2556', // iPhone 12/13 Pro
  '1242x2208': '1242x2208', // iPhone 6/7/8 Plus
  '1242x2688': '1242x2688', // iPhone XS Max
  '1284x2778': '1284x2778', // iPhone 12/13 Pro Max
  '1290x2796': '1290x2796', // iPhone 14 Pro Max

  // Android splash screens
  '320x320': '320x320',
  '480x480': '640x640',
  '720x720': '720x720',
  '1080x1080': '1080x1080',
  '1440x1440': '1440x1440',
} as const;

// PWA Asset Manager Class
export class PWAAssetManager {
  public config: PWAAssetConfig;
  private baseUrl: string;

  constructor(config: Partial<PWAAssetConfig> = {}, baseUrl: string = '') {
    this.config = { ...DEFAULT_PWA_ASSET_CONFIG, ...config };
    this.baseUrl = baseUrl || config.baseUrl || '';
  }

  /**
   * Get the full path for an icon
   */
  public getIconPath(filename: string): string {
    return `${this.baseUrl}${this.config.iconPath}${filename}`;
  }

  /**
   * Get the full path for a splash screen
   */
  public getSplashPath(filename: string): string {
    return `${this.baseUrl}${this.config.splashPath}${filename}`;
  }

  /**
   * Generate manifest icons configuration
   */
  public generateManifestIcons(): PWAManifestIcons {
    const icons: PWAIcon[] = [];
    const appleTouchIcons: PWAIcon[] = [];
    let favicon: PWAIcon;

    // Standard PWA icons
    Object.entries(PWA_ICON_SIZES).forEach(([size, dimensions]) => {
      const icon: PWAIcon = {
        src: this.getIconPath(`icon-${dimensions}.png`),
        sizes: dimensions,
        type: 'image/png',
      };

      // Categorize icons
      if (size === '32x32') {
        favicon = icon;
      } else if (
        size.startsWith('180') ||
        size.startsWith('167') ||
        size.startsWith('152') ||
        size.startsWith('120') ||
        size.startsWith('87')
      ) {
        appleTouchIcons.push(icon);
      } else {
        icons.push(icon);
      }
    });

    // Add SVG icon
    icons.push({
      src: this.getIconPath('icon.svg'),
      sizes: 'any',
      type: 'image/svg+xml',
    });

    return {
      icons,
      appleTouchIcons,
      favicon: favicon!,
    };
  }

  /**
   * Generate manifest splash screens configuration
   */
  public generateManifestSplashScreens(): PWAManifestSplashScreens {
    const splashScreens: PWASplashScreen[] = [];
    const appleSplashScreens: PWASplashScreen[] = [];

    // Generate splash screens for different orientations and devices
    Object.entries(PWA_SPLASH_SIZES).forEach(([size, dimensions]) => {
      const [width, height] = dimensions.split('x').map(Number);
      const isPortrait = height > width;
      const isLandscape = width > height;
      const isSquare = width === height;

      const splashScreen: PWASplashScreen = {
        src: this.getSplashPath(`splash-${dimensions}.png`),
        sizes: dimensions,
        type: 'image/png',
      };

      // Add media queries for different orientations
      if (isPortrait) {
        splashScreen.media = `(orientation: portrait) and (device-width: ${width}px) and (device-height: ${height}px)`;
        appleSplashScreens.push(splashScreen);
        // Also add to regular splash screens for testing
        splashScreens.push({ ...splashScreen, media: undefined });
      } else if (isLandscape) {
        splashScreen.media = `(orientation: landscape) and (device-width: ${width}px) and (device-height: ${height}px)`;
        appleSplashScreens.push(splashScreen);
        // Also add to regular splash screens for testing
        splashScreens.push({ ...splashScreen, media: undefined });
      } else if (isSquare) {
        splashScreen.media = `(device-width: ${width}px) and (device-height: ${height}px)`;
        splashScreens.push(splashScreen);
      }
    });

    return {
      splashScreens,
      appleSplashScreens,
    };
  }

  /**
   * Generate complete manifest assets configuration
   */
  public generateManifestAssets(): PWAManifestIcons & PWAManifestSplashScreens {
    return {
      ...this.generateManifestIcons(),
      ...this.generateManifestSplashScreens(),
    };
  }

  /**
   * Generate HTML meta tags for PWA assets
   */
  public generateHTMLMetaTags(): string[] {
    const metaTags: string[] = [];
    const manifestAssets = this.generateManifestAssets();

    // Favicon
    metaTags.push(
      `<link rel="icon" type="image/png" sizes="32x32" href="${manifestAssets.favicon.src}">`
    );
    metaTags.push(
      `<link rel="icon" type="image/svg+xml" href="${this.getIconPath(
        'icon.svg'
      )}">`
    );

    // Apple touch icons
    manifestAssets.appleTouchIcons.forEach((icon) => {
      metaTags.push(
        `<link rel="apple-touch-icon" sizes="${icon.sizes}" href="${icon.src}">`
      );
    });

    // Apple splash screens
    manifestAssets.appleSplashScreens.forEach((splash) => {
      if (splash.media) {
        metaTags.push(
          `<link rel="apple-touch-startup-image" media="${splash.media}" href="${splash.src}">`
        );
      }
    });

    // Theme colors
    metaTags.push('<meta name="theme-color" content="#f7931a">');
    metaTags.push('<meta name="msapplication-TileColor" content="#f7931a">');

    return metaTags;
  }

  /**
   * Generate PWA CSS for splash screens
   */
  public generatePWACSS(): string {
    const manifestAssets = this.generateManifestAssets();
    let css = '/* PWA Asset CSS */\n\n';

    // Apple splash screen CSS
    manifestAssets.appleSplashScreens.forEach((splash) => {
      if (splash.media) {
        css += `@media ${splash.media} {\n`;
        css += `  body {\n`;
        css += `    background-image: url('${splash.src}');\n`;
        css += `    background-size: cover;\n`;
        css += `    background-position: center;\n`;
        css += `    background-repeat: no-repeat;\n`;
        css += `  }\n`;
        css += `}\n\n`;
      }
    });

    return css;
  }

  /**
   * Preload critical PWA assets
   */
  public generatePreloadTags(): string[] {
    const preloadTags: string[] = [];
    const manifestAssets = this.generateManifestAssets();

    // Preload critical icons
    const criticalIcons = ['192x192', '512x512'];
    criticalIcons.forEach((size) => {
      const icon = manifestAssets.icons.find((i) => i.sizes === size);
      if (icon) {
        preloadTags.push(`<link rel="preload" as="image" href="${icon.src}">`);
      }
    });

    // Preload critical splash screens
    const criticalSplashScreens = ['1125x2436', '1242x2688', '1290x2796'];
    criticalSplashScreens.forEach((size) => {
      const splash = manifestAssets.appleSplashScreens.find(
        (s) => s.sizes === size
      );
      if (splash) {
        preloadTags.push(
          `<link rel="preload" as="image" href="${splash.src}">`
        );
      }
    });

    return preloadTags;
  }

  /**
   * Validate PWA assets
   */
  public validateAssets(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required icons
    const requiredIcons = ['192x192', '512x512'];
    requiredIcons.forEach((size) => {
      const iconPath = this.getIconPath(`icon-${size}.png`);
      // In a real implementation, you would check if the file exists
      // For now, we'll just validate the path format
      if (!iconPath.includes(size)) {
        errors.push(`Required icon size ${size} not found`);
      }
    });

    // Check for required splash screens
    const requiredSplashScreens = ['1125x2436', '1242x2688'];
    requiredSplashScreens.forEach((size) => {
      const splashPath = this.getSplashPath(`splash-${size}.png`);
      if (!splashPath.includes(size)) {
        warnings.push(`Recommended splash screen size ${size} not found`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get asset information for debugging
   */
  public getAssetInfo(): {
    icons: { size: string; path: string }[];
    splashScreens: { size: string; path: string }[];
    totalSize: number;
  } {
    const manifestAssets = this.generateManifestAssets();

    const icons = manifestAssets.icons.map((icon) => ({
      size: icon.sizes,
      path: icon.src,
    }));

    const splashScreens = manifestAssets.splashScreens.map((splash) => ({
      size: splash.sizes,
      path: splash.src,
    }));

    // Calculate total size (this would be actual file sizes in a real implementation)
    const totalSize = icons.length + splashScreens.length;

    return {
      icons,
      splashScreens,
      totalSize,
    };
  }
}

// Default asset manager instance
export const pwaAssetManager = new PWAAssetManager();

// Utility functions for common asset operations
export function getPWAIconPath(filename: string, baseUrl: string = ''): string {
  return pwaAssetManager.getIconPath(filename);
}

export function getPWASplashPath(
  filename: string,
  baseUrl: string = ''
): string {
  return pwaAssetManager.getSplashPath(filename);
}

export function generatePWAManifestIcons(): PWAManifestIcons {
  return pwaAssetManager.generateManifestIcons();
}

export function generatePWAManifestSplashScreens(): PWAManifestSplashScreens {
  return pwaAssetManager.generateManifestSplashScreens();
}

export function generatePWAManifestAssets(): PWAManifestIcons &
  PWAManifestSplashScreens {
  return pwaAssetManager.generateManifestAssets();
}

export function generatePWAHTMLMetaTags(): string[] {
  return pwaAssetManager.generateHTMLMetaTags();
}

export function generatePWACSS(): string {
  return pwaAssetManager.generatePWACSS();
}

export function generatePWAPreloadTags(): string[] {
  return pwaAssetManager.generatePreloadTags();
}

export function validatePWAAssets(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  return pwaAssetManager.validateAssets();
}

export function getPWAAssetInfo(): {
  icons: { size: string; path: string }[];
  splashScreens: { size: string; path: string }[];
  totalSize: number;
} {
  return pwaAssetManager.getAssetInfo();
}
