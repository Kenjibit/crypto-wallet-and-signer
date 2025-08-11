'use client';

import { useState, useEffect } from 'react';

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
