'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing service worker lifecycle and updates
 * Provides service worker registration, update detection, and lifecycle management
 */
export function useServiceWorker(swPath: string = '/sw.js') {
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swState, setSwState] = useState<ServiceWorkerState | null>(null);

  // Register service worker
  const registerServiceWorker =
    useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        setError('Service Worker not supported');
        return null;
      }

      try {
        setError(null);
        setIsInstalling(true);

        const reg = await navigator.serviceWorker.register(swPath);
        setRegistration(reg);
        setSwState(
          reg.installing?.state ||
            reg.waiting?.state ||
            reg.active?.state ||
            null
        );

        // Listen for service worker state changes
        const updateState = () => {
          if (reg.installing) {
            setSwState(reg.installing.state);
            setIsInstalling(reg.installing.state === 'installing');
          } else if (reg.waiting) {
            setSwState(reg.waiting.state);
            setIsWaiting(reg.waiting.state === 'installed');
          } else if (reg.active) {
            setSwState(reg.active.state);
            setIsInstalling(false);
            setIsWaiting(false);
          }
        };

        // Check for updates
        await reg.update();

        // Set up state change listeners
        if (reg.installing && 'addEventListener' in reg.installing) {
          (reg.installing as unknown as EventTarget).addEventListener(
            'statechange',
            updateState
          );
        }
        if (reg.waiting && 'addEventListener' in reg.waiting) {
          (reg.waiting as unknown as EventTarget).addEventListener(
            'statechange',
            updateState
          );
        }
        if (reg.active && 'addEventListener' in reg.active) {
          (reg.active as unknown as EventTarget).addEventListener(
            'statechange',
            updateState
          );
        }

        return reg;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Service Worker registration failed';
        setError(errorMessage);
        setIsInstalling(false);
        return null;
      }
    }, [swPath]);

  // Check for updates
  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    if (!registration) {
      setError('No service worker registration');
      return false;
    }

    try {
      setError(null);
      setIsUpdating(true);

      await registration.update();

      // Check if there's a waiting service worker
      if (registration.waiting) {
        setUpdateAvailable(true);
        setIsWaiting(true);
        return true;
      }

      return false;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Update check failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [registration]);

  // Apply update
  const applyUpdate = useCallback(async (): Promise<boolean> => {
    if (!registration || !registration.waiting) {
      setError('No update available');
      return false;
    }

    try {
      setError(null);

      // Send message to waiting service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Wait for the new service worker to activate
      await new Promise<void>((resolve) => {
        const handleStateChange = () => {
          if (
            registration.active &&
            registration.active.state === 'activated'
          ) {
            resolve();
          }
        };

        if (registration.active) {
          registration.active.addEventListener(
            'statechange',
            handleStateChange
          );
        }
      });

      // Reload the page to use the new service worker
      window.location.reload();
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Update application failed';
      setError(errorMessage);
      return false;
    }
  }, [registration]);

  // Unregister service worker
  const unregisterServiceWorker = useCallback(async (): Promise<boolean> => {
    if (!registration) {
      setError('No service worker registration');
      return false;
    }

    try {
      setError(null);

      const unregistered = await registration.unregister();

      if (unregistered) {
        setRegistration(null);
        setSwState(null);
        setIsInstalling(false);
        setIsWaiting(false);
        setIsUpdating(false);
        setUpdateAvailable(false);
      }

      return unregistered;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unregistration failed';
      setError(errorMessage);
      return false;
    }
  }, [registration]);

  // Get service worker information
  const getServiceWorkerInfo = useCallback(() => {
    if (!registration) return null;

    return {
      scope: registration.scope,
      active: registration.active,
      waiting: registration.waiting,
      installing: registration.installing,
      state: swState,
      updateViaCache: registration.updateViaCache,
    };
  }, [registration, swState]);

  // Listen for service worker messages
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator))
      return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
        setUpdateAvailable(true);
        setIsWaiting(true);
      }
    };

    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return () => {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, []);

  // Auto-register service worker on mount
  useEffect(() => {
    registerServiceWorker();
  }, [registerServiceWorker]);

  return {
    // State
    registration,
    isInstalling,
    isWaiting,
    isUpdating,
    updateAvailable,
    error,
    swState,

    // Actions
    registerServiceWorker,
    checkForUpdates,
    applyUpdate,
    unregisterServiceWorker,

    // Information
    getServiceWorkerInfo,

    // Computed values
    isRegistered: registration !== null,
    isActive: swState === 'activated',
    isInstalled: swState === 'installed',
    canUpdate: updateAvailable && isWaiting,
    isReady: registration !== null && swState === 'activated',
  };
}
