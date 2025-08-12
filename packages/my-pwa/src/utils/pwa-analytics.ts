// PWA Analytics Utility
import {
  PWAPerformanceMetrics,
  PWAInstallAnalytics,
  PWAErrorEvent,
  PWANetworkStatus,
  PWADeviceCapabilities,
} from '../types';

/**
 * PWA Analytics Manager
 * Provides comprehensive analytics tracking for PWA events and performance
 */
export class PWAAnalyticsManager {
  private enabled: boolean = true;
  private debugMode: boolean = false;
  private customEvents: Map<string, (...args: any[]) => void> = new Map();
  private performanceObserver: PerformanceObserver | null = null;
  private networkInfo: PWANetworkStatus | null = null;
  private deviceInfo: PWADeviceCapabilities | null = null;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
    this.initializePerformanceObserver();
    this.captureDeviceInfo();
  }

  /**
   * Enable or disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.debugMode) {
      console.log(`PWA Analytics ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Check if analytics is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Track PWA installation event
   */
  trackInstallation(platform: 'ios' | 'android' | 'desktop' | 'unknown'): void {
    if (!this.enabled) return;

    const analytics: PWAInstallAnalytics = {
      installPromptShown: 0,
      installPromptAccepted: 0,
      installPromptDismissed: 0,
      installationCompleted: 1,
      installationFailed: 0,
      platform,
      browser: this.getBrowserInfo(),
      userAgent: navigator.userAgent,
      timestamp: new Date(),
    };

    this.trackEvent('pwa-installation', analytics);

    if (this.debugMode) {
      console.log('PWA Installation tracked:', analytics);
    }
  }

  /**
   * Track install prompt shown
   */
  trackInstallPromptShown(): void {
    if (!this.enabled) return;
    this.trackEvent('pwa-install-prompt-shown');
  }

  /**
   * Track install prompt accepted
   */
  trackInstallPromptAccepted(): void {
    if (!this.enabled) return;
    this.trackEvent('pwa-install-prompt-accepted');
  }

  /**
   * Track install prompt dismissed
   */
  trackInstallPromptDismissed(): void {
    if (!this.enabled) return;
    this.trackEvent('pwa-install-prompt-dismissed');
  }

  /**
   * Track offline event
   */
  trackOffline(duration?: number): void {
    if (!this.enabled) return;
    this.trackEvent('pwa-offline', { duration, timestamp: new Date() });
  }

  /**
   * Track online event
   */
  trackOnline(duration?: number): void {
    if (!this.enabled) return;
    this.trackEvent('pwa-online', { duration, timestamp: new Date() });
  }

  /**
   * Track service worker registration
   */
  trackServiceWorkerRegistration(success: boolean, duration?: number): void {
    if (!this.enabled) return;
    this.trackEvent('pwa-service-worker-registration', {
      success,
      duration,
      timestamp: new Date(),
    });
  }

  /**
   * Track service worker update
   */
  trackServiceWorkerUpdate(success: boolean): void {
    if (!this.enabled) return;
    this.trackEvent('pwa-service-worker-update', {
      success,
      timestamp: new Date(),
    });
  }

  /**
   * Track cache operation
   */
  trackCacheOperation(
    operation: 'hit' | 'miss' | 'update',
    cacheName: string
  ): void {
    if (!this.enabled) return;
    this.trackEvent('pwa-cache-operation', {
      operation,
      cacheName,
      timestamp: new Date(),
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformanceMetrics(metrics: Partial<PWAPerformanceMetrics>): void {
    if (!this.enabled) return;

    const fullMetrics: PWAPerformanceMetrics = {
      installTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0,
      firstInputDelay: 0,
      timeToInteractive: 0,
      serviceWorkerRegistrationTime: 0,
      cacheHitRate: 0,
      ...metrics,
    };

    this.trackEvent('pwa-performance', fullMetrics);

    if (this.debugMode) {
      console.log('Performance metrics tracked:', fullMetrics);
    }
  }

  /**
   * Track error event
   */
  trackError(
    type: PWAErrorEvent['type'],
    message: string,
    severity: PWAErrorEvent['severity'] = 'medium',
    stack?: string
  ): void {
    if (!this.enabled) return;

    const errorEvent: PWAErrorEvent = {
      type,
      message,
      stack,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      severity,
    };

    this.trackEvent('pwa-error', errorEvent);

    if (this.debugMode) {
      console.error('PWA Error tracked:', errorEvent);
    }
  }

  /**
   * Track custom event
   */
  trackCustomEvent(eventName: string, data?: any): void {
    if (!this.enabled) return;
    this.trackEvent(`pwa-custom-${eventName}`, data);
  }

  /**
   * Register custom event handler
   */
  registerCustomEvent(
    eventName: string,
    handler: (...args: any[]) => void
  ): void {
    this.customEvents.set(eventName, handler);
  }

  /**
   * Unregister custom event handler
   */
  unregisterCustomEvent(eventName: string): void {
    this.customEvents.delete(eventName);
  }

  /**
   * Get current performance metrics
   */
  getCurrentPerformanceMetrics(): PWAPerformanceMetrics {
    const navigation = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');

    const firstContentfulPaint = paint.find(
      (entry) => entry.name === 'first-contentful-paint'
    );
    const largestContentfulPaint = performance.getEntriesByType(
      'largest-contentful-paint'
    )[0];

    return {
      installTime: 0, // Would need to be tracked separately
      firstContentfulPaint: firstContentfulPaint
        ? firstContentfulPaint.startTime
        : 0,
      largestContentfulPaint: largestContentfulPaint
        ? (largestContentfulPaint as any).startTime
        : 0,
      cumulativeLayoutShift: this.getCumulativeLayoutShift(),
      firstInputDelay: this.getFirstInputDelay(),
      timeToInteractive: navigation ? navigation.domInteractive : 0,
      serviceWorkerRegistrationTime: 0, // Would need to be tracked separately
      cacheHitRate: 0, // Would need to be calculated from cache operations
    };
  }

  /**
   * Get network status
   */
  getNetworkStatus(): PWANetworkStatus | null {
    return this.networkInfo;
  }

  /**
   * Get device capabilities
   */
  getDeviceCapabilities(): PWADeviceCapabilities | null {
    return this.deviceInfo;
  }

  /**
   * Export analytics data
   */
  exportAnalyticsData(): {
    performance: PWAPerformanceMetrics;
    network: PWANetworkStatus | null;
    device: PWADeviceCapabilities | null;
    timestamp: Date;
  } {
    return {
      performance: this.getCurrentPerformanceMetrics(),
      network: this.networkInfo,
      device: this.deviceInfo,
      timestamp: new Date(),
    };
  }

  // Private methods

  private trackEvent(eventName: string, data?: any): void {
    // Call custom event handlers if registered
    const customHandler = this.customEvents.get(eventName);
    if (customHandler) {
      try {
        customHandler(data);
      } catch (error) {
        console.error(`Error in custom event handler for ${eventName}:`, error);
      }
    }

    // Emit to global event bus if available
    if (typeof window !== 'undefined' && (window as any).pwaEventBus) {
      try {
        (window as any).pwaEventBus.emit(eventName, data);
      } catch (error) {
        console.error(`Error emitting to event bus for ${eventName}:`, error);
      }
    }

    // Send to analytics service if configured
    this.sendToAnalyticsService(eventName, data);
  }

  private sendToAnalyticsService(eventName: string, data?: any): void {
    // This would integrate with your analytics service
    // For now, we'll just log to console in debug mode
    if (this.debugMode) {
      console.log(`Analytics Event: ${eventName}`, data);
    }

    // Example: Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      try {
        (window as any).gtag('event', eventName, {
          event_category: 'PWA',
          event_label: data?.type || 'general',
          value: data?.value || 1,
          custom_parameters: data,
        });
      } catch (error) {
        console.error('Failed to send to Google Analytics:', error);
      }
    }
  }

  private initializePerformanceObserver(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window))
      return;

    try {
      // Observe layout shifts
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift') {
            // Track layout shifts
            this.trackEvent('pwa-layout-shift', entry);
          }
        }
      });

      this.performanceObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('Failed to initialize PerformanceObserver:', error);
    }
  }

  private getCumulativeLayoutShift(): number {
    if (typeof window === 'undefined') return 0;

    try {
      const cls = (performance as any).getEntriesByType('layout-shift');
      return cls.reduce((sum: number, entry: any) => sum + entry.value, 0);
    } catch {
      return 0;
    }
  }

  private getFirstInputDelay(): number {
    if (typeof window === 'undefined') return 0;

    try {
      const fid = performance.getEntriesByType(
        'first-input'
      )[0] as PerformanceEventTiming;
      return fid ? fid.processingStart - fid.startTime : 0;
    } catch {
      return 0;
    }
  }

  private getBrowserInfo(): string {
    if (typeof window === 'undefined') return 'unknown';

    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
  }

  private captureDeviceInfo(): void {
    if (typeof window === 'undefined') return;

    this.deviceInfo = {
      touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      orientation: this.getDeviceOrientation(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      pixelRatio: window.devicePixelRatio || 1,
      safeArea: this.getSafeAreaInsets(),
      webView: this.isWebView(),
      standalone: this.isStandalone(),
      displayMode: this.getDisplayMode(),
    };
  }

  private getDeviceOrientation(): 'portrait' | 'landscape' | 'unknown' {
    if (typeof window === 'undefined') return 'unknown';

    if (window.screen && window.screen.orientation) {
      return window.screen.orientation.type.includes('landscape')
        ? 'landscape'
        : 'portrait';
    }

    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }

  private getSafeAreaInsets(): {
    top: string;
    right: string;
    bottom: string;
    left: string;
  } {
    if (typeof window === 'undefined') {
      return { top: '0px', right: '0px', bottom: '0px', left: '0px' };
    }

    const root = document.documentElement;
    return {
      top: getComputedStyle(root).getPropertyValue('--sat') || '0px',
      right: getComputedStyle(root).getPropertyValue('--sar') || '0px',
      bottom: getComputedStyle(root).getPropertyValue('--sab') || '0px',
      left: getComputedStyle(root).getPropertyValue('--sal') || '0px',
    };
  }

  private isWebView(): boolean {
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

  private isStandalone(): boolean {
    if (typeof window === 'undefined') return false;

    const isStandalone = window.matchMedia(
      '(display-mode: standalone)'
    ).matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isIOSStandalone = isIOS && (navigator as any).standalone;

    return isStandalone || !!isIOSStandalone;
  }

  private getDisplayMode():
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
   * Cleanup resources
   */
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    this.customEvents.clear();
  }
}

/**
 * Create a new PWA analytics manager
 */
export function createPWAAnalyticsManager(
  debugMode?: boolean
): PWAAnalyticsManager {
  return new PWAAnalyticsManager(debugMode);
}

/**
 * Get or create a global PWA analytics manager
 */
export function getPWAAnalyticsManager(
  debugMode?: boolean
): PWAAnalyticsManager {
  if (typeof window !== 'undefined' && (window as any).pwaAnalytics) {
    return (window as any).pwaAnalytics;
  }

  const manager = createPWAAnalyticsManager(debugMode);

  if (typeof window !== 'undefined') {
    (window as any).pwaAnalytics = manager;
  }

  return manager;
}
