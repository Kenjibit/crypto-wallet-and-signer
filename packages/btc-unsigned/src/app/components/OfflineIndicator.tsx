'use client';

import { useState, useEffect } from 'react';
import { useClientOnly } from '../hooks/useClientOnly';
import styles from './OfflineIndicator.module.css';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const isMounted = useClientOnly();

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

  // Don't render anything until component is mounted on client
  if (!isMounted) {
    return null;
  }

  if (!isOffline) {
    return null;
  }

  return (
    <div className={styles.offlineIndicator}>
      <div className={styles.content}>
        <span className={styles.icon}>📡</span>
        <span className={styles.text}>You're offline</span>
        <span className={styles.status}>BTC Creator works offline</span>
      </div>
    </div>
  );
}
