// Test setup for Vitest with JSDOM
import { vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// Ensure JSDOM is properly set up
if (typeof window === 'undefined') {
  throw new Error('JSDOM environment not properly configured');
}

// Mock window.matchMedia for theme testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage for theme persistence testing (in-memory)
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => {
    return Object.prototype.hasOwnProperty.call(localStorageStore, key)
      ? localStorageStore[key]
      : null;
  }),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]);
  }),
  get length() {
    return Object.keys(localStorageStore).length;
  },
  key: vi.fn((index: number) => Object.keys(localStorageStore)[index] ?? null),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
  writable: true,
});

// Helper to create event-capable mock targets
function createEventTarget<T extends Record<string, unknown>>(target: T) {
  const listeners = new Map<string, Set<EventListener>>();
  return {
    ...target,
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners.get(type)?.delete(listener);
    }),
    dispatchEvent: vi.fn((event: Event) => {
      const type = event.type;
      listeners.get(type)?.forEach((l) => l.call(undefined, event));
      return true;
    }),
  } as T & EventTarget;
}

// Create a mock ServiceWorker with event APIs
function createMockServiceWorker(state: ServiceWorkerState) {
  return createEventTarget({
    state,
    postMessage: vi.fn(),
  });
}

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    language: 'en-US',
    languages: ['en-US', 'en'],
    onLine: true,
    serviceWorker: (() => {
      // Default registration with event-capable targets
      const registration = {
        scope: '/',
        updateViaCache: 'all' as const,
        active: createMockServiceWorker('activated'),
        installing: null as ReturnType<typeof createMockServiceWorker> | null,
        waiting: null as ReturnType<typeof createMockServiceWorker> | null,
        update: vi.fn().mockResolvedValue(undefined),
        unregister: vi.fn().mockResolvedValue(true),
      };

      const container = createEventTarget({
        register: vi.fn().mockResolvedValue(registration),
        getRegistration: vi.fn().mockResolvedValue(registration),
        getRegistrations: vi.fn().mockResolvedValue([registration]),
        ready: Promise.resolve(registration),
      });

      return container;
    })(),
    // Network Information API
    connection: createEventTarget({
      type: 'wifi',
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
    }),
    permissions: {
      query: vi.fn().mockResolvedValue({ state: 'granted' }),
    },
  },
  writable: true,
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
    reload: vi.fn(),
    assign: vi.fn(),
    replace: vi.fn(),
  },
  writable: true,
});

// Mock window.history
Object.defineProperty(window, 'history', {
  value: {
    length: 1,
    scrollRestoration: 'auto',
    state: null,
    back: vi.fn(),
    forward: vi.fn(),
    go: vi.fn(),
    pushState: vi.fn(),
    replaceState: vi.fn(),
  },
  writable: true,
});

// Mock window.fetch
Object.defineProperty(window, 'fetch', {
  value: vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({}),
    text: vi.fn().mockResolvedValue(''),
    blob: vi.fn().mockResolvedValue(new Blob()),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  }),
  writable: true,
});

// Minimal Cache API stub
Object.defineProperty(window, 'caches', {
  value: {
    open: vi.fn().mockResolvedValue({
      put: vi.fn(),
      match: vi.fn(),
      delete: vi.fn(),
      keys: vi.fn().mockResolvedValue([] as string[]),
    }),
    has: vi.fn().mockResolvedValue(false),
    keys: vi.fn().mockResolvedValue([] as string[]),
    match: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
  },
  writable: true,
});

// Mock window.Notification
Object.defineProperty(window, 'Notification', {
  value: {
    permission: 'granted',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  },
  writable: true,
});

// Mock PushManager
Object.defineProperty(window, 'PushManager', {
  value: {
    supportedContentTypes: ['application/json'],
    permissionState: vi.fn().mockResolvedValue('granted'),
    subscribe: vi.fn().mockResolvedValue({
      endpoint: 'https://fcm.googleapis.com/fcm/send/test',
      keys: {
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key',
      },
    }),
    getSubscription: vi.fn().mockResolvedValue(null),
  },
  writable: true,
});

// Mock window.IntersectionObserver
Object.defineProperty(window, 'IntersectionObserver', {
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
  writable: true,
});

// Mock window.ResizeObserver
Object.defineProperty(window, 'ResizeObserver', {
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
  writable: true,
});

// Mock window.MutationObserver
Object.defineProperty(window, 'MutationObserver', {
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn().mockReturnValue([]),
  })),
  writable: true,
});

// Mock window.requestAnimationFrame
Object.defineProperty(window, 'requestAnimationFrame', {
  value: vi.fn().mockImplementation((callback) => {
    setTimeout(callback, 0);
    return 1;
  }),
  writable: true,
});

// Mock window.cancelAnimationFrame
Object.defineProperty(window, 'cancelAnimationFrame', {
  value: vi.fn(),
  writable: true,
});

// Mock window.requestIdleCallback
Object.defineProperty(window, 'requestIdleCallback', {
  value: vi.fn().mockImplementation((callback) => {
    setTimeout(callback, 0);
    return 1;
  }),
  writable: true,
});

// Mock window.cancelIdleCallback
Object.defineProperty(window, 'cancelIdleCallback', {
  value: vi.fn(),
  writable: true,
});

// Mock console methods to reduce noise in tests
beforeEach(() => {
  // Reset matchMedia to default false for all tests
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
    writable: true,
    configurable: true,
  });
  // Ensure localStorage is always available for tests
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
  console.warn = vi.fn();
  console.error = vi.fn();

  // Reset localStorage mock
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});

afterEach(() => {
  // Clean up any side effects
  vi.clearAllMocks();
});
