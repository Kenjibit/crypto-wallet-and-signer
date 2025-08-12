'use client';

import { useState, useEffect } from 'react';
import { useClientOnly } from '../hooks/useClientOnly.js';
import { usePWA, usePWASafe } from './PWAProvider.js';
import {
  InstallPromptProps,
  InstallPromptConfig,
  BeforeInstallPromptEvent,
  NavigatorWithStandalone,
} from '../types/index.js';
import styles from './InstallPrompt.module.css';

// Default configuration
const DEFAULT_CONFIG: InstallPromptConfig = {
  appName: 'BTC Wallet App',
  appDescription:
    'Add to your home screen for quick access to Bitcoin transaction signing tools',
  installButtonText: 'Install',
  dismissButtonText: 'Not Now',
  icon: '📱',
  showOnIOS: true,
  customIOSInstructions:
    'To install this app on your iPhone/iPad:\n\n1. Tap the Share button (📤) in Safari\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm\n\nThe app will now appear on your home screen!',
  position: 'bottom',
  theme: 'bitcoin',
  customColors: {
    primary: '#f7931a',
    secondary: '#e6851a',
    text: '#000000',
    background: '#ffffff',
  },
};

export function InstallPrompt({ className, config = {} }: InstallPromptProps) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const isMounted = useClientOnly();

  // Try to get PWA context, but don't fail if not available
  const pwaContext = usePWASafe();
  const deferredPrompt = pwaContext?.deferredPrompt;

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia(
        '(display-mode: standalone)'
      ).matches;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (
        isStandalone ||
        (isIOS && (window.navigator as NavigatorWithStandalone).standalone)
      ) {
        setIsInstalled(true);
        return;
      }

      setIsInstalled(false);
    };

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setShowInstallPrompt(true);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
    };

    // Check initial state
    checkIfInstalled();

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check periodically for iOS PWA installation
    const interval = setInterval(checkIfInstalled, 2000);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearInterval(interval);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
          console.log('User accepted the install prompt');
          setIsInstalled(true);
          setShowInstallPrompt(false);
        } else {
          console.log('User dismissed the install prompt');
        }
      } catch (error) {
        console.error('Error showing install prompt:', error);
      }
    } else {
      // For iOS, show manual installation instructions
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        showIOSInstallInstructions();
        return;
      }
    }
  };

  const showIOSInstallInstructions = () => {
    const instructions =
      finalConfig.customIOSInstructions || finalConfig.customIOSInstructions;
    alert(instructions);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  // Don't render anything until component is mounted on client
  if (!isMounted) {
    return null;
  }

  // Don't show if already installed or no prompt available
  if (isInstalled || !showInstallPrompt) {
    return null;
  }

  // Don't show in PWA standalone mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return null;
  }

  // Generate dynamic styles based on theme and position
  const getDynamicStyles = () => {
    const baseClass = styles.installPrompt;
    const position = finalConfig.position || 'bottom';
    const theme = finalConfig.theme || 'bitcoin';
    const positionClass =
      styles[
        `position${position.charAt(0).toUpperCase() + position.slice(1)}`
      ] || '';
    const themeClass =
      styles[`theme${theme.charAt(0).toUpperCase() + theme.slice(1)}`] || '';

    return `${baseClass} ${positionClass} ${themeClass} ${
      className || ''
    }`.trim();
  };

  // Generate custom CSS variables for custom colors
  const getCustomStyleVars = () => {
    if (finalConfig.theme !== 'custom' || !finalConfig.customColors) {
      return {};
    }

    return {
      '--install-prompt-primary': finalConfig.customColors.primary,
      '--install-prompt-secondary': finalConfig.customColors.secondary,
      '--install-prompt-text': finalConfig.customColors.text,
      '--install-prompt-background': finalConfig.customColors.background,
    } as React.CSSProperties;
  };

  return (
    <div
      className={getDynamicStyles()}
      style={getCustomStyleVars()}
      data-position={finalConfig.position}
      data-theme={finalConfig.theme}
    >
      <div className={styles.content}>
        <div className={styles.icon}>{finalConfig.icon}</div>
        <div className={styles.text}>
          <h3>Install {finalConfig.appName}</h3>
          <p>{finalConfig.appDescription}</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.installButton} onClick={handleInstallClick}>
            {finalConfig.installButtonText}
          </button>
          <button className={styles.dismissButton} onClick={handleDismiss}>
            {finalConfig.dismissButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Default export for backward compatibility
export default InstallPrompt;
