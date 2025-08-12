import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PWAAssetManager,
  PWA_ICON_SIZES,
  PWA_SPLASH_SIZES,
  DEFAULT_PWA_ASSET_CONFIG,
  getPWAIconPath,
  getPWASplashPath,
  generatePWAManifestIcons,
  generatePWAManifestSplashScreens,
  generatePWAManifestAssets,
  validatePWAAssets,
  getPWAAssetInfo,
} from '../utils/pwa-assets';

describe('PWA Asset Management', () => {
  let assetManager: PWAAssetManager;

  beforeEach(() => {
    assetManager = new PWAAssetManager();
  });

  describe('Asset Constants', () => {
    it('should export all required icon sizes', () => {
      expect(PWA_ICON_SIZES).toBeDefined();
      expect(Object.keys(PWA_ICON_SIZES)).toContain('192x192');
      expect(Object.keys(PWA_ICON_SIZES)).toContain('512x512');
      expect(Object.keys(PWA_ICON_SIZES)).toContain('180x180');
    });

    it('should export all required splash screen sizes', () => {
      expect(PWA_SPLASH_SIZES).toBeDefined();
      expect(Object.keys(PWA_SPLASH_SIZES)).toContain('1125x2436');
      expect(Object.keys(PWA_SPLASH_SIZES)).toContain('1242x2688');
      expect(Object.keys(PWA_SPLASH_SIZES)).toContain('1290x2796');
    });

    it('should have default asset configuration', () => {
      expect(DEFAULT_PWA_ASSET_CONFIG).toBeDefined();
      expect(DEFAULT_PWA_ASSET_CONFIG.baseUrl).toBe('');
      expect(DEFAULT_PWA_ASSET_CONFIG.iconPath).toBe('/assets/icons/');
      expect(DEFAULT_PWA_ASSET_CONFIG.splashPath).toBe('/assets/splash/');
    });
  });

  describe('PWAAssetManager', () => {
    it('should initialize with default configuration', () => {
      expect(assetManager.config.baseUrl).toBe('');
      expect(assetManager.config.iconPath).toBe('/assets/icons/');
      expect(assetManager.config.splashPath).toBe('/assets/splash/');
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        baseUrl: 'https://example.com',
        iconPath: '/custom/icons/',
        splashPath: '/custom/splash/',
      };

      const customManager = new PWAAssetManager(customConfig);
      expect(customManager.config.baseUrl).toBe('https://example.com');
      expect(customManager.config.iconPath).toBe('/custom/icons/');
      expect(customManager.config.splashPath).toBe('/custom/splash/');
    });

    it('should get icon path correctly', () => {
      const iconPath = assetManager.getIconPath('icon-192x192.png');
      expect(iconPath).toBe('/assets/icons/icon-192x192.png');
    });

    it('should get splash path correctly', () => {
      const splashPath = assetManager.getSplashPath('splash-1125x2436.png');
      expect(splashPath).toBe('/assets/splash/splash-1125x2436.png');
    });

    it('should handle baseUrl in paths', () => {
      const customManager = new PWAAssetManager({
        baseUrl: 'https://example.com',
      });
      const iconPath = customManager.getIconPath('icon-192x192.png');
      expect(iconPath).toBe(
        'https://example.com/assets/icons/icon-192x192.png'
      );
    });

    it('should generate manifest icons correctly', () => {
      const manifestIcons = assetManager.generateManifestIcons();

      expect(manifestIcons).toBeDefined();
      expect(manifestIcons.icons).toBeInstanceOf(Array);
      expect(manifestIcons.icons.length).toBeGreaterThan(0);

      // Check for required icons
      const has192Icon = manifestIcons.icons.some(
        (icon) => icon.sizes === '192x192'
      );
      const has512Icon = manifestIcons.icons.some(
        (icon) => icon.sizes === '512x512'
      );

      expect(has192Icon).toBe(true);
      expect(has512Icon).toBe(true);
    });

    it('should generate manifest splash screens correctly', () => {
      const manifestSplashScreens =
        assetManager.generateManifestSplashScreens();

      expect(manifestSplashScreens).toBeDefined();
      expect(manifestSplashScreens.splashScreens).toBeInstanceOf(Array);
      expect(manifestSplashScreens.splashScreens.length).toBeGreaterThan(0);

      // Check for required splash screens
      const has1125Splash = manifestSplashScreens.splashScreens.some(
        (splash) => splash.sizes === '1125x2436'
      );
      const has1242Splash = manifestSplashScreens.splashScreens.some(
        (splash) => splash.sizes === '1242x2688'
      );

      expect(has1125Splash).toBe(true);
      expect(has1242Splash).toBe(true);
    });

    it('should generate complete manifest assets', () => {
      const manifestAssets = assetManager.generateManifestAssets();

      expect(manifestAssets).toBeDefined();
      expect(manifestAssets.icons).toBeInstanceOf(Array);
      expect(manifestAssets.splashScreens).toBeInstanceOf(Array);
      expect(manifestAssets.favicon).toBeDefined();
      expect(manifestAssets.appleTouchIcons).toBeInstanceOf(Array);
      expect(manifestAssets.appleSplashScreens).toBeInstanceOf(Array);
    });

    it('should generate HTML meta tags correctly', () => {
      const metaTags = assetManager.generateHTMLMetaTags();

      expect(metaTags).toBeInstanceOf(Array);
      expect(metaTags.length).toBeGreaterThan(0);

      // Check for required meta tags
      const hasFavicon = metaTags.some((tag) => tag.includes('rel="icon"'));
      const hasAppleTouchIcon = metaTags.some((tag) =>
        tag.includes('rel="apple-touch-icon"')
      );

      expect(hasFavicon).toBe(true);
      expect(hasAppleTouchIcon).toBe(true);
    });

    it('should generate PWA CSS correctly', () => {
      const css = assetManager.generatePWACSS();

      expect(css).toBeDefined();
      expect(typeof css).toBe('string');
      expect(css.length).toBeGreaterThan(0);

      // Check for CSS content
      expect(css).toContain('/* PWA Asset CSS */');
      expect(css).toContain('background-image:');
    });

    it('should generate preload tags correctly', () => {
      const preloadTags = assetManager.generatePreloadTags();

      expect(preloadTags).toBeInstanceOf(Array);
      expect(preloadTags.length).toBeGreaterThan(0);

      // Check for preload tags
      const hasIconPreload = preloadTags.some(
        (tag) => tag.includes('rel="preload"') && tag.includes('as="image"')
      );
      expect(hasIconPreload).toBe(true);
    });

    it('should validate assets correctly', () => {
      const validation = assetManager.validateAssets();

      expect(validation).toBeDefined();
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');

      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should get asset info correctly', () => {
      const assetInfo = assetManager.getAssetInfo();

      expect(assetInfo).toBeDefined();
      expect(assetInfo).toHaveProperty('icons');
      expect(assetInfo).toHaveProperty('splashScreens');
      expect(assetInfo).toHaveProperty('totalSize');

      expect(Array.isArray(assetInfo.icons)).toBe(true);
      expect(Array.isArray(assetInfo.splashScreens)).toBe(true);
      expect(typeof assetInfo.totalSize).toBe('number');
    });
  });

  describe('Utility Functions', () => {
    it('should generate icon path correctly', () => {
      const iconPath = getPWAIconPath('icon-192x192.png');
      expect(iconPath).toBe('/assets/icons/icon-192x192.png');
    });

    it('should generate splash path correctly', () => {
      const splashPath = getPWASplashPath('splash-1125x2436.png');
      expect(splashPath).toBe('/assets/splash/splash-1125x2436.png');
    });

    it('should generate manifest icons correctly', () => {
      const manifestIcons = generatePWAManifestIcons();

      expect(manifestIcons).toBeDefined();
      expect(manifestIcons.icons).toBeInstanceOf(Array);
      expect(manifestIcons.icons.length).toBeGreaterThan(0);
    });

    it('should generate manifest splash screens correctly', () => {
      const manifestSplashScreens = generatePWAManifestSplashScreens();

      expect(manifestSplashScreens).toBeDefined();
      expect(manifestSplashScreens.splashScreens).toBeInstanceOf(Array);
      expect(manifestSplashScreens.splashScreens.length).toBeGreaterThan(0);
    });

    it('should generate complete manifest assets correctly', () => {
      const manifestAssets = generatePWAManifestAssets();

      expect(manifestAssets).toBeDefined();
      expect(manifestAssets.icons).toBeInstanceOf(Array);
      expect(manifestAssets.splashScreens).toBeInstanceOf(Array);
    });

    it('should validate assets correctly', () => {
      const validation = validatePWAAssets();

      expect(validation).toBeDefined();
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
    });

    it('should get asset info correctly', () => {
      const assetInfo = getPWAAssetInfo();

      expect(assetInfo).toBeDefined();
      expect(assetInfo).toHaveProperty('icons');
      expect(assetInfo).toHaveProperty('splashScreens');
      expect(assetInfo).toHaveProperty('totalSize');
    });
  });

  describe('Asset Validation', () => {
    it('should validate required icons', () => {
      const validation = assetManager.validateAssets();

      // Should have warnings about missing files (since we're in test environment)
      expect(validation.isValid).toBe(true); // Basic validation should pass
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should validate required splash screens', () => {
      const validation = assetManager.validateAssets();

      // Should have warnings about missing files (since we're in test environment)
      expect(validation.isValid).toBe(true); // Basic validation should pass
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid icon filenames gracefully', () => {
      expect(() => assetManager.getIconPath('')).not.toThrow();
      expect(() => assetManager.getIconPath('invalid')).not.toThrow();
    });

    it('should handle invalid splash filenames gracefully', () => {
      expect(() => assetManager.getSplashPath('')).not.toThrow();
      expect(() => assetManager.getSplashPath('invalid')).not.toThrow();
    });

    it('should handle missing configuration gracefully', () => {
      const emptyManager = new PWAAssetManager({});
      expect(() => emptyManager.getIconPath('icon-192x192.png')).not.toThrow();
      expect(() =>
        emptyManager.getSplashPath('splash-1125x2436.png')
      ).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should generate manifest assets quickly', () => {
      const startTime = performance.now();
      assetManager.generateManifestAssets();
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should generate HTML meta tags quickly', () => {
      const startTime = performance.now();
      assetManager.generateHTMLMetaTags();
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50); // Should complete in less than 50ms
    });
  });
});
