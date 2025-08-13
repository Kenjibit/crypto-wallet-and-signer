# 🚀 BTC Wallet PWA Package

A comprehensive, configurable PWA package with reusable components, hooks, and utilities designed specifically for Bitcoin wallet applications.

## ✨ Features

### 🎯 **Core PWA Components**

- **PWAProvider**: Context provider with device detection, service worker management, and iOS safe area handling
- **InstallPrompt**: Configurable installation prompt with multiple themes and positions
- **OfflineIndicator**: Offline status indicator with multiple themes and positions

### 🔧 **Advanced PWA Hooks**

- **usePWAInstall**: Comprehensive PWA installation management
- **useOfflineStatus**: Real-time network status and connectivity monitoring
- **useServiceWorker**: Service worker lifecycle and update management
- **useClientOnly**: Client-side rendering utilities

### 🛠️ **PWA Utilities**

- **Device Detection**: iOS, Android, mobile, and PWA mode detection
- **Service Worker Management**: Registration, updates, and lifecycle management
- **Network Monitoring**: Connection quality, offline detection, and status tracking
- **PWA Capabilities**: Feature detection and capability checking

### ⚙️ **Configuration Management**

- **Advanced Configuration**: Comprehensive PWA configuration options
- **Configuration Validation**: Schema-based validation with constraints
- **Configuration Persistence**: Local storage with import/export capabilities
- **Feature Toggles**: Granular control over PWA features

### 📊 **Analytics & Events**

- **Event System**: Comprehensive event management for PWA lifecycle
- **Performance Tracking**: Core Web Vitals and performance metrics
- **Installation Analytics**: Installation flow tracking and analytics
- **Error Tracking**: Error monitoring and reporting

## 🚀 Installation

```bash
npm install @btc-wallet/my-pwa
```

## 📖 Usage

### Basic Setup

```tsx
import {
  PWAProvider,
  InstallPrompt,
  OfflineIndicator,
} from '@btc-wallet/my-pwa';

function App() {
  return (
    <PWAProvider>
      <div className="app">
        <OfflineIndicator />
        <main>
          <h1>Bitcoin Wallet</h1>
          {/* Your app content */}
        </main>
        <InstallPrompt />
      </div>
    </PWAProvider>
  );
}
```

### Advanced Configuration

```tsx
import { PWAProvider, createPWAConfigManager } from '@btc-wallet/my-pwa';

const configManager = createPWAConfigManager('my-app-config', {
  serviceWorker: {
    path: '/sw.js',
    scope: '/',
    updateCheckInterval: 300000, // 5 minutes
    enableUpdateNotifications: true,
  },
  cache: {
    strategy: 'stale-while-revalidate',
    maxAge: 86400, // 24 hours
    enableRuntimeCaching: true,
  },
  installation: {
    enableAutoPrompt: false,
    promptDelay: 5000, // 5 seconds
    maxPromptCount: 3,
  },
});

function App() {
  return (
    <PWAProvider config={configManager.getConfig()}>
      {/* Your app content */}
    </PWAProvider>
  );
}
```

### Using Advanced Hooks

#### PWA Installation Hook

```tsx
import { usePWAInstall } from '@btc-wallet/my-pwa';

function InstallButton() {
  const { canInstall, installPWA, isInstalled, installError } = usePWAInstall();

  if (isInstalled) {
    return <span>✅ App installed!</span>;
  }

  if (!canInstall) {
    return <span>Installation not available</span>;
  }

  return <button onClick={installPWA}>Install App</button>;
}
```

#### Offline Status Hook

```tsx
import { useOfflineStatus } from '@btc-wallet/my-pwa';

function NetworkStatus() {
  const { isOffline, connectionQuality, offlineDuration, testConnectivity } =
    useOfflineStatus();

  return (
    <div>
      <p>Status: {isOffline ? 'Offline' : 'Online'}</p>
      <p>Quality: {connectionQuality}</p>
      {isOffline && offlineDuration && (
        <p>Offline for: {Math.floor(offlineDuration / 1000)}s</p>
      )}
      <button onClick={() => testConnectivity()}>Test Connection</button>
    </div>
  );
}
```

#### Service Worker Hook

```tsx
import { useServiceWorker } from '@btc-wallet/my-pwa';

function ServiceWorkerStatus() {
  const { isRegistered, updateAvailable, applyUpdate, checkForUpdates } =
    useServiceWorker();

  return (
    <div>
      <p>Service Worker: {isRegistered ? 'Active' : 'Inactive'}</p>
      {updateAvailable && (
        <button onClick={applyUpdate}>Update Available - Click to Apply</button>
      )}
      <button onClick={checkForUpdates}>Check for Updates</button>
    </div>
  );
}
```

### Event Management

```tsx
import { getPWAEventBus } from '@btc-wallet/my-pwa';

const eventBus = getPWAEventBus();

// Listen to lifecycle events
eventBus.on('app-installed', (data) => {
  console.log('App installed:', data);
});

eventBus.on('service-worker-updated', () => {
  console.log('Service worker updated');
});

// Emit custom events
eventBus.registerCustomEvent('wallet-transaction');
eventBus.emitCustomEvent('wallet-transaction', {
  amount: '0.001 BTC',
  address: 'bc1...',
});
```

### Analytics Integration

```tsx
import { getPWAAnalyticsManager } from '@btc-wallet/my-pwa';

const analytics = getPWAAnalyticsManager(true); // Enable debug mode

// Track custom events
analytics.trackCustomEvent('wallet-created', {
  walletType: 'HD',
  coinType: 'bitcoin',
});

// Track performance
analytics.trackPerformanceMetrics({
  firstContentfulPaint: 1200,
  largestContentfulPaint: 2500,
});

// Track errors
analytics.trackError('service-worker', 'Registration failed', 'high');
```

## 🎨 Theming

### Default Bitcoin Theme

The package includes a built-in Bitcoin theme with orange (#f7931a) as the primary color.

### Custom Themes

```tsx
import { InstallPrompt } from '@btc-wallet/my-pwa';

function CustomInstallPrompt() {
  return (
    <InstallPrompt
      config={{
        theme: 'custom',
        customColors: {
          primary: '#your-color',
          secondary: '#your-secondary',
          text: '#your-text',
          background: '#your-background',
        },
      }}
    />
  );
}
```

## ⚙️ Configuration Options

### Service Worker Configuration

```typescript
serviceWorker: {
  path: '/sw.js',                    // Service worker file path
  scope: '/',                        // Service worker scope
  updateCheckInterval: 300000,       // Update check interval (ms)
  enableUpdateNotifications: true,   // Show update notifications
  enableBackgroundSync: true,        // Enable background sync
  enablePushNotifications: false,    // Enable push notifications
}
```

### Cache Configuration

```typescript
cache: {
  strategy: 'stale-while-revalidate', // Cache strategy
  maxAge: 86400,                      // Cache max age (seconds)
  maxEntries: 100,                    // Maximum cache entries
  enableRuntimeCaching: true,         // Enable runtime caching
  precacheRoutes: ['/', '/offline'],  // Routes to precache
}
```

### Installation Configuration

```typescript
installation: {
  enableAutoPrompt: false,            // Auto-show install prompt
  promptDelay: 5000,                  // Delay before showing prompt (ms)
  showOnFirstVisit: true,             // Show on first visit
  maxPromptCount: 3,                  // Maximum prompt count
  enableIOSInstructions: true,        // Show iOS instructions
  enableAndroidInstructions: true,    // Show Android instructions
}
```

### Offline Configuration

```typescript
offline: {
  enableOfflineDetection: true,       // Enable offline detection
  offlineMessage: 'You\'re offline',  // Offline message
  retryAttempts: 3,                   // Retry attempts
  retryDelay: 1000,                   // Retry delay (ms)
  enableOfflineAnalytics: true,       // Track offline events
}
```

## 🔧 Advanced Utilities

### Device Detection

```typescript
import {
  isIOS,
  isAndroid,
  isMobile,
  isPWAMode,
  getDevicePixelRatio,
  getSafeAreaInsets,
} from '@btc-wallet/my-pwa';

// Check device type
if (isIOS()) {
  // iOS-specific logic
}

// Get device capabilities
const pixelRatio = getDevicePixelRatio();
const safeArea = getSafeAreaInsets();
```

### PWA Capabilities

```typescript
import {
  getPWACapabilities,
  isTrustedContext,
  getNetworkInfo,
} from '@btc-wallet/my-pwa';

// Check PWA capabilities
const capabilities = getPWACapabilities();
if (capabilities.push) {
  // Push notifications supported
}

// Check security context
if (isTrustedContext()) {
  // Running in secure context
}

// Get network information
const networkInfo = getNetworkInfo();
console.log('Connection type:', networkInfo.effectiveType);
```

## 📱 iOS PWA Support

The package includes comprehensive iOS PWA support:

- **Safe Area Handling**: Automatic safe area insets for notched devices
- **iOS Installation Instructions**: Platform-specific installation guidance
- **Touch Optimizations**: Touch-friendly interactions and gestures
- **Standalone Mode Detection**: Proper iOS standalone mode detection

## 🧪 Testing

### Build Testing

```bash
npm run build          # Build the package
npm run type-check     # Type checking
npm run dev            # Development mode
npm run clean          # Clean build artifacts
```

### Integration Testing

```bash
# In your app
npm install @btc-wallet/my-pwa
npm run build

# Verify components work
import { PWAProvider } from '@btc-wallet/my-pwa';
```

## 📚 API Reference

### Components

#### PWAProvider

```typescript
interface PWAProviderProps {
  children: React.ReactNode;
  config?: PWAProviderConfig;
}
```

#### InstallPrompt

```typescript
interface InstallPromptProps {
  className?: string;
  config?: InstallPromptConfig;
}
```

#### OfflineIndicator

```typescript
interface OfflineIndicatorProps {
  className?: string;
  config?: OfflineIndicatorConfig;
}
```

### Hooks

#### usePWAInstall

```typescript
interface UsePWAInstallReturn {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  canInstall: boolean;
  installError: string | null;
  installPWA: () => Promise<boolean>;
  dismissInstallPrompt: () => void;
  showInstallPrompt: boolean;
  isSupported: boolean;
}
```

#### useOfflineStatus

```typescript
interface UseOfflineStatusReturn {
  isOffline: boolean;
  isOnline: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  offlineDuration: number | null;
  onlineDuration: number | null;
  testConnectivity: (url?: string) => Promise<boolean>;
  formatDuration: (duration: number) => string;
}
```

#### useServiceWorker

```typescript
interface UseServiceWorkerReturn {
  registration: ServiceWorkerRegistration | null;
  isRegistered: boolean;
  isActive: boolean;
  updateAvailable: boolean;
  canUpdate: boolean;
  registerServiceWorker: () => Promise<ServiceWorkerRegistration | null>;
  checkForUpdates: () => Promise<boolean>;
  applyUpdate: () => Promise<boolean>;
  unregisterServiceWorker: () => Promise<boolean>;
}
```

### Utilities

#### Configuration Management

```typescript
// Create configuration manager
const configManager = createPWAConfigManager(storageKey?, initialConfig?);

// Get configuration
const config = configManager.getConfig();

// Update configuration
configManager.updateConfig(updates);

// Validate configuration
const validation = configManager.validateConfig(config);

// Export/Import configuration
const configString = configManager.exportConfig();
const result = configManager.importConfig(configString);
```

#### Event Management

```typescript
// Get event bus
const eventBus = getPWAEventBus();

// Listen to events
eventBus.on('app-installed', callback);

// Emit events
eventBus.emit('custom-event', data);

// Register custom events
eventBus.registerCustomEvent('wallet-event');
```

#### Analytics

```typescript
// Get analytics manager
const analytics = getPWAAnalyticsManager(debugMode?);

// Track events
analytics.trackInstallation('ios');
analytics.trackPerformanceMetrics(metrics);
analytics.trackError('service-worker', 'Error message', 'high');

// Custom events
analytics.trackCustomEvent('wallet-created', data);
```

## 🚨 Known Issues & Limitations

### Current Limitations

- Components require PWAProvider wrapper for full functionality
- Some browser APIs may not be available in SSR environments
- iOS safe area handling requires PWA mode
- Service worker registration requires HTTPS/localhost

### Technical Notes

- Components gracefully degrade when PWA context is not available
- Safe area handling is iOS-specific
- Service worker registration is configurable
- Debug logging is development-only by default

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Related

- [PWA Migration Plan](../.cursor/PWA_MIGRATION_PLAN.md)
- [Implementation Phase 2](./Implementation-Phase2.md)
- [Root Package Configuration](../../package.json)

---

**Status**: ✅ **Phase 3 Complete** - Advanced PWA Features Implemented  
**Next**: 🎯 **Phase 4: Testing & Documentation** (if needed)

## 🧰 Cache naming (recommended)

To force clients to re-download fresh assets after a deploy, use a versioned service worker cache name tied to your app's `package.json` version. This keeps the process simple: bump your app version when you want to invalidate the cache.

### Tie cache name to package version

Update each app's scripts to pass a cache name composed of the app name and version to the sync CLI. NPM exposes `npm_package_name` and `npm_package_version` inside scripts.

```json
// packages/btc-unsigned/package.json
{
  "scripts": {
    "sync-pwa": "my-pwa-sync-assets --cache-name $npm_package_name-$npm_package_version",
    "postinstall": "npm run sync-pwa",
    "prebuild": "npm run sync-pwa",
    "predev": "npm run sync-pwa"
  }
}
```

```json
// packages/btc-signer/package.json
{
  "scripts": {
    "copy-pwa-assets": "node ../my-pwa/bin/sync-assets.js --target . --cache-name $npm_package_name-$npm_package_version",
    "postinstall": "npm run copy-pwa-assets",
    "prebuild": "npm --prefix ../ui run build && npm --prefix ../my-pwa run build && npm run copy-pwa-assets",
    "predev": "npm run copy-pwa-assets"
  }
}
```

When these scripts run, the CLI writes the computed name into your `public/sw.js` as:

```js
const CACHE_NAME = '<appName>-<appVersion>';
```

Your service worker already deletes old caches during the `activate` event, so a cache-name change cleanly invalidates previous assets.

### Triggering a refresh

To force a refresh, bump your app version and rebuild/deploy:

```bash
# Example: bump patch version without creating a git tag
npm version patch -w btc-unsigned --no-git-tag-version
npm version patch -w btc-signer --no-git-tag-version

# Then build/deploy as usual
```

After deploy, users may need to reload the app (or close/reopen an installed PWA) to activate the updated service worker.

### Optional: manual override via env var

If you prefer not to bump `package.json`, define an environment variable and include it in your script:

```bash
# .env.local (or CI env)
PWA_CACHE_VERSION=2025-08-12
```

```json
"sync-pwa": "my-pwa-sync-assets --cache-name $npm_package_name-$PWA_CACHE_VERSION"
```

On CI (e.g., Vercel/GitHub Actions), set the env variable per deployment to drive cache invalidation.
