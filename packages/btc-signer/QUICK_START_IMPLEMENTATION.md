# 🚀 Quick Start Implementation Guide

## 🎯 **Getting Started with Phase 1**

This guide will help you implement the first few deliverables from the PWA refactoring plan. We'll start with the most critical offline functionality enhancements.

---

## 📋 **Prerequisites**

Before starting, ensure you have:

```bash
# Check Node.js version (18+ required)
node --version

# Check npm version (9+ required)
npm --version

# Install dependencies
npm install

# Build the project
npm run build
```

---

## 🔧 **Deliverable 1.1.1: Cache Strategy Optimization**

### **Step 1: Update Service Worker Cache Strategies**

Create a new file `packages/btc-signer/src/lib/sw-strategies.ts`:

```typescript
export interface CacheStrategy {
  name: string;
  handler: (request: Request, cacheName: string) => Promise<Response>;
}

export class NetworkFirstStrategy implements CacheStrategy {
  name = 'network-first';

  async handler(request: Request, cacheName: string): Promise<Response> {
    try {
      // Try network first
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        // Cache the response
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
        return networkResponse;
      }
      throw new Error('Network response not ok');
    } catch (error) {
      // Fallback to cache
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw new Error('No cached response available');
    }
  }
}

export class CacheFirstStrategy implements CacheStrategy {
  name = 'cache-first';

  async handler(request: Request, cacheName: string): Promise<Response> {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback to network
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      throw new Error('Network request failed');
    }
  }
}

export class StaleWhileRevalidateStrategy implements CacheStrategy {
  name = 'stale-while-revalidate';

  async handler(request: Request, cacheName: string): Promise<Response> {
    // Return cached response immediately if available
    const cachedResponse = await caches.match(request);

    // Update cache in background
    this.updateCache(request, cacheName);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Wait for network if no cache
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      throw new Error('Network request failed');
    }
  }

  private async updateCache(
    request: Request,
    cacheName: string
  ): Promise<void> {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
      }
    } catch (error) {
      // Silently fail background update
    }
  }
}
```

### **Step 2: Update Service Worker**

Modify `packages/btc-signer/public/sw.js` to use the new strategies:

```javascript
// Add at the top of the file
importScripts('/sw-strategies.js');

// Update the fetch event handler
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Choose strategy based on request type
  let strategy;

  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.includes('.css') ||
    url.pathname.includes('.js')
  ) {
    strategy = new StaleWhileRevalidateStrategy();
  } else if (url.pathname === '/' || url.pathname.startsWith('/api/')) {
    strategy = new NetworkFirstStrategy();
  } else {
    strategy = new CacheFirstStrategy();
  }

  event.respondWith(
    strategy.handler(request, CACHE_NAME).catch(() => {
      // Fallback to offline page for navigation requests
      if (request.mode === 'navigate') {
        return caches.match('/offline.html');
      }
      return new Response('Offline', { status: 503 });
    })
  );
});
```

### **Step 3: Add Cache Size Management**

Add to `packages/btc-signer/public/sw.js`:

```javascript
// Cache size management
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB

async function manageCacheSize() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();

  if (keys.length === 0) return;

  // Calculate cache size
  let totalSize = 0;
  const entries = [];

  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const blob = await response.blob();
      totalSize += blob.size;
      entries.push({ request, size: blob.size, timestamp: Date.now() });
    }
  }

  // Remove oldest entries if over limit
  if (totalSize > MAX_CACHE_SIZE) {
    entries.sort((a, b) => a.timestamp - b.timestamp);

    for (const entry of entries) {
      await cache.delete(entry.request);
      totalSize -= entry.size;

      if (totalSize <= MAX_CACHE_SIZE) break;
    }
  }
}

// Call cache management periodically
setInterval(manageCacheSize, 5 * 60 * 1000); // Every 5 minutes
```

---

## 🔧 **Deliverable 1.2.1: IndexedDB Integration**

### **Step 1: Create IndexedDB Schema**

Create `packages/btc-signer/src/lib/indexeddb.ts`:

```typescript
export interface PSBTData {
  id: string;
  psbt: string;
  timestamp: number;
  status: 'pending' | 'signed' | 'broadcasted';
  metadata?: Record<string, any>;
}

export interface TransactionHistory {
  id: string;
  txid?: string;
  psbt: string;
  signedPsbt?: string;
  timestamp: number;
  status: 'pending' | 'signed' | 'broadcasted' | 'confirmed';
  fee?: number;
  amount?: number;
}

class IndexedDBManager {
  private dbName = 'BTCSignerDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create PSBT store
        if (!db.objectStoreNames.contains('psbt')) {
          const psbtStore = db.createObjectStore('psbt', { keyPath: 'id' });
          psbtStore.createIndex('timestamp', 'timestamp', { unique: false });
          psbtStore.createIndex('status', 'status', { unique: false });
        }

        // Create transaction history store
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', {
            keyPath: 'id',
          });
          txStore.createIndex('timestamp', 'timestamp', { unique: false });
          txStore.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }

  async savePSBT(data: PSBTData): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['psbt'], 'readwrite');
      const store = transaction.objectStore('psbt');
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPSBT(id: string): Promise<PSBTData | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['psbt'], 'readonly');
      const store = transaction.objectStore('psbt');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllPSBTs(): Promise<PSBTData[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['psbt'], 'readonly');
      const store = transaction.objectStore('psbt');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveTransaction(tx: TransactionHistory): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['transactions'], 'readwrite');
      const store = transaction.objectStore('transactions');
      const request = store.put(tx);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getTransactionHistory(): Promise<TransactionHistory[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['transactions'], 'readonly');
      const store = transaction.objectStore('transactions');
      const request = store.index('timestamp').getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async clearOldData(maxAge: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const cutoff = Date.now() - maxAge;

    // Clear old PSBTs
    const psbts = await this.getAllPSBTs();
    for (const psbt of psbts) {
      if (psbt.timestamp < cutoff) {
        await this.deletePSBT(psbt.id);
      }
    }

    // Clear old transactions
    const transactions = await this.getTransactionHistory();
    for (const tx of transactions) {
      if (tx.timestamp < cutoff) {
        await this.deleteTransaction(tx.id);
      }
    }
  }

  private async deletePSBT(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['psbt'], 'readwrite');
      const store = transaction.objectStore('psbt');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteTransaction(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['transactions'], 'readwrite');
      const store = transaction.objectStore('transactions');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const dbManager = new IndexedDBManager();
```

### **Step 2: Initialize IndexedDB in PWA Provider**

Update `packages/btc-signer/src/app/components/PWAProvider.tsx`:

```typescript
// Add import
import { dbManager } from '../../lib/indexeddb';

// Add to useEffect
useEffect(
  () => {
    detectDevice();
    registerSW();
    checkOfflineCapability();

    // Initialize IndexedDB
    dbManager.init().catch(console.error);

    // ... rest of the code
  },
  [
    /* ... existing dependencies */
  ]
);
```

---

## 🔧 **Deliverable 1.3.1: Offline-First Design**

### **Step 1: Create Offline Status Hook**

Create `packages/btc-signer/src/hooks/useOfflineStatus.ts`:

```typescript
import { useState, useEffect } from 'react';

export interface OfflineStatus {
  isOnline: boolean;
  hasCache: boolean;
  cacheSize: number;
  lastSync: Date | null;
  offlineCapability: 'full' | 'partial' | 'none';
}

export function useOfflineStatus(): OfflineStatus {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: navigator.onLine,
    hasCache: false,
    cacheSize: 0,
    lastSync: null,
    offlineCapability: 'none',
  });

  useEffect(() => {
    const updateStatus = async () => {
      const isOnline = navigator.onLine;

      // Check cache status
      let hasCache = false;
      let cacheSize = 0;

      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          const btcSignerCache = cacheNames.find((name) =>
            name.includes('btc-signer')
          );

          if (btcSignerCache) {
            const cache = await caches.open(btcSignerCache);
            const keys = await cache.keys();
            hasCache = true;
            cacheSize = keys.length;
          }
        } catch (error) {
          console.error('Cache check failed:', error);
        }
      }

      // Determine offline capability
      let offlineCapability: 'full' | 'partial' | 'none' = 'none';
      if (hasCache && cacheSize > 10) {
        offlineCapability = 'full';
      } else if (hasCache && cacheSize > 5) {
        offlineCapability = 'partial';
      }

      setStatus({
        isOnline,
        hasCache,
        cacheSize,
        lastSync: status.lastSync,
        offlineCapability,
      });
    };

    updateStatus();

    const handleOnline = () => updateStatus();
    const handleOffline = () => updateStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [status.lastSync]);

  return status;
}
```

### **Step 2: Create Offline Status Component**

Create `packages/btc-signer/src/app/components/OfflineStatus.tsx`:

```typescript
'use client';

import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { Status } from '@btc-wallet/ui';

export default function OfflineStatus() {
  const { isOnline, hasCache, cacheSize, offlineCapability } =
    useOfflineStatus();

  if (isOnline) {
    return (
      <Status
        message={`Online - ${cacheSize} assets cached (${offlineCapability} offline capability)`}
        type="success"
      />
    );
  }

  const getOfflineMessage = () => {
    if (offlineCapability === 'full') {
      return `Offline - Full functionality available (${cacheSize} assets cached)`;
    } else if (offlineCapability === 'partial') {
      return `Offline - Limited functionality (${cacheSize} assets cached)`;
    } else {
      return 'Offline - No cached assets available';
    }
  };

  const getOfflineType = () => {
    if (offlineCapability === 'full') return 'success';
    if (offlineCapability === 'partial') return 'warning';
    return 'error';
  };

  return <Status message={getOfflineMessage()} type={getOfflineType()} />;
}
```

### **Step 3: Add to Main Layout**

Update `packages/btc-signer/src/app/layout.tsx`:

```typescript
// Add import
import OfflineStatus from './components/OfflineStatus';

// Add to the layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PWAProvider>
          <OfflineStatus />
          {children}
        </PWAProvider>
      </body>
    </html>
  );
}
```

---

## 🧪 **Testing Your Implementation**

### **Test Cache Strategies**

```bash
# Build the project
npm run build

# Start the development server
npm run dev

# Open Chrome DevTools → Application → Service Workers
# Verify service worker is registered and active

# Test offline functionality:
# 1. Load the app completely
# 2. Toggle "Offline" in DevTools Network tab
# 3. Verify the app still works
# 4. Check that offline status shows correctly
```

### **Test IndexedDB**

```bash
# Open Chrome DevTools → Application → IndexedDB
# Verify BTCSignerDB is created with correct schema
# Check that PSBT and transaction data is stored
```

### **Test Offline Status**

```bash
# Verify offline status component shows:
# - Online status with cache information
# - Offline status with capability level
# - Proper status types (success/warning/error)
```

---

## 📋 **Next Steps**

After completing these deliverables:

1. **Move to 1.1.2**: Background Sync Implementation
2. **Move to 1.1.3**: Cache Versioning & Updates
3. **Move to 1.2.2**: Enhanced Local Storage

Each deliverable builds on the previous ones, so ensure thorough testing before moving forward.

---

## 🚨 **Common Issues & Solutions**

### **Service Worker Not Updating**

- Clear browser cache and reload
- Check service worker registration in DevTools
- Verify file paths are correct

### **IndexedDB Not Working**

- Check browser console for errors
- Verify database initialization
- Check browser support for IndexedDB

### **Offline Status Not Updating**

- Verify event listeners are properly attached
- Check cache detection logic
- Ensure proper state management

---

**Need Help?** Check the main PWA refactoring plan for detailed specifications and verification steps.
