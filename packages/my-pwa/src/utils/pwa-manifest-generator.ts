// PWA Manifest Generator Utility

import { generatePWAManifestAssets, PWAAssetManager } from './pwa-assets.js';

// Extended WebAppManifest interface for modern PWA features
interface ExtendedWebAppManifest {
  name?: string;
  short_name?: string;
  description?: string;
  start_url?: string;
  scope?: string;
  display?: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation?:
    | 'portrait'
    | 'landscape'
    | 'portrait-primary'
    | 'landscape-primary'
    | 'natural'
    | 'any';
  theme_color?: string;
  background_color?: string;
  categories?: string[];
  lang?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
  prefer_related_applications?: boolean;
  related_applications?: Array<{
    platform: string;
    url?: string;
    id?: string;
  }>;
  icons?: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
  // Extended properties (may not be supported in all browsers)
  shortcuts?: Array<{
    name: string;
    shortName?: string;
    description?: string;
    url: string;
    icons?: Array<{
      src: string;
      sizes: string;
      type?: string;
      purpose?: string;
    }>;
  }>;
  screenshots?: Array<{
    src: string;
    sizes: string;
    type: string;
    formFactor?: 'narrow' | 'wide';
    label?: string;
  }>;
  iarc_rating_id?: string;
  share_target?: {
    action: string;
    method?: 'GET' | 'POST';
    enctype?: string;
    params: {
      title?: string;
      text?: string;
      url?: string;
      files?: Array<{
        name: string;
        accept: string[];
      }>;
    };
  };
  protocol_handlers?: Array<{
    protocol: string;
    url: string;
  }>;
  file_handlers?: Array<{
    action: string;
    accept: Record<string, string[]>;
  }>;
  scope_extensions?: string[];
  handle_links?: 'preferred' | 'not-preferred';
  launch_handler?: {
    client_mode?: 'navigate-existing' | 'auto' | 'focus-existing';
  };
  edge_side_panel?: {
    preferred_width: number;
  };
}

export interface PWAManifestConfig {
  name: string;
  shortName: string;
  description: string;
  startUrl: string;
  scope: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation:
    | 'portrait'
    | 'landscape'
    | 'portrait-primary'
    | 'landscape-primary'
    | 'natural'
    | 'any';
  themeColor: string;
  backgroundColor: string;
  categories: string[];
  lang: string;
  dir: 'ltr' | 'rtl' | 'auto';
  preferRelatedApplications: boolean;
  relatedApplications: Array<{
    platform: string;
    url?: string;
    id?: string;
  }>;
  edgeSidePanel?: {
    preferredWidth: number;
  };
  shortcuts?: Array<{
    name: string;
    shortName?: string;
    description?: string;
    url: string;
    icons?: Array<{
      src: string;
      sizes: string;
      type?: string;
      purpose?: string;
    }>;
  }>;
  screenshots?: Array<{
    src: string;
    sizes: string;
    type: string;
    formFactor?: 'narrow' | 'wide';
    label?: string;
  }>;
  iarcRatingId?: string;
  shareTarget?: {
    action: string;
    method?: 'GET' | 'POST';
    enctype?: string;
    params: {
      title?: string;
      text?: string;
      url?: string;
      files?: Array<{
        name: string;
        accept: string[];
      }>;
    };
  };
  protocolHandlers?: Array<{
    protocol: string;
    url: string;
  }>;
  fileHandlers?: Array<{
    action: string;
    accept: Record<string, string[]>;
  }>;
  scopeExtensions?: string[];
  handleLinks?: 'preferred' | 'not-preferred';
  launchHandler?: {
    clientMode?: 'navigate-existing' | 'auto' | 'focus-existing';
  };
}

// Default PWA manifest configuration
export const DEFAULT_PWA_MANIFEST_CONFIG: PWAManifestConfig = {
  name: 'Bitcoin Wallet PWA',
  shortName: 'BTC Wallet',
  description: 'A secure Bitcoin wallet Progressive Web App',
  startUrl: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  themeColor: '#f7931a',
  backgroundColor: '#ffffff',
  categories: ['finance', 'utilities'],
  lang: 'en',
  dir: 'ltr',
  preferRelatedApplications: false,
  relatedApplications: [],
  shortcuts: [
    {
      name: 'Send Bitcoin',
      shortName: 'Send',
      description: 'Send Bitcoin to another address',
      url: '/send',
      icons: [
        {
          src: '/assets/icons/icon-96x96.png',
          sizes: '96x96',
          type: 'image/png',
        },
      ],
    },
    {
      name: 'Receive Bitcoin',
      shortName: 'Receive',
      description: 'Receive Bitcoin from another address',
      url: '/receive',
      icons: [
        {
          src: '/assets/icons/icon-96x96.png',
          sizes: '96x96',
          type: 'image/png',
        },
      ],
    },
  ],
  screenshots: [
    {
      src: '/assets/screenshots/desktop.png',
      sizes: '1280x720',
      type: 'image/png',
      formFactor: 'wide',
      label: 'Desktop view of the Bitcoin Wallet',
    },
    {
      src: '/assets/screenshots/mobile.png',
      sizes: '390x844',
      type: 'image/png',
      formFactor: 'narrow',
      label: 'Mobile view of the Bitcoin Wallet',
    },
  ],
  shareTarget: {
    action: '/share',
    method: 'POST',
    enctype: 'application/x-www-form-urlencoded',
    params: {
      title: 'title',
      text: 'text',
      url: 'url',
    },
  },
  protocolHandlers: [
    {
      protocol: 'bitcoin',
      url: '/handle-bitcoin?%s',
    },
  ],
  fileHandlers: [
    {
      action: '/handle-file',
      accept: {
        'application/json': ['.json'],
        'text/plain': ['.txt'],
      },
    },
  ],
  scopeExtensions: ['https://blockstream.info', 'https://mempool.space'],
  handleLinks: 'preferred',
  launchHandler: {
    clientMode: 'navigate-existing',
  },
};

// PWA Manifest Generator Class
export class PWAManifestGenerator {
  private config: PWAManifestConfig;
  private assetManager: PWAAssetManager;

  constructor(
    config: Partial<PWAManifestConfig> = {},
    assetManager: PWAAssetManager = new PWAAssetManager()
  ) {
    this.config = { ...DEFAULT_PWA_MANIFEST_CONFIG, ...config };
    this.assetManager = assetManager;
  }

  /**
   * Generate a complete PWA manifest
   */
  public generateManifest(): ExtendedWebAppManifest {
    let manifestAssets: ReturnType<PWAAssetManager['generateManifestAssets']>;
    try {
      manifestAssets = this.assetManager.generateManifestAssets();
    } catch (error) {
      // Gracefully handle asset manager errors by falling back to empty assets
      manifestAssets = {
        icons: [],
        appleTouchIcons: [],
        favicon: {
          src: '/favicon-32x32.png',
          sizes: '32x32',
          type: 'image/png',
        },
        splashScreens: [],
        appleSplashScreens: [],
      } as any;
    }

    return {
      name: this.config.name,
      short_name: this.config.shortName,
      description: this.config.description,
      start_url: this.config.startUrl,
      scope: this.config.scope,
      display: this.config.display,
      orientation: this.config.orientation,
      theme_color: this.config.themeColor,
      background_color: this.config.backgroundColor,
      categories: this.config.categories,
      lang: this.config.lang,
      dir: this.config.dir,
      prefer_related_applications: this.config.preferRelatedApplications,
      related_applications: this.config.relatedApplications,
      icons: manifestAssets.icons,
      shortcuts: this.config.shortcuts,
      screenshots: this.config.screenshots,
      iarc_rating_id: this.config.iarcRatingId,
      share_target: this.config.shareTarget,
      protocol_handlers: this.config.protocolHandlers,
      file_handlers: this.config.fileHandlers,
      scope_extensions: this.config.scopeExtensions,
      handle_links: this.config.handleLinks,
      launch_handler: this.config.launchHandler
        ? {
            client_mode: this.config.launchHandler.clientMode,
          }
        : undefined,
      edge_side_panel: this.config.edgeSidePanel
        ? {
            preferred_width: this.config.edgeSidePanel.preferredWidth,
          }
        : undefined,
    };
  }

  /**
   * Generate a Bitcoin-specific PWA manifest
   */
  public generateBitcoinManifest(): ExtendedWebAppManifest {
    const bitcoinConfig: PWAManifestConfig = {
      ...this.config,
      name: 'Bitcoin Wallet PWA',
      shortName: 'BTC Wallet',
      description: 'A secure, open-source Bitcoin wallet Progressive Web App',
      themeColor: '#f7931a',
      backgroundColor: '#ffffff',
      categories: ['finance', 'utilities', 'cryptocurrency'],
      shortcuts: [
        {
          name: 'Send Bitcoin',
          shortName: 'Send',
          description: 'Send Bitcoin to another address',
          url: '/send',
          icons: [
            {
              src: this.assetManager.getIconPath('icon-96x96.png'),
              sizes: '96x96',
              type: 'image/png',
            },
          ],
        },
        {
          name: 'Receive Bitcoin',
          shortName: 'Receive',
          description: 'Receive Bitcoin from another address',
          url: '/receive',
          icons: [
            {
              src: this.assetManager.getIconPath('icon-96x96.png'),
              sizes: '96x96',
              type: 'image/png',
            },
          ],
        },
        {
          name: 'Transaction History',
          shortName: 'History',
          description: 'View your Bitcoin transaction history',
          url: '/history',
          icons: [
            {
              src: this.assetManager.getIconPath('icon-96x96.png'),
              sizes: '96x96',
              type: 'image/png',
            },
          ],
        },
      ],
      protocolHandlers: [
        {
          protocol: 'bitcoin',
          url: '/handle-bitcoin?%s',
        },
        {
          protocol: 'lightning',
          url: '/handle-lightning?%s',
        },
      ],
      fileHandlers: [
        {
          action: '/handle-file',
          accept: {
            'application/json': ['.json'],
            'text/plain': ['.txt'],
            'application/bitcoin-transaction': ['.txn', '.hex'],
            'application/bitcoin-psbt': ['.psbt'],
          },
        },
      ],
      scopeExtensions: [
        'https://blockstream.info',
        'https://mempool.space',
        'https://blockchain.info',
        'https://live.blockcypher.com',
      ],
    };

    this.config = bitcoinConfig;
    return this.generateManifest();
  }

  /**
   * Generate minimal manifest (without complex features)
   */
  public generateMinimalManifest(): ExtendedWebAppManifest {
    const minimalConfig: PWAManifestConfig = {
      ...this.config,
      shortcuts: undefined,
      screenshots: undefined,
      shareTarget: undefined,
      protocolHandlers: undefined,
      fileHandlers: undefined,
      scopeExtensions: undefined,
      edgeSidePanel: undefined,
    };

    this.config = minimalConfig;
    return this.generateManifest();
  }

  /**
   * Generate manifest as JSON string
   */
  public generateManifestJSON(): string {
    const manifest = this.generateManifest();
    return JSON.stringify(manifest, null, 2);
  }

  /**
   * Generate manifest as JSON string with Bitcoin theme
   */
  public generateBitcoinManifestJSON(): string {
    const manifest = this.generateBitcoinManifest();
    return JSON.stringify(manifest, null, 2);
  }

  /**
   * Generate manifest as JSON string with minimal configuration
   */
  public generateMinimalManifestJSON(): string {
    const manifest = this.generateMinimalManifest();
    return JSON.stringify(manifest, null, 2);
  }

  /**
   * Generate HTML link tag for manifest
   */
  public generateManifestLinkTag(): string {
    return '<link rel="manifest" href="/manifest.json">';
  }

  /**
   * Generate HTML meta tags for PWA
   */
  public generatePWAMetaTags(): string[] {
    const metaTags: string[] = [];
    let manifestAssets: ReturnType<PWAAssetManager['generateManifestAssets']>;
    try {
      manifestAssets = this.assetManager.generateManifestAssets();
    } catch {
      // Fallback to minimal tags without asset-derived links
      manifestAssets = {
        icons: [],
        appleTouchIcons: [],
        favicon: {
          src: '/favicon-32x32.png',
          sizes: '32x32',
          type: 'image/png',
        },
        splashScreens: [],
        appleSplashScreens: [],
      } as any;
    }

    // Basic PWA meta tags
    metaTags.push(
      '<meta name="application-name" content="' + this.config.name + '">'
    );
    metaTags.push(
      '<meta name="apple-mobile-web-app-title" content="' +
        this.config.shortName +
        '">'
    );
    metaTags.push(
      '<meta name="description" content="' + this.config.description + '">'
    );
    metaTags.push(
      '<meta name="theme-color" content="' + this.config.themeColor + '">'
    );
    metaTags.push(
      '<meta name="msapplication-TileColor" content="' +
        this.config.themeColor +
        '">'
    );
    metaTags.push(
      '<meta name="msapplication-config" content="/browserconfig.xml">'
    );

    // Apple-specific meta tags
    metaTags.push('<meta name="apple-mobile-web-app-capable" content="yes">');
    metaTags.push(
      '<meta name="apple-mobile-web-app-status-bar-style" content="default">'
    );
    metaTags.push(
      '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'
    );

    // Viewport meta tag
    metaTags.push(
      '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">'
    );

    // Format detection
    metaTags.push('<meta name="format-detection" content="telephone=no">');

    return metaTags;
  }

  /**
   * Generate complete HTML head section for PWA
   */
  public generatePWAHTMLHead(): string {
    const manifestLink = this.generateManifestLinkTag();
    const metaTags = this.generatePWAMetaTags();
    let assetMetaTags: string[] = [];
    let preloadTags: string[] = [];
    try {
      assetMetaTags = this.assetManager.generateHTMLMetaTags();
      preloadTags = this.assetManager.generatePreloadTags();
    } catch {
      assetMetaTags = [];
      preloadTags = [];
    }

    const headContent = [
      '<!-- PWA Meta Tags -->',
      ...metaTags,
      '<!-- PWA Manifest Link -->',
      manifestLink,
      '<!-- PWA Asset Meta Tags -->',
      ...assetMetaTags,
      ...preloadTags,
    ].join('\n  ');

    return `  ${headContent}`;
  }

  /**
   * Validate the generated manifest
   */
  public validateManifest(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const manifest = this.generateManifest();

    // Required fields validation
    if (!manifest.name) {
      errors.push('Manifest must have a name');
    }

    if (!manifest.short_name) {
      errors.push('Manifest must have a short_name');
    }

    if (!manifest.start_url) {
      errors.push('Manifest must have a start_url');
    }

    if (!manifest.display) {
      errors.push('Manifest must have a display mode');
    }

    if (!manifest.icons || manifest.icons.length === 0) {
      errors.push('Manifest must have at least one icon');
    }

    // Icon size validation
    const has192Icon = manifest.icons?.some(
      (icon: any) => icon.sizes === '192x192'
    );
    const has512Icon = manifest.icons?.some(
      (icon: any) => icon.sizes === '512x512'
    );

    if (!has192Icon) {
      warnings.push('Recommended: Include a 192x192 icon for Android');
    }

    if (!has512Icon) {
      warnings.push('Recommended: Include a 512x512 icon for Android');
    }

    // Theme color validation
    if (!manifest.theme_color) {
      warnings.push('Recommended: Include a theme_color for the browser UI');
    }

    if (!manifest.background_color) {
      warnings.push(
        'Recommended: Include a background_color for the splash screen'
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get manifest information for debugging
   */
  public getManifestInfo(): {
    config: PWAManifestConfig;
    assetCount: number;
    validation: { isValid: boolean; errors: string[]; warnings: string[] };
  } {
    const manifestAssets = this.assetManager.generateManifestAssets();
    const validation = this.validateManifest();

    return {
      config: this.config,
      assetCount:
        manifestAssets.icons.length + manifestAssets.splashScreens.length,
      validation,
    };
  }
}

// Default manifest generator instance
export const pwaManifestGenerator = new PWAManifestGenerator();

// Utility functions for common manifest operations
export function generatePWAManifest(
  config?: Partial<PWAManifestConfig>
): ExtendedWebAppManifest {
  return pwaManifestGenerator.generateManifest();
}

export function generateBitcoinPWAManifest(
  config?: Partial<PWAManifestConfig>
): ExtendedWebAppManifest {
  return pwaManifestGenerator.generateBitcoinManifest();
}

export function generateMinimalPWAManifest(
  config?: Partial<PWAManifestConfig>
): ExtendedWebAppManifest {
  return pwaManifestGenerator.generateMinimalManifest();
}

export function generatePWAManifestJSON(
  config?: Partial<PWAManifestConfig>
): string {
  return pwaManifestGenerator.generateManifestJSON();
}

export function generateBitcoinPWAManifestJSON(
  config?: Partial<PWAManifestConfig>
): string {
  return pwaManifestGenerator.generateBitcoinManifestJSON();
}

export function generateMinimalPWAManifestJSON(
  config?: Partial<PWAManifestConfig>
): string {
  return pwaManifestGenerator.generateMinimalManifestJSON();
}

export function generatePWAManifestLinkTag(): string {
  return pwaManifestGenerator.generateManifestLinkTag();
}

export function generatePWAMetaTags(): string[] {
  return pwaManifestGenerator.generatePWAMetaTags();
}

export function generatePWAHTMLHead(): string {
  return pwaManifestGenerator.generatePWAHTMLHead();
}

export function validatePWAManifest(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  return pwaManifestGenerator.validateManifest();
}

export function getPWAManifestInfo(): {
  config: PWAManifestConfig;
  assetCount: number;
  validation: { isValid: boolean; errors: string[]; warnings: string[] };
} {
  return pwaManifestGenerator.getManifestInfo();
}
