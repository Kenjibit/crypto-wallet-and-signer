// PWA Utility Functions
import {
  NavigatorWithStandalone,
  WindowWithPWA,
  BeforeInstallPromptEvent,
  WebAppManifest,
} from '../types';

// Export configuration manager
export * from './pwa-config-manager.js';
// Export event emitter
export * from './pwa-event-emitter.js';
// Export analytics
export * from './pwa-analytics.js';
// Export asset management utilities
export * from './pwa-assets.js';
// Export manifest generator utilities
export * from './pwa-manifest-generator.js';

/**
 * Check if the current environment supports PWA features
 */
export function supportsPWA(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'caches' in window &&
    'PushManager' in window
  );
}

/**
 * Check if the app is running as a PWA (standalone mode)
 */
export function isPWAMode(): boolean {
  if (typeof window === 'undefined') return false;

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isIOSStandalone =
    isIOS && (navigator as NavigatorWithStandalone).standalone;

  return isStandalone || !!isIOSStandalone;
}

/**
 * Check if the device is iOS
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Check if the device is Android
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;

  return /Android/.test(navigator.userAgent);
}

/**
 * Check if the device is mobile
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    isIOS() ||
    isAndroid() ||
    /Mobile|Android|iPhone|iPad|iPod/.test(navigator.userAgent)
  );
}

/**
 * Get device pixel ratio
 */
export function getDevicePixelRatio(): number {
  if (typeof window === 'undefined') return 1;

  return window.devicePixelRatio || 1;
}

/**
 * Check if the app is online
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true;

  return navigator.onLine;
}

/**
 * Get safe area insets for iOS devices
 */
export function getSafeAreaInsets(): {
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
 * Apply safe area insets to an element
 */
export function applySafeAreaInsets(element: HTMLElement): void {
  if (typeof window === 'undefined') return;

  const insets = getSafeAreaInsets();

  element.style.setProperty('--safe-area-top', insets.top);
  element.style.setProperty('--safe-area-right', insets.right);
  element.style.setProperty('--safe-area-bottom', insets.bottom);
  element.style.setProperty('--safe-area-left', insets.left);
}

/**
 * Register a service worker
 */
export async function registerServiceWorker(
  swPath: string = '/sw.js'
): Promise<ServiceWorkerRegistration | null> {
  if (!supportsPWA()) {
    console.warn('Service Worker not supported in this environment');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(swPath, {
      updateViaCache: 'none',
    });

    console.log('Service Worker registered successfully:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Check if a service worker update is available
 */
export function checkForServiceWorkerUpdate(
  registration: ServiceWorkerRegistration
): Promise<boolean> {
  return new Promise((resolve) => {
    if (!registration) {
      resolve(false);
      return;
    }

    const checkUpdate = () => {
      registration.update();
    };

    // Check immediately
    checkUpdate();

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            resolve(true);
          }
        });
      }
    });

    // Timeout after 5 seconds
    setTimeout(() => resolve(false), 5000);
  });
}

/**
 * Install PWA manually (for iOS)
 */
export function showManualInstallInstructions(
  platform: 'ios' | 'android' | 'default' = 'default'
): void {
  if (typeof window === 'undefined') return;

  const instructions = {
    ios: 'To install this app on your iPhone/iPad:\n\n1. Tap the Share button (📤) in Safari\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm\n\nThe app will now appear on your home screen!',
    android:
      'To install this app on your Android device:\n\n1. Tap the menu button (⋮) in Chrome\n2. Tap "Add to Home screen"\n3. Tap "Add" to confirm\n\nThe app will now appear on your home screen!',
    default:
      'To install this app:\n\n1. Look for the install button in your browser\n2. Click "Install" when prompted\n3. The app will be added to your home screen!',
  };

  alert(instructions[platform]);
}

/**
 * Get PWA install prompt event
 */
export function getInstallPromptEvent(): BeforeInstallPromptEvent | null {
  if (typeof window === 'undefined') return null;

  return (window as WindowWithPWA).deferredPrompt || null;
}

/**
 * Clear PWA install prompt event
 */
export function clearInstallPromptEvent(): void {
  if (typeof window === 'undefined') return;

  (window as WindowWithPWA).deferredPrompt = undefined;
}

/**
 * Check if the app can be installed
 */
export function canInstallPWA(): boolean {
  if (typeof window === 'undefined') return false;

  return !!(window as WindowWithPWA).deferredPrompt || isPWAMode();
}

/**
 * Get PWA manifest data
 */
export async function getPWAManifest(): Promise<WebAppManifest | null> {
  if (typeof window === 'undefined') return null;

  try {
    const manifestLink = document.querySelector(
      'link[rel="manifest"]'
    ) as HTMLLinkElement;
    if (!manifestLink) return null;

    const response = await fetch(manifestLink.href);
    const manifest = await response.json();
    return manifest;
  } catch (error) {
    console.error('Failed to fetch PWA manifest:', error);
    return null;
  }
}

/**
 * Check if the app has a valid PWA manifest
 */
export async function hasValidPWAManifest(): Promise<boolean> {
  const manifest = await getPWAManifest();
  if (!manifest) return false;

  // Check for required fields
  return !!(manifest.name || manifest.short_name) && !!manifest.start_url;
}

/**
 * Get PWA installation status
 */
export function getPWAInstallStatus():
  | 'installed'
  | 'not-installed'
  | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isIOSStandalone =
    isIOS && (navigator as NavigatorWithStandalone).standalone;

  if (isStandalone || isIOSStandalone) {
    return 'installed';
  }

  return 'not-installed';
}

/**
 * Get PWA display mode
 */
export function getPWADisplayMode():
  | 'standalone'
  | 'fullscreen'
  | 'minimal-ui'
  | 'browser'
  | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';

  const standalone = window.matchMedia('(display-mode: standalone)').matches;
  const fullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  const minimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;

  if (standalone) return 'standalone';
  if (fullscreen) return 'fullscreen';
  if (minimalUI) return 'minimal-ui';

  return 'browser';
}

/**
 * Check if the app is running in a trusted context
 */
export function isTrustedContext(): boolean {
  if (typeof window === 'undefined') return false;

  // Check if running in a secure context
  if (!window.isSecureContext) return false;

  // Check if running on localhost or HTTPS
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]';

  const isHTTPS = window.location.protocol === 'https:';

  return isLocalhost || isHTTPS;
}

/**
 * Get PWA capabilities
 */
export function getPWACapabilities(): {
  serviceWorker: boolean;
  cache: boolean;
  push: boolean;
  backgroundSync: boolean;
  notifications: boolean;
  geolocation: boolean;
  camera: boolean;
  microphone: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      serviceWorker: false,
      cache: false,
      push: false,
      backgroundSync: false,
      notifications: false,
      geolocation: false,
      camera: false,
      microphone: false,
    };
  }

  return {
    serviceWorker: 'serviceWorker' in navigator,
    cache: 'caches' in window,
    push: 'PushManager' in window,
    backgroundSync:
      'serviceWorker' in navigator &&
      'sync' in (navigator.serviceWorker as any),
    notifications: 'Notification' in window,
    geolocation: 'geolocation' in navigator,
    camera:
      'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
    microphone:
      'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
  };
}

/**
 * Get device orientation
 */
export function getDeviceOrientation(): 'portrait' | 'landscape' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';

  if (window.screen && window.screen.orientation) {
    return window.screen.orientation.type.includes('landscape')
      ? 'landscape'
      : 'portrait';
  }

  // Fallback for older browsers
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}

/**
 * Get viewport dimensions
 */
export function getViewportDimensions(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * Check if the device supports touch
 */
export function supportsTouch(): boolean {
  if (typeof window === 'undefined') return false;

  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get network information if available
 */
export function getNetworkInfo(): {
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean | null;
} {
  if (typeof window === 'undefined' || !('connection' in navigator)) {
    return {
      effectiveType: null,
      downlink: null,
      rtt: null,
      saveData: null,
    };
  }

  const connection = (navigator as any).connection;

  return {
    effectiveType: connection.effectiveType || null,
    downlink: connection.downlink || null,
    rtt: connection.rtt || null,
    saveData: connection.saveData || null,
  };
}

/**
 * Check if the app should show install prompt
 */
export function shouldShowInstallPrompt(): boolean {
  if (typeof window === 'undefined') return false;

  // Don't show if already installed
  if (getPWAInstallStatus() === 'installed') return false;

  // Don't show if not in a trusted context
  if (!isTrustedContext()) return false;

  // Don't show if PWA is not supported
  if (!supportsPWA()) return false;

  // Check if we have a deferred prompt
  const hasDeferredPrompt = !!(window as WindowWithPWA).deferredPrompt;

  return hasDeferredPrompt;
}

/**
 * Get PWA theme color
 */
export async function getPWAThemeColor(): Promise<string | null> {
  try {
    const manifest = await getPWAManifest();
    return manifest?.theme_color || null;
  } catch {
    return null;
  }
}

/**
 * Get PWA background color
 */
export async function getPWABackgroundColor(): Promise<string | null> {
  try {
    const manifest = await getPWAManifest();
    return manifest?.background_color || null;
  } catch {
    return null;
  }
}

/**
 * Check if the app is running in a WebView
 */
export function isWebView(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent.toLowerCase();

  return (
    userAgent.includes('wv') || // Android WebView
    (userAgent.includes('mobile') &&
      userAgent.includes('safari') &&
      !userAgent.includes('chrome')) || // iOS WebView
    userAgent.includes('fbav') || // Facebook WebView
    userAgent.includes('instagram') || // Instagram WebView
    userAgent.includes('line') || // Line WebView
    userAgent.includes('whatsapp') // WhatsApp WebView
  );
}

/**
 * Get PWA scope
 */
export async function getPWAScope(): Promise<string | null> {
  try {
    const manifest = await getPWAManifest();
    return manifest?.scope || null;
  } catch {
    return null;
  }
}

/**
 * Check if the app is within PWA scope
 */
export function isWithinPWAScope(): boolean {
  if (typeof window === 'undefined') return false;

  // If running as PWA, we're always within scope
  if (isPWAMode()) return true;

  // Check if current URL is within manifest scope
  // This is a simplified check - in practice, you'd want to compare with the actual scope
  return true;
}
