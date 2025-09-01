import '@testing-library/jest-dom';
import { vi } from 'vitest';
import type { AuthState } from '../types/auth';

// Extend global type for test utilities
declare global {
  var testUtils: {
    createValidAuthState: () => AuthState;
    createInvalidAuthState: () => AuthState;
    createDefaultAuthState: () => AuthState;
  };
}

// Mock window.matchMedia
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

// Mock window.navigator.serviceWorker
Object.defineProperty(window.navigator, 'serviceWorker', {
  writable: true,
  value: {
    register: vi.fn(),
    ready: Promise.resolve({
      active: null,
      controller: null,
      ready: Promise.resolve(),
      waiting: null,
    }),
    getRegistrations: vi.fn().mockResolvedValue([]),
    getRegistration: vi.fn().mockResolvedValue(null),
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock window.performance
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
  },
});

// Mock crypto for air-gapped wallet testing
Object.defineProperty(window, 'crypto', {
  writable: true,
  value: {
    getRandomValues: vi.fn((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }),
    subtle: {
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      digest: vi.fn(),
      generateKey: vi.fn(),
      deriveKey: vi.fn(),
      importKey: vi.fn(),
      exportKey: vi.fn(),
      sign: vi.fn(),
      verify: vi.fn(),
    },
  },
});

// Mock WebAuthn API for passkey testing
Object.defineProperty(window.navigator, 'credentials', {
  writable: true,
  value: {
    create: vi.fn(),
    get: vi.fn(),
  },
});

// Mock document.visibilityState
Object.defineProperty(document, 'visibilityState', {
  writable: true,
  value: 'visible',
});

Object.defineProperty(document, 'hidden', {
  writable: true,
  value: false,
});

// Global test utilities
global.testUtils = {
  createValidAuthState: () => ({
    method: 'passkey' as const,
    status: 'authenticated' as const,
    isPasskeySupported: true,
    isPWA: false,
    credentialId: 'test-credential-id',
  }),

  createInvalidAuthState: () => ({
    method: 'pin' as const,
    status: 'authenticated' as const,
    isPasskeySupported: false,
    isPWA: false,
    credentialId: 'should-not-have-this',
  }),

  createDefaultAuthState: () => ({
    method: null,
    status: 'unauthenticated' as const,
    isPasskeySupported: false,
    isPWA: false,
  }),
};
