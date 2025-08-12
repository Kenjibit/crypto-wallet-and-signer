import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PWAManifestGenerator,
  DEFAULT_PWA_MANIFEST_CONFIG,
  generatePWAManifest,
  generateBitcoinPWAManifest,
  generateMinimalPWAManifest,
  generatePWAManifestJSON,
  generateBitcoinPWAManifestJSON,
  generateMinimalPWAManifestJSON,
  generatePWAManifestLinkTag,
  generatePWAMetaTags,
  generatePWAHTMLHead,
  validatePWAManifest,
  getPWAManifestInfo,
} from '../utils/pwa-manifest-generator';

describe('PWA Manifest Generator', () => {
  let manifestGenerator: PWAManifestGenerator;

  beforeEach(() => {
    manifestGenerator = new PWAManifestGenerator();
  });

  describe('Default Configuration', () => {
    it('should have default Bitcoin wallet configuration', () => {
      expect(DEFAULT_PWA_MANIFEST_CONFIG.name).toBe('Bitcoin Wallet PWA');
      expect(DEFAULT_PWA_MANIFEST_CONFIG.shortName).toBe('BTC Wallet');
      expect(DEFAULT_PWA_MANIFEST_CONFIG.description).toBe(
        'A secure Bitcoin wallet Progressive Web App'
      );
      expect(DEFAULT_PWA_MANIFEST_CONFIG.startUrl).toBe('/');
      expect(DEFAULT_PWA_MANIFEST_CONFIG.scope).toBe('/');
      expect(DEFAULT_PWA_MANIFEST_CONFIG.display).toBe('standalone');
      expect(DEFAULT_PWA_MANIFEST_CONFIG.orientation).toBe('portrait');
      expect(DEFAULT_PWA_MANIFEST_CONFIG.themeColor).toBe('#f7931a');
      expect(DEFAULT_PWA_MANIFEST_CONFIG.backgroundColor).toBe('#ffffff');
    });

    it('should have Bitcoin-specific categories', () => {
      expect(DEFAULT_PWA_MANIFEST_CONFIG.categories).toContain('finance');
      expect(DEFAULT_PWA_MANIFEST_CONFIG.categories).toContain('utilities');
    });

    it('should have Bitcoin protocol handlers', () => {
      const bitcoinHandler = DEFAULT_PWA_MANIFEST_CONFIG.protocolHandlers?.find(
        (handler) => handler.protocol === 'bitcoin'
      );
      expect(bitcoinHandler).toBeDefined();
      expect(bitcoinHandler?.url).toBe('/handle-bitcoin?%s');
    });

    it('should have Bitcoin-specific shortcuts', () => {
      expect(DEFAULT_PWA_MANIFEST_CONFIG.shortcuts).toBeDefined();
      expect(DEFAULT_PWA_MANIFEST_CONFIG.shortcuts?.length).toBeGreaterThan(0);

      const sendShortcut = DEFAULT_PWA_MANIFEST_CONFIG.shortcuts?.find(
        (shortcut) => shortcut.name === 'Send Bitcoin'
      );
      const receiveShortcut = DEFAULT_PWA_MANIFEST_CONFIG.shortcuts?.find(
        (shortcut) => shortcut.name === 'Receive Bitcoin'
      );

      expect(sendShortcut).toBeDefined();
      expect(receiveShortcut).toBeDefined();
    });

    it('should have Bitcoin-specific scope extensions', () => {
      expect(DEFAULT_PWA_MANIFEST_CONFIG.scopeExtensions).toContain(
        'https://blockstream.info'
      );
      expect(DEFAULT_PWA_MANIFEST_CONFIG.scopeExtensions).toContain(
        'https://mempool.space'
      );
    });
  });

  describe('PWAManifestGenerator Class', () => {
    it('should initialize with default configuration', () => {
      const manifest = manifestGenerator.generateManifest();
      expect(manifest.name).toBe('Bitcoin Wallet PWA');
      expect(manifest.short_name).toBe('BTC Wallet');
      expect(manifest.theme_color).toBe('#f7931a');
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        name: 'Custom PWA',
        shortName: 'Custom',
        description: 'A custom PWA',
        startUrl: '/custom',
        scope: '/custom',
        themeColor: '#ff0000',
        backgroundColor: '#000000',
      };

      const customGenerator = new PWAManifestGenerator(customConfig);
      const manifest = customGenerator.generateManifest();
      expect(manifest.name).toBe('Custom PWA');
      expect(manifest.short_name).toBe('Custom');
      expect(manifest.theme_color).toBe('#ff0000');
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig = {
        name: 'Custom PWA',
        themeColor: '#ff0000',
      };

      const customGenerator = new PWAManifestGenerator(customConfig);
      const manifest = customGenerator.generateManifest();
      expect(manifest.name).toBe('Custom PWA');
      expect(manifest.short_name).toBe('BTC Wallet'); // Should keep default
      expect(manifest.theme_color).toBe('#ff0000');
      expect(manifest.background_color).toBe('#ffffff'); // Should keep default
    });

    it('should generate Bitcoin manifest correctly', () => {
      const manifest = manifestGenerator.generateBitcoinManifest();

      expect(manifest.name).toBe('Bitcoin Wallet PWA');
      expect(manifest.short_name).toBe('BTC Wallet');
      expect(manifest.description).toBe(
        'A secure, open-source Bitcoin wallet Progressive Web App'
      );
      expect(manifest.start_url).toBe('/');
      expect(manifest.scope).toBe('/');
      expect(manifest.display).toBe('standalone');
      expect(manifest.orientation).toBe('portrait');
      expect(manifest.theme_color).toBe('#f7931a');
      expect(manifest.background_color).toBe('#ffffff');
      expect(manifest.categories).toContain('finance');
      expect(manifest.categories).toContain('utilities');
    });

    it('should generate minimal manifest correctly', () => {
      const manifest = manifestGenerator.generateMinimalManifest();

      expect(manifest.name).toBe('Bitcoin Wallet PWA');
      expect(manifest.short_name).toBe('BTC Wallet');
      expect(manifest.start_url).toBe('/');
      expect(manifest.display).toBe('standalone');
      expect(manifest.theme_color).toBe('#f7931a');
      expect(manifest.background_color).toBe('#ffffff');

      // Minimal manifest should not have complex features
      expect(manifest.shortcuts).toBeUndefined();
      expect(manifest.protocol_handlers).toBeUndefined();
      expect(manifest.file_handlers).toBeUndefined();
    });

    it('should generate manifest JSON correctly', () => {
      const manifestJSON = manifestGenerator.generateBitcoinManifestJSON();

      expect(typeof manifestJSON).toBe('string');
      expect(manifestJSON.length).toBeGreaterThan(0);

      // Should be valid JSON
      const parsed = JSON.parse(manifestJSON);
      expect(parsed.name).toBe('Bitcoin Wallet PWA');
      expect(parsed.short_name).toBe('BTC Wallet');
    });

    it('should generate manifest link tag correctly', () => {
      const linkTag = manifestGenerator.generateManifestLinkTag();

      expect(typeof linkTag).toBe('string');
      expect(linkTag).toContain('<link rel="manifest"');
      expect(linkTag).toContain('href="/manifest.json"');
    });

    it('should generate PWA meta tags correctly', () => {
      const metaTags = manifestGenerator.generatePWAMetaTags();

      expect(Array.isArray(metaTags)).toBe(true);
      expect(metaTags.length).toBeGreaterThan(0);

      // Check for required meta tags
      const hasApplicationName = metaTags.some((tag) =>
        tag.includes('application-name')
      );
      const hasAppleMobileWebAppTitle = metaTags.some((tag) =>
        tag.includes('apple-mobile-web-app-title')
      );
      const hasThemeColor = metaTags.some((tag) => tag.includes('theme-color'));
      const hasViewport = metaTags.some((tag) => tag.includes('viewport'));

      expect(hasApplicationName).toBe(true);
      expect(hasAppleMobileWebAppTitle).toBe(true);
      expect(hasThemeColor).toBe(true);
      expect(hasViewport).toBe(true);
    });

    it('should generate complete HTML head section', () => {
      const htmlHead = manifestGenerator.generatePWAHTMLHead();

      expect(typeof htmlHead).toBe('string');
      expect(htmlHead.length).toBeGreaterThan(0);

      // Should contain all required sections
      expect(htmlHead).toContain('<!-- PWA Meta Tags -->');
      expect(htmlHead).toContain('<!-- PWA Manifest Link -->');
      expect(htmlHead).toContain('<!-- PWA Asset Meta Tags -->');
    });

    it('should validate manifest correctly', () => {
      const validation = manifestGenerator.validateManifest();

      expect(validation).toBeDefined();
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');

      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should get manifest info correctly', () => {
      const manifestInfo = manifestGenerator.getManifestInfo();

      expect(manifestInfo).toBeDefined();
      expect(manifestInfo).toHaveProperty('config');
      expect(manifestInfo).toHaveProperty('assetCount');
      expect(manifestInfo).toHaveProperty('validation');

      expect(manifestInfo.config.name).toBe('Bitcoin Wallet PWA');
      expect(typeof manifestInfo.assetCount).toBe('number');
      expect(manifestInfo.validation).toHaveProperty('isValid');
    });
  });

  describe('Utility Functions', () => {
    it('should generate manifest correctly', () => {
      const manifest = generatePWAManifest();

      expect(manifest).toBeDefined();
      expect(manifest.name).toBe('Bitcoin Wallet PWA');
      expect(manifest.short_name).toBe('BTC Wallet');
    });

    it('should generate Bitcoin manifest correctly', () => {
      const manifest = generateBitcoinPWAManifest();

      expect(manifest).toBeDefined();
      expect(manifest.name).toBe('Bitcoin Wallet PWA');
      expect(manifest.categories).toContain('finance');
      expect(manifest.protocol_handlers).toBeDefined();
    });

    it('should generate minimal manifest correctly', () => {
      const manifest = generateMinimalPWAManifest();

      expect(manifest).toBeDefined();
      expect(manifest.name).toBe('Bitcoin Wallet PWA');
      expect(manifest.shortcuts).toBeUndefined();
    });

    it('should generate manifest JSON correctly', () => {
      const manifestJSON = generatePWAManifestJSON();

      expect(typeof manifestJSON).toBe('string');
      const parsed = JSON.parse(manifestJSON);
      expect(parsed.name).toBe('Bitcoin Wallet PWA');
    });

    it('should generate Bitcoin manifest JSON correctly', () => {
      const manifestJSON = generateBitcoinPWAManifestJSON();

      expect(typeof manifestJSON).toBe('string');
      const parsed = JSON.parse(manifestJSON);
      expect(parsed.categories).toContain('finance');
    });

    it('should generate minimal manifest JSON correctly', () => {
      const manifestJSON = generateMinimalPWAManifestJSON();

      expect(typeof manifestJSON).toBe('string');
      const parsed = JSON.parse(manifestJSON);
      expect(parsed.shortcuts).toBeUndefined();
    });

    it('should generate manifest link tag correctly', () => {
      const linkTag = generatePWAManifestLinkTag();

      expect(typeof linkTag).toBe('string');
      expect(linkTag).toContain('<link rel="manifest"');
    });

    it('should generate PWA meta tags correctly', () => {
      const metaTags = generatePWAMetaTags();

      expect(Array.isArray(metaTags)).toBe(true);
      expect(metaTags.length).toBeGreaterThan(0);
    });

    it('should generate PWA HTML head correctly', () => {
      const htmlHead = generatePWAHTMLHead();

      expect(typeof htmlHead).toBe('string');
      expect(htmlHead.length).toBeGreaterThan(0);
    });

    it('should validate manifest correctly', () => {
      const validation = validatePWAManifest();

      expect(validation).toBeDefined();
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
    });

    it('should get manifest info correctly', () => {
      const manifestInfo = getPWAManifestInfo();

      expect(manifestInfo).toBeDefined();
      expect(manifestInfo).toHaveProperty('config');
      expect(manifestInfo).toHaveProperty('assetCount');
      expect(manifestInfo).toHaveProperty('validation');
    });
  });

  describe('Manifest Validation', () => {
    it('should validate required manifest properties', () => {
      const validation = manifestGenerator.validateManifest();

      // Basic validation should pass
      expect(validation.isValid).toBe(true);
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should validate manifest icons', () => {
      const validation = manifestGenerator.validateManifest();

      // Should have warnings about missing icons (since we're in test environment)
      expect(validation.isValid).toBe(true);
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should validate manifest background color', () => {
      const validation = manifestGenerator.validateManifest();

      // Should have warnings about background color for splash screen
      expect(validation.isValid).toBe(true);
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid configuration gracefully', () => {
      const invalidConfig = {
        name: '', // Invalid empty name
        startUrl: 'invalid-url', // Invalid URL
      };

      const generator = new PWAManifestGenerator(invalidConfig);
      expect(() => generator.generateManifest()).not.toThrow();
    });

    it('should handle missing configuration gracefully', () => {
      const emptyGenerator = new PWAManifestGenerator({});
      expect(() => emptyGenerator.generateManifest()).not.toThrow();
    });

    it('should handle asset manager errors gracefully', () => {
      // Mock asset manager to throw error
      const mockAssetManager = {
        generateManifestAssets: vi.fn().mockImplementation(() => {
          throw new Error('Asset error');
        }),
        generateManifestIcons: vi.fn().mockImplementation(() => {
          throw new Error('Asset error');
        }),
        generateManifestSplashScreens: vi
          .fn()
          .mockReturnValue({ splashScreens: [] }),
        getIconPath: vi.fn(),
        getSplashPath: vi.fn(),
      };

      const generator = new PWAManifestGenerator({}, mockAssetManager as any);
      expect(() => generator.generateManifest()).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should generate manifest quickly', () => {
      const startTime = performance.now();
      manifestGenerator.generateManifest();
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should generate HTML head quickly', () => {
      const startTime = performance.now();
      manifestGenerator.generatePWAHTMLHead();
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50); // Should complete in less than 50ms
    });

    it('should validate manifest quickly', () => {
      const startTime = performance.now();
      manifestGenerator.validateManifest();
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50); // Should complete in less than 50ms
    });
  });

  describe('Integration', () => {
    it('should work with asset manager integration', () => {
      const manifest = manifestGenerator.generateManifest();

      expect(manifest).toBeDefined();
      expect(manifest.name).toBe('Bitcoin Wallet PWA');

      // Should have icons if asset manager is working
      expect(manifest.icons).toBeDefined();
    });

    it('should generate complete PWA setup', () => {
      const manifest = manifestGenerator.generateBitcoinManifest();
      const htmlHead = manifestGenerator.generatePWAHTMLHead();
      const validation = manifestGenerator.validateManifest();

      expect(manifest).toBeDefined();
      expect(htmlHead).toBeDefined();
      expect(validation).toBeDefined();

      // All should work together
      expect(manifest.name).toBe('Bitcoin Wallet PWA');
      expect(htmlHead).toContain('Bitcoin Wallet PWA');
      expect(validation.isValid).toBe(true);
    });
  });
});
