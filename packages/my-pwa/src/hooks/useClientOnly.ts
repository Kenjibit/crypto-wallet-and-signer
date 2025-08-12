'use client';

import { useState, useEffect } from 'react';
import { NavigatorWithStandalone } from '../types/index.js';

/**
 * Hook to ensure component only renders on the client side
 * This prevents hydration mismatches for components that depend on browser APIs
 */
export function useClientOnly() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}

/**
 * Hook to safely access browser APIs without hydration issues
 * Returns a safe value that can be used during SSR and client-side rendering
 */
export function useSafeBrowserValue<T>(browserValue: T, fallbackValue: T): T {
  const [value, setValue] = useState<T>(fallbackValue);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setValue(browserValue);
  }, [browserValue]);

  return isMounted ? value : fallbackValue;
}

/**
 * Hook to detect if the app is running as a PWA
 * Returns true if the app is in standalone mode
 */
export function usePWAMode() {
  const [isPWA, setIsPWA] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const checkPWAMode = () => {
      const standalone = window.matchMedia(
        '(display-mode: standalone)'
      ).matches;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isIOSStandalone =
        isIOS && (navigator as NavigatorWithStandalone).standalone;

      setIsPWA(standalone || !!isIOSStandalone);
    };

    checkPWAMode();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkPWAMode);

    return () => {
      mediaQuery.removeEventListener('change', checkPWAMode);
    };
  }, []);

  return isMounted ? isPWA : false;
}
