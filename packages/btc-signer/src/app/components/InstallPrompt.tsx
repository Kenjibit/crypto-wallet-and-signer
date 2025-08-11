'use client';

import { useState, useEffect } from 'react';
import { useClientOnly } from '../hooks/useClientOnly';
import styles from './InstallPrompt.module.css';

interface InstallPromptProps {
  className?: string;
}

export default function InstallPrompt({ className }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const isMounted = useClientOnly();

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia(
        '(display-mode: standalone)'
      ).matches;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isStandalone || (isIOS && (window.navigator as any).standalone)) {
        setIsInstalled(true);
        return;
      }

      setIsInstalled(false);
    };

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
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
    if (!deferredPrompt) {
      // For iOS, show manual installation instructions
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        showIOSInstallInstructions();
        return;
      }
      return;
    }

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

      // Clear the deferred prompt
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error showing install prompt:', error);
    }
  };

  const showIOSInstallInstructions = () => {
    const instructions = `
      To install BTC Signer on your iPhone/iPad:
      
      1. Tap the Share button (📤) in Safari
      2. Scroll down and tap "Add to Home Screen"
      3. Tap "Add" to confirm
      
      The app will now appear on your home screen!
    `;

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

  return (
    <div className={`${styles.installPrompt} ${className || ''}`}>
      <div className={styles.content}>
        <div className={styles.icon}>📱</div>
        <div className={styles.text}>
          <h3>Install BTC Signer</h3>
          <p>
            Add to your home screen for quick access to Bitcoin transaction
            signing tools
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.installButton} onClick={handleInstallClick}>
            Install
          </button>
          <button className={styles.dismissButton} onClick={handleDismiss}>
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}
