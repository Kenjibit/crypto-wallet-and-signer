'use client';

import { useState, useEffect } from 'react';
import { useClientOnly } from '../hooks/useClientOnly.js';
import { usePWA, usePWASafe } from './PWAProvider.js';
import {
  OfflineIndicatorProps,
  OfflineIndicatorConfig,
  NavigatorWithStandalone,
} from '../types';
import styles from './OfflineIndicator.module.css';

// Default configuration
const DEFAULT_CONFIG: OfflineIndicatorConfig = {
  message: "You're offline",
  statusMessage: 'BTC Wallet works offline',
  icon: '📡',
  position: 'top',
  theme: 'error',
  showInPWA: true,
  customColors: {
    background: '#ff4444',
    text: '#ffffff',
    icon: '#ffffff',
  },
};

export function OfflineIndicator({
  className,
  config = {},
}: OfflineIndicatorProps) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [isOffline, setIsOffline] = useState(false);
  const isMounted = useClientOnly();

  // Try to get PWA context, but don't fail if not available
  const pwaContext = usePWASafe();
  const pwaIsOnline = pwaContext?.isOnline;

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    // Check initial state
    setIsOffline(!navigator.onLine);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Use PWA context if available, otherwise use local state
  const showIndicator = pwaContext ? !pwaIsOnline : isOffline;

  // Don't render anything until component is mounted on client
  if (!isMounted) {
    return null;
  }

  // Don't show if online
  if (!showIndicator) {
    return null;
  }

  // Don't show in PWA mode if configured not to
  if (
    window.matchMedia('(display-mode: standalone)').matches &&
    !finalConfig.showInPWA
  ) {
    return null;
  }

  // Generate dynamic styles based on theme and position
  const getDynamicStyles = () => {
    const baseClass = styles.offlineIndicator;
    const position = finalConfig.position || 'top';
    const theme = finalConfig.theme || 'error';
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
      '--offline-indicator-background': finalConfig.customColors.background,
      '--offline-indicator-text': finalConfig.customColors.text,
      '--offline-indicator-icon': finalConfig.customColors.icon,
    } as React.CSSProperties;
  };

  return (
    <div
      className={getDynamicStyles()}
      style={getCustomStyleVars()}
      data-position={finalConfig.position}
      data-theme={finalConfig.theme}
      data-offline={true}
    >
      <div className={styles.content}>
        <span className={styles.icon}>{finalConfig.icon}</span>
        <span className={styles.text}>{finalConfig.message}</span>
        <span className={styles.status}>{finalConfig.statusMessage}</span>
      </div>
    </div>
  );
}

// Default export for backward compatibility
export default OfflineIndicator;
