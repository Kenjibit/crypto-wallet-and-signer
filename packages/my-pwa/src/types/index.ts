// PWA Package Type Definitions

// Browser API Extensions
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface WindowWithPWA extends Window {
  deferredPrompt?: BeforeInstallPromptEvent;
  gtag?: (
    command: string,
    action: string,
    params: Record<string, string | number | boolean>
  ) => void;
}

// Extend WindowEventMap for custom PWA events
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

// PWA Install Prompt Event
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// PWA Manifest Interface
interface WebAppManifest {
  name?: string;
  short_name?: string;
  description?: string;
  start_url?: string;
  display?: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation?:
    | 'any'
    | 'natural'
    | 'landscape'
    | 'landscape-primary'
    | 'landscape-secondary'
    | 'portrait'
    | 'portrait-primary'
    | 'portrait-secondary';
  theme_color?: string;
  background_color?: string;
  icons?: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
  categories?: string[];
  lang?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
  scope?: string;
  id?: string;
  prefer_related_applications?: boolean;
  related_applications?: Array<{
    platform: string;
    url?: string;
    id?: string;
  }>;
}

// Device Information Interface
export interface DeviceInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isOldIOS: boolean;
  isPWA: boolean;
  isIPhone: boolean;
  isIPad: boolean;
  isIPod: boolean;
  iPhoneModel: string;
}

// PWA Provider Configuration
export interface PWAProviderConfig {
  appName?: string;
  appDescription?: string;
  enableServiceWorker?: boolean;
  enableOfflineDetection?: boolean;
  enableInstallPrompt?: boolean;
  enableExternalLinkPrevention?: boolean;
  enableSafeAreaHandling?: boolean;
  enableDebugLogging?: boolean;
  serviceWorkerPath?: string;
  cacheNames?: string[];
  customInstallInstructions?: {
    ios?: string;
    android?: string;
    default?: string;
  };
}

// PWA Provider Props
export interface PWAProviderProps {
  children: React.ReactNode;
  config?: PWAProviderConfig;
}

// Install Prompt Configuration
export interface InstallPromptConfig {
  appName?: string;
  appDescription?: string;
  installButtonText?: string;
  dismissButtonText?: string;
  neverButtonText?: string;
  icon?: string;
  showOnIOS?: boolean;
  showOnMac?: boolean;
  customIOSInstructions?: string;
  customMacOSInstructions?: string;
  position?: 'bottom' | 'top' | 'center';
  theme?: 'bitcoin' | 'default' | 'custom';
  customColors?: {
    primary?: string;
    secondary?: string;
    text?: string;
    background?: string;
  };
}

// Install Prompt Props
export interface InstallPromptProps {
  className?: string;
  config?: InstallPromptConfig;
}

// Offline Indicator Configuration
export interface OfflineIndicatorConfig {
  message?: string;
  statusMessage?: string;
  icon?: string;
  position?: 'top' | 'bottom';
  theme?: 'error' | 'warning' | 'info' | 'custom';
  customColors?: {
    background?: string;
    text?: string;
    icon?: string;
  };
  showInPWA?: boolean;
}

// Offline Indicator Props
export interface OfflineIndicatorProps {
  className?: string;
  config?: OfflineIndicatorConfig;
}

// Service Worker Registration
export interface ServiceWorkerRegistration {
  registration: globalThis.ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  updateServiceWorker: () => Promise<void>;
}

// PWA Context Value
export interface PWAContextValue {
  isOnline: boolean;
  deviceInfo: DeviceInfo;
  swRegistration: ServiceWorkerRegistration;
  updateServiceWorker: () => Promise<void>;
  deferredPrompt: BeforeInstallPromptEvent | null;
  triggerInstallPrompt: () => Promise<void>;
}

// PWA Hook Return Types
export interface UsePWAReturn {
  isOnline: boolean;
  deviceInfo: DeviceInfo;
  swRegistration: ServiceWorkerRegistration;
  updateServiceWorker: () => Promise<void>;
}

export interface UseInstallPromptReturn {
  deferredPrompt: BeforeInstallPromptEvent | null;
  showInstallPrompt: boolean;
  isInstalled: boolean;
  handleInstallClick: () => Promise<void>;
  handleDismiss: () => void;
}

export interface UseOfflineIndicatorReturn {
  isOffline: boolean;
  showIndicator: boolean;
}

// PWA Event Types
export interface PWAEvents {
  onOnline?: () => void;
  onOffline?: () => void;
  onInstallPrompt?: (event: BeforeInstallPromptEvent) => void;
  onAppInstalled?: (event: Event) => void;
  onServiceWorkerUpdate?: () => void;
  onServiceWorkerReady?: () => void;
}

// Export the interfaces for use in other files
export type {
  NavigatorWithStandalone,
  WindowWithPWA,
  BeforeInstallPromptEvent,
  WebAppManifest,
};

// Advanced PWA Configuration Interfaces
export interface PWAAdvancedConfig {
  // Service Worker Configuration
  serviceWorker: {
    path: string;
    scope: string;
    updateCheckInterval: number; // milliseconds
    enableUpdateNotifications: boolean;
    enableBackgroundSync: boolean;
    enablePushNotifications: boolean;
  };

  // Cache Configuration
  cache: {
    strategy:
      | 'cache-first'
      | 'network-first'
      | 'stale-while-revalidate'
      | 'network-only';
    maxAge: number; // seconds
    maxEntries: number;
    enableRuntimeCaching: boolean;
    precacheRoutes: string[];
  };

  // Installation Configuration
  installation: {
    enableAutoPrompt: boolean;
    promptDelay: number; // milliseconds
    showOnFirstVisit: boolean;
    maxPromptCount: number;
    enableIOSInstructions: boolean;
    enableAndroidInstructions: boolean;
  };

  // Offline Configuration
  offline: {
    enableOfflineDetection: boolean;
    offlineMessage: string;
    retryAttempts: number;
    retryDelay: number; // milliseconds
    enableOfflineAnalytics: boolean;
  };

  // Performance Configuration
  performance: {
    enablePreloading: boolean;
    enableLazyLoading: boolean;
    enableImageOptimization: boolean;
    enableCodeSplitting: boolean;
    maxBundleSize: number; // bytes
  };

  // Analytics Configuration
  analytics: {
    enablePWAEvents: boolean;
    enableInstallTracking: boolean;
    enableOfflineTracking: boolean;
    enablePerformanceTracking: boolean;
    customEvents: string[];
  };

  // Security Configuration
  security: {
    enableHTTPSRedirect: boolean;
    enableCSP: boolean;
    enableFeaturePolicy: boolean;
    allowedOrigins: string[];
    blockedOrigins: string[];
  };
}

// PWA Feature Toggles
export interface PWAFeatureToggles {
  serviceWorker: boolean;
  cache: boolean;
  push: boolean;
  backgroundSync: boolean;
  notifications: boolean;
  geolocation: boolean;
  camera: boolean;
  microphone: boolean;
  installPrompt: boolean;
  offlineDetection: boolean;
  safeAreaHandling: boolean;
  externalLinkPrevention: boolean;
  debugLogging: boolean;
}

// PWA Performance Metrics
export interface PWAPerformanceMetrics {
  installTime: number; // milliseconds
  firstContentfulPaint: number; // milliseconds
  largestContentfulPaint: number; // milliseconds
  cumulativeLayoutShift: number;
  firstInputDelay: number; // milliseconds
  timeToInteractive: number; // milliseconds
  serviceWorkerRegistrationTime: number; // milliseconds
  cacheHitRate: number; // percentage
}

// PWA Installation Analytics
export interface PWAInstallAnalytics {
  installPromptShown: number;
  installPromptAccepted: number;
  installPromptDismissed: number;
  installationCompleted: number;
  installationFailed: number;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  browser: string;
  userAgent: string;
  timestamp: Date;
}

// PWA Error Tracking
export interface PWAErrorEvent {
  type:
    | 'service-worker'
    | 'cache'
    | 'installation'
    | 'offline'
    | 'performance'
    | 'unknown';
  message: string;
  stack?: string;
  timestamp: Date;
  userAgent: string;
  url: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// PWA Network Status
export interface PWANetworkStatus {
  isOnline: boolean;
  connectionType: string | null;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean | null;
  lastOnline: Date | null;
  lastOffline: Date | null;
  offlineDuration: number | null; // milliseconds
  onlineDuration: number | null; // milliseconds
}

// PWA Device Capabilities
export interface PWADeviceCapabilities {
  touch: boolean;
  orientation: 'portrait' | 'landscape' | 'unknown';
  viewport: { width: number; height: number };
  pixelRatio: number;
  safeArea: { top: string; right: string; bottom: string; left: string };
  webView: boolean;
  standalone: boolean;
  displayMode:
    | 'standalone'
    | 'fullscreen'
    | 'minimal-ui'
    | 'browser'
    | 'unknown';
}

// PWA Configuration Manager
export interface PWAConfigManager {
  getConfig(): PWAAdvancedConfig;
  updateConfig(updates: Partial<PWAAdvancedConfig>): void;
  resetConfig(): void;
  validateConfig(config: PWAAdvancedConfig): {
    isValid: boolean;
    errors: string[];
  };
  exportConfig(): string;
  importConfig(configString: string): { success: boolean; errors?: string[] };
}

// PWA Event Emitter
export interface PWAEventEmitter {
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  once(event: string, callback: (...args: any[]) => void): void;
}

// PWA Lifecycle Events
export type PWALifecycleEvent =
  | 'install-prompt-shown'
  | 'install-prompt-accepted'
  | 'install-prompt-dismissed'
  | 'app-installed'
  | 'service-worker-registered'
  | 'service-worker-updated'
  | 'offline'
  | 'online'
  | 'cache-updated'
  | 'background-sync-completed'
  | 'push-notification-received'
  | 'notification-clicked';

// PWA Configuration Validation Schema
export interface PWAConfigValidationSchema {
  required: string[];
  optional: string[];
  types: Record<string, string>;
  constraints: Record<string, any>;
  dependencies: Record<string, string[]>;
}
