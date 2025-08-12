'use client';

import { useState, useEffect, useCallback } from 'react';
import { BeforeInstallPromptEvent } from '../types/index.js';

/**
 * Hook for managing PWA installation functionality
 * Provides install prompt handling, installation status, and platform-specific behavior
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  // Check if PWA is already installed
  useEffect(() => {
    const checkInstallationStatus = () => {
      if (typeof window === 'undefined') return;

      const isStandalone = window.matchMedia(
        '(display-mode: standalone)'
      ).matches;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isIOSStandalone = isIOS && (navigator as any).standalone;

      setIsInstalled(isStandalone || !!isIOSStandalone);
    };

    checkInstallationStatus();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => checkInstallationStatus();

    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
      setInstallError(null);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setCanInstall(false);
      setInstallError(null);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(
          'beforeinstallprompt',
          handleBeforeInstallPrompt
        );
        window.removeEventListener('appinstalled', handleAppInstalled);
      }
    };
  }, []);

  // Trigger installation prompt
  const installPWA = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      setInstallError('Install prompt not available');
      return false;
    }

    try {
      setInstallError(null);
      await deferredPrompt.prompt();

      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setCanInstall(false);
        return true;
      } else {
        setInstallError('Installation was dismissed');
        return false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Installation failed';
      setInstallError(errorMessage);
      return false;
    }
  }, [deferredPrompt]);

  // Dismiss install prompt
  const dismissInstallPrompt = useCallback(() => {
    setDeferredPrompt(null);
    setCanInstall(false);
    setInstallError(null);
  }, []);

  // Check if installation is supported
  const checkInstallSupport = useCallback(() => {
    if (typeof window === 'undefined') return false;

    return (
      'serviceWorker' in navigator &&
      'caches' in window &&
      'PushManager' in window
    );
  }, []);

  return {
    // State
    deferredPrompt,
    isInstalled,
    canInstall,
    installError,

    // Actions
    installPWA,
    dismissInstallPrompt,
    checkInstallSupport,

    // Computed values
    showInstallPrompt: canInstall && !isInstalled,
    isSupported: checkInstallSupport(),
  };
}
