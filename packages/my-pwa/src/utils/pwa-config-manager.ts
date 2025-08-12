// PWA Configuration Manager
import {
  PWAAdvancedConfig,
  PWAConfigManager,
  PWAConfigValidationSchema,
} from '../types';

/**
 * Default PWA configuration
 */
export const DEFAULT_PWA_CONFIG: PWAAdvancedConfig = {
  serviceWorker: {
    path: '/sw.js',
    scope: '/',
    updateCheckInterval: 300000, // 5 minutes
    enableUpdateNotifications: true,
    enableBackgroundSync: true,
    enablePushNotifications: false,
  },
  cache: {
    strategy: 'stale-while-revalidate',
    maxAge: 86400, // 24 hours
    maxEntries: 100,
    enableRuntimeCaching: true,
    precacheRoutes: ['/', '/offline'],
  },
  installation: {
    enableAutoPrompt: false,
    promptDelay: 5000, // 5 seconds
    showOnFirstVisit: true,
    maxPromptCount: 3,
    enableIOSInstructions: true,
    enableAndroidInstructions: true,
  },
  offline: {
    enableOfflineDetection: true,
    offlineMessage: "You're offline. Some features may not be available.",
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
    enableOfflineAnalytics: true,
  },
  performance: {
    enablePreloading: true,
    enableLazyLoading: true,
    enableImageOptimization: true,
    enableCodeSplitting: true,
    maxBundleSize: 1024 * 1024, // 1MB
  },
  analytics: {
    enablePWAEvents: true,
    enableInstallTracking: true,
    enableOfflineTracking: true,
    enablePerformanceTracking: true,
    customEvents: [],
  },
  security: {
    enableHTTPSRedirect: true,
    enableCSP: false,
    enableFeaturePolicy: false,
    allowedOrigins: [],
    blockedOrigins: [],
  },
};

/**
 * PWA Configuration validation schema
 */
export const PWA_CONFIG_VALIDATION_SCHEMA: PWAConfigValidationSchema = {
  required: [
    'serviceWorker.path',
    'serviceWorker.scope',
    'cache.strategy',
    'installation.enableAutoPrompt',
    'offline.enableOfflineDetection',
  ],
  optional: [
    'serviceWorker.updateCheckInterval',
    'serviceWorker.enableUpdateNotifications',
    'serviceWorker.enableBackgroundSync',
    'serviceWorker.enablePushNotifications',
    'cache.maxAge',
    'cache.maxEntries',
    'cache.enableRuntimeCaching',
    'cache.precacheRoutes',
    'installation.promptDelay',
    'installation.showOnFirstVisit',
    'installation.maxPromptCount',
    'installation.enableIOSInstructions',
    'installation.enableAndroidInstructions',
    'offline.offlineMessage',
    'offline.retryAttempts',
    'offline.retryDelay',
    'offline.enableOfflineAnalytics',
    'performance.enablePreloading',
    'performance.enableLazyLoading',
    'performance.enableImageOptimization',
    'performance.enableCodeSplitting',
    'performance.maxBundleSize',
    'analytics.enablePWAEvents',
    'analytics.enableInstallTracking',
    'analytics.enableOfflineTracking',
    'analytics.enablePerformanceTracking',
    'analytics.customEvents',
    'security.enableHTTPSRedirect',
    'security.enableCSP',
    'security.enableFeaturePolicy',
    'security.allowedOrigins',
    'security.blockedOrigins',
  ],
  types: {
    'serviceWorker.path': 'string',
    'serviceWorker.scope': 'string',
    'serviceWorker.updateCheckInterval': 'number',
    'serviceWorker.enableUpdateNotifications': 'boolean',
    'serviceWorker.enableBackgroundSync': 'boolean',
    'serviceWorker.enablePushNotifications': 'boolean',
    'cache.strategy': 'string',
    'cache.maxAge': 'number',
    'cache.maxEntries': 'number',
    'cache.enableRuntimeCaching': 'boolean',
    'cache.precacheRoutes': 'array',
    'installation.enableAutoPrompt': 'boolean',
    'installation.promptDelay': 'number',
    'installation.showOnFirstVisit': 'boolean',
    'installation.maxPromptCount': 'number',
    'installation.enableIOSInstructions': 'boolean',
    'installation.enableAndroidInstructions': 'boolean',
    'offline.enableOfflineDetection': 'boolean',
    'offline.offlineMessage': 'string',
    'offline.retryAttempts': 'number',
    'offline.retryDelay': 'number',
    'offline.enableOfflineAnalytics': 'boolean',
    'performance.enablePreloading': 'boolean',
    'performance.enableLazyLoading': 'boolean',
    'performance.enableImageOptimization': 'boolean',
    'performance.enableCodeSplitting': 'boolean',
    'performance.maxBundleSize': 'number',
    'analytics.enablePWAEvents': 'boolean',
    'analytics.enableInstallTracking': 'boolean',
    'analytics.enableOfflineTracking': 'boolean',
    'analytics.enablePerformanceTracking': 'boolean',
    'analytics.customEvents': 'array',
    'security.enableHTTPSRedirect': 'boolean',
    'security.enableCSP': 'boolean',
    'security.enableFeaturePolicy': 'boolean',
    'security.allowedOrigins': 'array',
    'security.blockedOrigins': 'array',
  },
  constraints: {
    'serviceWorker.updateCheckInterval': { min: 60000, max: 3600000 }, // 1 minute to 1 hour
    'cache.maxAge': { min: 60, max: 31536000 }, // 1 minute to 1 year
    'cache.maxEntries': { min: 1, max: 1000 },
    'installation.promptDelay': { min: 0, max: 300000 }, // 0 to 5 minutes
    'installation.maxPromptCount': { min: 0, max: 10 },
    'offline.retryAttempts': { min: 0, max: 10 },
    'offline.retryDelay': { min: 100, max: 30000 }, // 100ms to 30 seconds
    'performance.maxBundleSize': { min: 1024, max: 10485760 }, // 1KB to 10MB
  },
  dependencies: {
    'serviceWorker.enableBackgroundSync': [
      'serviceWorker.enableUpdateNotifications',
    ],
    'serviceWorker.enablePushNotifications': [
      'serviceWorker.enableUpdateNotifications',
    ],
    'cache.enableRuntimeCaching': ['cache.strategy'],
    'offline.enableOfflineAnalytics': ['analytics.enablePWAEvents'],
    'performance.enableImageOptimization': ['cache.enableRuntimeCaching'],
  },
};

/**
 * PWA Configuration Manager Implementation
 */
export class PWAConfigManagerImpl implements PWAConfigManager {
  private config: PWAAdvancedConfig;
  private storageKey: string;

  constructor(
    storageKey: string = 'pwa-config',
    initialConfig?: Partial<PWAAdvancedConfig>
  ) {
    this.storageKey = storageKey;
    this.config = this.loadConfig() || {
      ...DEFAULT_PWA_CONFIG,
      ...initialConfig,
    };
    this.saveConfig();
  }

  /**
   * Get current configuration
   */
  getConfig(): PWAAdvancedConfig {
    return { ...this.config };
  }

  /**
   * Update configuration with partial updates
   */
  updateConfig(updates: Partial<PWAAdvancedConfig>): void {
    this.config = this.deepMerge(this.config, updates);
    this.saveConfig();
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig(): void {
    this.config = { ...DEFAULT_PWA_CONFIG };
    this.saveConfig();
  }

  /**
   * Validate configuration against schema
   */
  validateConfig(config: PWAAdvancedConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required fields
    for (const field of PWA_CONFIG_VALIDATION_SCHEMA.required) {
      if (!this.getNestedValue(config, field)) {
        errors.push(`Required field missing: ${field}`);
      }
    }

    // Check field types
    for (const [field, expectedType] of Object.entries(
      PWA_CONFIG_VALIDATION_SCHEMA.types
    )) {
      const value = this.getNestedValue(config, field);
      if (value !== undefined && !this.validateFieldType(value, expectedType)) {
        errors.push(
          `Invalid type for ${field}: expected ${expectedType}, got ${typeof value}`
        );
      }
    }

    // Check constraints
    for (const [field, constraint] of Object.entries(
      PWA_CONFIG_VALIDATION_SCHEMA.constraints
    )) {
      const value = this.getNestedValue(config, field);
      if (
        value !== undefined &&
        !this.validateFieldConstraint(value, constraint)
      ) {
        errors.push(
          `Constraint violation for ${field}: ${JSON.stringify(constraint)}`
        );
      }
    }

    // Check dependencies
    for (const [field, dependencies] of Object.entries(
      PWA_CONFIG_VALIDATION_SCHEMA.dependencies
    )) {
      const value = this.getNestedValue(config, field);
      if (value === true) {
        for (const dependency of dependencies) {
          const dependencyValue = this.getNestedValue(config, dependency);
          if (!dependencyValue) {
            errors.push(
              `Dependency missing for ${field}: ${dependency} must be enabled`
            );
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Export configuration as JSON string
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON string
   */
  importConfig(configString: string): { success: boolean; errors?: string[] } {
    try {
      const importedConfig = JSON.parse(configString);
      const validation = this.validateConfig(importedConfig);

      if (validation.isValid) {
        this.config = importedConfig;
        this.saveConfig();
        return { success: true };
      } else {
        return { success: false, errors: validation.errors };
      }
    } catch (error) {
      return {
        success: false,
        errors: [
          `Invalid JSON: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        ],
      };
    }
  }

  /**
   * Get configuration value by path
   */
  getConfigValue(path: string): any {
    return this.getNestedValue(this.config, path);
  }

  /**
   * Set configuration value by path
   */
  setConfigValue(path: string, value: any): void {
    this.setNestedValue(this.config, path, value);
    this.saveConfig();
  }

  /**
   * Check if configuration has a specific value
   */
  hasConfigValue(path: string): boolean {
    return this.getNestedValue(this.config, path) !== undefined;
  }

  /**
   * Get configuration metadata
   */
  getConfigMetadata(): {
    version: string;
    lastModified: Date;
    size: number;
    isValid: boolean;
  } {
    const validation = this.validateConfig(this.config);
    const configString = this.exportConfig();

    return {
      version: '1.0.0',
      lastModified: new Date(),
      size: new Blob([configString]).size,
      isValid: validation.isValid,
    };
  }

  // Private helper methods

  private loadConfig(): PWAAdvancedConfig | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private saveConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save PWA configuration:', error);
    }
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);

    target[lastKey] = value;
  }

  private validateFieldType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && !Array.isArray(value);
      default:
        return true;
    }
  }

  private validateFieldConstraint(value: any, constraint: any): boolean {
    if (constraint.min !== undefined && value < constraint.min) return false;
    if (constraint.max !== undefined && value > constraint.max) return false;
    if (constraint.pattern !== undefined && !constraint.pattern.test(value))
      return false;
    if (constraint.enum !== undefined && !constraint.enum.includes(value))
      return false;
    return true;
  }
}

/**
 * Create a new PWA configuration manager instance
 */
export function createPWAConfigManager(
  storageKey?: string,
  initialConfig?: Partial<PWAAdvancedConfig>
): PWAConfigManager {
  return new PWAConfigManagerImpl(storageKey, initialConfig);
}

/**
 * Get default PWA configuration
 */
export function getDefaultPWAConfig(): PWAAdvancedConfig {
  return { ...DEFAULT_PWA_CONFIG };
}

/**
 * Validate PWA configuration
 */
export function validatePWAConfig(config: PWAAdvancedConfig): {
  isValid: boolean;
  errors: string[];
} {
  const manager = new PWAConfigManagerImpl();
  return manager.validateConfig(config);
}
