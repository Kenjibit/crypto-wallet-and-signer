'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing offline status and network connectivity
 * Provides real-time network status, connection quality, and offline state management
 */
export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(false);
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [connectionEffectiveType, setConnectionEffectiveType] = useState<
    string | null
  >(null);
  const [downlink, setDownlink] = useState<number | null>(null);
  const [rtt, setRtt] = useState<number | null>(null);
  const [lastOnline, setLastOnline] = useState<Date | null>(null);
  const [lastOffline, setLastOffline] = useState<Date | null>(null);

  // Check initial online status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      if (navigator.onLine) {
        setLastOnline(new Date());
      } else {
        setLastOffline(new Date());
      }
    }
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setLastOnline(new Date());
    };

    const handleOffline = () => {
      setIsOffline(true);
      setLastOffline(new Date());
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  // Monitor connection information if available
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const connection = (navigator as any).connection;
    if (!connection) return;

    const updateConnectionInfo = () => {
      setConnectionType(connection.effectiveType || connection.type || null);
      setConnectionEffectiveType(connection.effectiveType || null);
      setDownlink(connection.downlink || null);
      setRtt(connection.rtt || null);
    };

    // Update immediately
    updateConnectionInfo();

    // Listen for changes if supported
    if ('addEventListener' in connection) {
      connection.addEventListener('change', updateConnectionInfo);
    }

    return () => {
      if ('removeEventListener' in connection) {
        connection.removeEventListener('change', updateConnectionInfo);
      }
    };
  }, []);

  // Test network connectivity with a simple request
  const testConnectivity = useCallback(
    async (
      url: string = 'https://www.google.com/favicon.ico'
    ): Promise<boolean> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-cache',
        });

        clearTimeout(timeoutId);
        return response.ok;
      } catch (error) {
        return false;
      }
    },
    []
  );

  // Get connection quality indicator
  const getConnectionQuality = useCallback(():
    | 'excellent'
    | 'good'
    | 'fair'
    | 'poor'
    | 'unknown' => {
    if (!connectionEffectiveType) return 'unknown';

    switch (connectionEffectiveType) {
      case '4g':
        return 'excellent';
      case '3g':
        return 'good';
      case '2g':
        return 'fair';
      case 'slow-2g':
        return 'poor';
      default:
        return 'unknown';
    }
  }, [connectionEffectiveType]);

  // Get offline duration
  const getOfflineDuration = useCallback((): number | null => {
    if (!isOffline || !lastOffline) return null;
    return Date.now() - lastOffline.getTime();
  }, [isOffline, lastOffline]);

  // Get online duration
  const getOnlineDuration = useCallback((): number | null => {
    if (isOffline || !lastOnline) return null;
    return Date.now() - lastOnline.getTime();
  }, [isOffline, lastOnline]);

  // Format duration for display
  const formatDuration = useCallback((duration: number): string => {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  return {
    // Basic status
    isOffline,
    isOnline: !isOffline,

    // Connection details
    connectionType,
    connectionEffectiveType,
    downlink,
    rtt,
    connectionQuality: getConnectionQuality(),

    // Timing information
    lastOnline,
    lastOffline,
    offlineDuration: getOfflineDuration(),
    onlineDuration: getOnlineDuration(),

    // Utility functions
    testConnectivity,
    formatDuration,

    // Computed values
    hasConnectionInfo: connectionType !== null,
    isSlowConnection:
      connectionEffectiveType === '2g' || connectionEffectiveType === 'slow-2g',
  };
}
