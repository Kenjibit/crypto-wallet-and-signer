'use client';

import { useEffect, useState, useCallback } from 'react';

// Extend Navigator interface for iOS-specific properties
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface PWAProviderProps {
  children: React.ReactNode;
}

export default function PWAProvider({ children }: PWAProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [swRegistration, setSwRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    isIOS: false,
    isAndroid: false,
    isOldIOS: false,
    isPWA: false,
    isIPhone: false,
    isIPad: false,
    isIPod: false,
    iPhoneModel: 'unknown',
  });

  // Enhanced device detection
  const detectDevice = useCallback(() => {
    const userAgent = navigator.userAgent;
    const isIOS =
      /iPad|iPhone|iPod/.test(userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(userAgent);
    const isOldIOS = isIOS && /iPhone OS (7|8|9|10|11|12)/.test(userAgent);
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;

    // Enhanced iOS detection for different iPhone models
    const isIPhone = /iPhone/.test(userAgent);
    const isIPad = /iPad/.test(userAgent);
    const isIPod = /iPod/.test(userAgent);

    // Detect iPhone model for safe area handling
    let iPhoneModel = 'unknown';
    if (isIPhone) {
      if (window.screen && window.screen.width && window.screen.height) {
        const width = window.screen.width;
        const height = window.screen.height;
        const ratio = window.devicePixelRatio || 1;

        // iPhone model detection based on screen dimensions
        if (width === 375 && height === 812 && ratio === 3) {
          iPhoneModel = 'iPhone X/XS/11 Pro/12 mini/13 mini';
        } else if (width === 414 && height === 896 && ratio === 2) {
          iPhoneModel = 'iPhone XR/11';
        } else if (width === 414 && height === 896 && ratio === 3) {
          iPhoneModel = 'iPhone XS Max/11 Pro Max';
        } else if (width === 390 && height === 844 && ratio === 3) {
          iPhoneModel = 'iPhone 12/13/14';
        } else if (width === 428 && height === 926 && ratio === 3) {
          iPhoneModel = 'iPhone 12 Pro Max/13 Pro Max/14 Plus';
        } else if (width === 393 && height === 852 && ratio === 3) {
          iPhoneModel = 'iPhone 14 Pro/15 Pro';
        } else if (width === 430 && height === 932 && ratio === 3) {
          iPhoneModel = 'iPhone 14 Pro Max/15 Pro Max';
        } else if (width === 375 && height === 667 && ratio === 2) {
          iPhoneModel = 'iPhone 6/7/8/SE';
        } else if (width === 320 && height === 568 && ratio === 2) {
          iPhoneModel = 'iPhone 5/SE 1st gen';
        }
      }
    }

    setDeviceInfo({
      isIOS,
      isAndroid,
      isOldIOS,
      isPWA,
      isIPhone,
      isIPad,
      isIPod,
      iPhoneModel,
    });

    if (window.location.hostname === 'localhost') {
      console.log('Device detected:', {
        isIOS,
        isAndroid,
        isOldIOS,
        isPWA,
        isIPhone,
        isIPad,
        isIPod,
        iPhoneModel,
        userAgent,
        screenWidth: window.screen?.width,
        screenHeight: window.screen?.height,
        devicePixelRatio: window.devicePixelRatio,
      });
    }
  }, []);

  // Enhanced online/offline detection
  const handleOnline = useCallback(() => {
    setIsOnline(true);
    if (window.location.hostname === 'localhost') {
      console.log('App is now online');
    }
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    if (window.location.hostname === 'localhost') {
      console.log('App is now offline');
    }
  }, []);

  // Enhanced Service Worker registration
  const registerSW = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        if (window.location.hostname === 'localhost') {
          console.log('Attempting to register Service Worker...');
        }

        const registration = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none', // Always check for updates
        });

        setSwRegistration(registration);

        if (window.location.hostname === 'localhost') {
          console.log('SW registered:', registration);
          console.log('SW scope:', registration.scope);
          console.log('SW state:', registration.active?.state);
        }

        // Check if Service Worker is active
        if (registration.active) {
          if (window.location.hostname === 'localhost') {
            console.log('Service Worker is active');
          }
        } else if (registration.installing) {
          if (window.location.hostname === 'localhost') {
            console.log('Service Worker is installing...');
          }
          registration.installing.addEventListener('statechange', (e) => {
            if (window.location.hostname === 'localhost') {
              console.log(
                'SW state changed:',
                (e.target as ServiceWorker)?.state
              );
            }
          });
        } else if (registration.waiting) {
          if (window.location.hostname === 'localhost') {
            console.log('Service Worker is waiting...');
          }
        }

        // Enhanced update detection
        registration.addEventListener('updatefound', () => {
          if (window.location.hostname === 'localhost') {
            console.log('Service Worker update found');
          }

          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                setSwUpdateAvailable(true);
                if (window.location.hostname === 'localhost') {
                  console.log('New Service Worker available');
                }
              }
            });
          }
        });

        // Handle controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (window.location.hostname === 'localhost') {
            console.log('Service Worker controller changed');
          }
          setSwUpdateAvailable(false);
        });

        // Enhanced message handling
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'SW_READY') {
            if (window.location.hostname === 'localhost') {
              console.log('Service Worker ready message received');
            }
          }
        });
      } catch (error) {
        if (window.location.hostname === 'localhost') {
          console.log('SW registration failed:', error);
        }
      }
    } else {
      if (window.location.hostname === 'localhost') {
        console.log('Service Worker not supported');
      }
    }
  }, []);

  // Enhanced PWA install prompt handling
  const handleBeforeInstallPrompt = useCallback((e: Event) => {
    if (window.location.hostname === 'localhost') {
      console.log('Before install prompt event:', e);
    }
    e.preventDefault();

    // Store the event for later use
    (window as any).deferredPrompt = e;
  }, []);

  const handleAppInstalled = useCallback((e: Event) => {
    if (window.location.hostname === 'localhost') {
      console.log('App installed event:', e);
    }

    // Clear the deferred prompt
    (window as any).deferredPrompt = null;

    // Track installation
    if ('gtag' in window) {
      (window as any).gtag('event', 'pwa_installed', {
        event_category: 'engagement',
        event_label: 'pwa_install',
      });
    }
  }, []);

  // Enhanced external link prevention
  const preventExternalLinks = useCallback(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;

    if (isPWA) {
      const handleClick = (e: Event) => {
        const target = e.target as HTMLElement;
        const link = target.closest('a');

        if (
          link &&
          link.href &&
          !link.href.startsWith(window.location.origin)
        ) {
          e.preventDefault();
          if (window.location.hostname === 'localhost') {
            console.log('External link prevented in PWA mode:', link.href);
          }

          // Optionally open external links in new tab or show message
          if (confirm('This link will open in your browser. Continue?')) {
            window.open(link.href, '_blank');
          }
        }
      };

      document.addEventListener('click', handleClick);

      return () => {
        document.removeEventListener('click', handleClick);
      };
    }
  }, []);

  // Enhanced offline resilience
  const checkOfflineCapability = useCallback(async () => {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        if (window.location.hostname === 'localhost') {
          console.log('Available caches:', cacheNames);
        }

        // Check if we have essential assets cached
        const btcUnsignedCache = cacheNames.find((name) =>
          name.includes('btc-unsigned')
        );
        if (btcUnsignedCache) {
          const cache = await caches.open(btcUnsignedCache);
          const keys = await cache.keys();
          if (window.location.hostname === 'localhost') {
            console.log('Cached assets count:', keys.length);
          }
        }
      } catch (error) {
        if (window.location.hostname === 'localhost') {
          console.log('Cache check failed:', error);
        }
      }
    }
  }, []);

  // Initialize
  useEffect(() => {
    detectDevice();
    registerSW();
    checkOfflineCapability();

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [
    detectDevice,
    registerSW,
    checkOfflineCapability,
    handleOnline,
    handleOffline,
    handleBeforeInstallPrompt,
    handleAppInstalled,
  ]);

  // Handle external link prevention
  useEffect(() => {
    const cleanup = preventExternalLinks();
    return cleanup;
  }, [preventExternalLinks]);

  // Enhanced PWA detection using CSS
  useEffect(() => {
    const checkPWAMode = () => {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      setDeviceInfo((prev) => ({ ...prev, isPWA }));

      if (window.location.hostname === 'localhost') {
        console.log('PWA mode detected:', isPWA);
      }
    };

    // Check immediately
    checkPWAMode();

    // Listen for changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkPWAMode);

    return () => {
      mediaQuery.removeEventListener('change', checkPWAMode);
    };
  }, []);

  // iOS Safe Area Measurement and Handling
  useEffect(() => {
    const measureSafeAreas = () => {
      if (deviceInfo.isIOS && deviceInfo.isPWA) {
        // Get safe area insets using CSS environment variables
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);

        // Extract safe area values
        const safeAreaTop = computedStyle.getPropertyValue('--safe-area-top');
        const safeAreaRight =
          computedStyle.getPropertyValue('--safe-area-right');
        const safeAreaBottom =
          computedStyle.getPropertyValue('--safe-area-bottom');
        const safeAreaLeft = computedStyle.getPropertyValue('--safe-area-left');

        if (window.location.hostname === 'localhost') {
          console.log('iOS Safe Areas measured:', {
            top: safeAreaTop,
            right: safeAreaRight,
            bottom: safeAreaBottom,
            left: safeAreaLeft,
            iPhoneModel: deviceInfo.iPhoneModel,
          });
        }

        // Apply safe area measurements to body
        document.body.style.setProperty(
          '--measured-safe-area-top',
          safeAreaTop
        );
        document.body.style.setProperty(
          '--measured-safe-area-right',
          safeAreaRight
        );
        document.body.style.setProperty(
          '--measured-safe-area-bottom',
          safeAreaBottom
        );
        document.body.style.setProperty(
          '--measured-safe-area-left',
          safeAreaLeft
        );
      }
    };

    // Measure safe areas when device info changes
    if (deviceInfo.isIOS && deviceInfo.isPWA) {
      measureSafeAreas();

      // Re-measure on orientation change
      window.addEventListener('orientationchange', measureSafeAreas);
      window.addEventListener('resize', measureSafeAreas);

      return () => {
        window.removeEventListener('orientationchange', measureSafeAreas);
        window.removeEventListener('resize', measureSafeAreas);
      };
    }
  }, [deviceInfo.isIOS, deviceInfo.isPWA, deviceInfo.iPhoneModel]);

  // Enhanced service worker update handling
  const updateServiceWorker = useCallback(async () => {
    if (swRegistration && swUpdateAvailable) {
      try {
        await swRegistration.update();
        if (window.location.hostname === 'localhost') {
          console.log('Service Worker update initiated');
        }
      } catch (error) {
        if (window.location.hostname === 'localhost') {
          console.log('Service Worker update failed:', error);
        }
      }
    }
  }, [swRegistration, swUpdateAvailable]);

  // Expose update function globally for manual updates
  useEffect(() => {
    (window as any).updateServiceWorker = updateServiceWorker;
    (window as any).deviceInfo = deviceInfo;
    (window as any).isOnline = isOnline;

    return () => {
      delete (window as any).updateServiceWorker;
      delete (window as any).deviceInfo;
      delete (window as any).isOnline;
    };
  }, [updateServiceWorker, deviceInfo, isOnline]);

  return (
    <div
      className="pwa-provider"
      data-online={isOnline}
      data-device={JSON.stringify(deviceInfo)}
    >
      {children}
    </div>
  );
}
