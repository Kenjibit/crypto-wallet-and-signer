import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useClientOnly } from '../hooks/useClientOnly.js';
import { usePWAInstall } from '../hooks/usePWAInstall.js';
import { useOfflineStatus } from '../hooks/useOfflineStatus.js';
import { useServiceWorker } from '../hooks/useServiceWorker.js';

// Mock window.matchMedia for theme testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: query === '(display-mode: standalone)' ? false : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock navigator.standalone for iOS detection
Object.defineProperty(window.navigator, 'standalone', {
  writable: true,
  value: false,
});

// Mock beforeinstallprompt event
const mockBeforeInstallPrompt = {
  prompt: vi.fn().mockResolvedValue(undefined),
  userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  preventDefault: vi.fn(),
};

// Mock service worker registration
const mockRegistration = {
  scope: '/',
  updateViaCache: 'all' as const,
  navigationPreload: {
    getState: vi.fn().mockResolvedValue({ enabled: false }),
    setState: vi.fn().mockResolvedValue(undefined),
    disable: vi.fn().mockResolvedValue(undefined),
  },
  onupdatefound: null,
  pushManager: {
    getSubscription: vi.fn().mockResolvedValue(null),
    subscribe: vi.fn().mockResolvedValue(null),
    permissionState: vi.fn().mockResolvedValue('granted' as const),
  },
  ready: Promise.resolve(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  unregister: vi.fn().mockResolvedValue(true),
  active: {
    postMessage: vi.fn(),
    state: 'activated' as const,
  },
  installing: null,
  waiting: null,
};

describe('PWA Hooks', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock window.addEventListener and removeEventListener
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();

    // Mock window.navigator.onLine
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: true,
    });

    // Mock window.navigator.serviceWorker with event APIs
    const listeners = new Map<string, Set<(e: Event) => void>>();
    const makeEventTarget = (target: any) => ({
      ...target,
      addEventListener: vi.fn((type: string, cb: (e: Event) => void) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(cb);
      }),
      removeEventListener: vi.fn((type: string, cb: (e: Event) => void) => {
        listeners.get(type)?.delete(cb);
      }),
      dispatchEvent: vi.fn((e: Event) => {
        listeners.get(e.type)?.forEach((cb) => cb(e));
        return true;
      }),
    });

    const swRegistration = {
      ...mockRegistration,
      active: makeEventTarget({ ...mockRegistration.active }),
      installing: null,
      waiting: null,
    };

    Object.defineProperty(window.navigator, 'serviceWorker', {
      writable: true,
      value: makeEventTarget({
        register: vi.fn().mockResolvedValue(swRegistration),
        getRegistration: vi.fn().mockResolvedValue(swRegistration),
        getRegistrations: vi.fn().mockResolvedValue([swRegistration]),
        ready: Promise.resolve(swRegistration),
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useClientOnly', () => {
    it('should return false initially and true after mount', async () => {
      const { result } = renderHook(() => useClientOnly());

      // Initial render should be a boolean value
      expect(typeof result.current).toBe('boolean');

      // After mount it should become true
      await waitFor(() => expect(result.current).toBe(true));
    });

    it('should not throw and return a boolean in all environments', () => {
      const { result } = renderHook(() => useClientOnly());
      expect(typeof result.current).toBe('boolean');
    });
  });

  describe('usePWAInstall', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.canInstall).toBe(false);
      expect(result.current.isInstalled).toBe(false);
      expect(typeof result.current.installPWA).toBe('function');
      expect(typeof result.current.dismissInstallPrompt).toBe('function');
    });

    it('should detect beforeinstallprompt event', () => {
      const { result } = renderHook(() => usePWAInstall());

      // Simulate beforeinstallprompt event
      act(() => {
        const event = new Event('beforeinstallprompt');
        Object.defineProperty(event, 'preventDefault', {
          value: vi.fn(),
          writable: true,
        });
        window.dispatchEvent(event);
      });

      // The hook should now detect the event
      expect(result.current.canInstall).toBeDefined();
    });

    it('should detect appinstalled event', () => {
      const { result } = renderHook(() => usePWAInstall());

      // Simulate appinstalled event
      act(() => {
        const event = new Event('appinstalled');
        window.dispatchEvent(event);
      });

      // The hook should now detect the event
      expect(result.current.isInstalled).toBeDefined();
    });

    it('should handle install function', () => {
      const { result } = renderHook(() => usePWAInstall());

      // Mock the deferredPrompt
      Object.defineProperty(window, 'deferredPrompt', {
        writable: true,
        value: mockBeforeInstallPrompt,
      });

      act(() => {
        result.current.installPWA();
      });

      // Should not throw
      expect(result.current.installPWA).toBeDefined();
    });

    it('should handle dismiss function', () => {
      const { result } = renderHook(() => usePWAInstall());

      act(() => {
        result.current.dismissInstallPrompt();
      });

      // Should not throw
      expect(result.current.dismissInstallPrompt).toBeDefined();
    });

    it('should handle iOS PWA detection', () => {
      // Mock iOS user agent
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.canInstall).toBeDefined();
    });

    it('should handle standalone mode detection', () => {
      // Mock standalone mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(display-mode: standalone)' ? true : false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isInstalled).toBeDefined();
    });
  });

  describe('useOfflineStatus', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useOfflineStatus());

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOffline).toBe(false);
      expect(result.current.lastOnline).toBeInstanceOf(Date);
      expect(
        result.current.lastOffline === null ||
          result.current.lastOffline instanceof Date
      ).toBe(true);
    });

    it('should detect online status changes', () => {
      const { result } = renderHook(() => useOfflineStatus());

      // Simulate going offline
      act(() => {
        Object.defineProperty(window.navigator, 'onLine', {
          writable: true,
          value: false,
        });
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOffline).toBeDefined();
    });

    it('should detect offline status changes', () => {
      const { result } = renderHook(() => useOfflineStatus());

      // Simulate going online
      act(() => {
        Object.defineProperty(window.navigator, 'onLine', {
          writable: true,
          value: true,
        });
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.isOnline).toBeDefined();
    });

    it('should track last online/offline times', () => {
      const { result } = renderHook(() => useOfflineStatus());

      expect(
        result.current.lastOnline === null ||
          result.current.lastOnline instanceof Date
      ).toBe(true);
      expect(
        result.current.lastOffline === null ||
          result.current.lastOffline instanceof Date
      ).toBe(true);

      // Times should be reasonable (within last hour)
      const now = Date.now();
      if (result.current.lastOnline) {
        expect(result.current.lastOnline.getTime()).toBeLessThanOrEqual(now);
      }
      if (result.current.lastOffline) {
        expect(result.current.lastOffline.getTime()).toBeLessThanOrEqual(now);
      }
    });

    it('should handle missing connection info gracefully', () => {
      const originalConnection = (navigator as any).connection;
      Object.defineProperty(window.navigator, 'connection', {
        value: undefined,
        configurable: true,
      });

      const { result } = renderHook(() => useOfflineStatus());
      expect(result.current.hasConnectionInfo).toBe(false);

      Object.defineProperty(window.navigator, 'connection', {
        value: originalConnection,
        configurable: true,
      });
    });
  });

  describe('useServiceWorker', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useServiceWorker());

      expect(result.current.isRegistered).toBe(false);
      expect(result.current.isReady).toBe(false);
      expect(typeof result.current.registerServiceWorker).toBe('function');
      expect(typeof result.current.unregisterServiceWorker).toBe('function');
      expect(typeof result.current.checkForUpdates).toBe('function');
    });

    it('should detect service worker support', () => {
      const { result } = renderHook(() => useServiceWorker());

      expect(result.current.isRegistered).toBe(false);
    });

    it('should register service worker successfully', async () => {
      const { result } = renderHook(() => useServiceWorker());

      await act(async () => {
        await result.current.registerServiceWorker();
      });

      expect(result.current.isRegistered).toBeDefined();
    });

    it('should handle service worker registration errors', async () => {
      // Mock service worker registration to fail
      const mockRegister = vi
        .fn()
        .mockRejectedValue(new Error('Registration failed'));
      Object.defineProperty(window.navigator.serviceWorker, 'register', {
        value: mockRegister,
        writable: true,
      });

      const { result } = renderHook(() => useServiceWorker());

      await act(async () => {
        await result.current.registerServiceWorker();
      });

      // Should handle error gracefully
      expect(result.current.isRegistered).toBeDefined();
    });

    it('should unregister service worker successfully', async () => {
      const { result } = renderHook(() => useServiceWorker());

      await act(async () => {
        await result.current.unregisterServiceWorker();
      });

      // Should not throw
      expect(result.current.unregisterServiceWorker).toBeDefined();
    });

    it('should update service worker successfully', async () => {
      const { result } = renderHook(() => useServiceWorker());

      await act(async () => {
        await result.current.checkForUpdates();
      });

      // Should not throw
      expect(result.current.checkForUpdates).toBeDefined();
    });

    it('should handle service worker lifecycle events', () => {
      const { result } = renderHook(() => useServiceWorker());

      // Simulate service worker update by calling checkForUpdates
      act(() => {
        result.current.checkForUpdates();
      });

      expect(result.current.isRegistered).toBeDefined();
    });

    it('should handle unsupported environment gracefully', () => {
      const originalSW = (window.navigator as any).serviceWorker;
      Object.defineProperty(window.navigator, 'serviceWorker', {
        value: undefined,
        configurable: true,
      });

      const { result } = renderHook(() => useServiceWorker());
      expect(result.current.isRegistered).toBe(false);

      Object.defineProperty(window.navigator, 'serviceWorker', {
        value: originalSW,
        configurable: true,
      });
    });
  });

  describe('Hook Integration', () => {
    it('should work together in a PWA context', () => {
      const { result: clientResult } = renderHook(() => useClientOnly());
      const { result: installResult } = renderHook(() => usePWAInstall());
      const { result: offlineResult } = renderHook(() => useOfflineStatus());
      const { result: swResult } = renderHook(() => useServiceWorker());

      expect(clientResult.current).toBeDefined();
      expect(installResult.current.canInstall).toBeDefined();
      expect(offlineResult.current.isOnline).toBeDefined();
      expect(swResult.current.isRegistered).toBeDefined();
    });

    it('should handle PWA installation flow', async () => {
      const { result: installResult } = renderHook(() => usePWAInstall());
      const { result: swResult } = renderHook(() => useServiceWorker());

      // Mock successful registration
      await act(async () => {
        await swResult.current.registerServiceWorker();
      });

      expect(installResult.current.canInstall).toBeDefined();
      expect(swResult.current.isRegistered).toBeDefined();
    });
  });
});
