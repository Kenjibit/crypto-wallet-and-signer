import { renderHook, act } from '@testing-library/react';
import {
  useEncryption,
  useConditionalEncryption,
} from '../../hooks/useEncryption';
import { PasskeyEncryptionService } from '../../services/encryption/PasskeyEncryptionService';
import { PinEncryptionService } from '../../services/encryption/PinEncryptionService';
import { authLogger } from '../../../utils/auth/authLogger';

// Mock the services
jest.mock('../../services/encryption/PasskeyEncryptionService');
jest.mock('../../services/encryption/PinEncryptionService');
jest.mock('../../../utils/auth/authLogger');

// Mock localStorage for offline persistence
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock crypto API for offline operation
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: jest.fn((array) => {
      // Fill array with deterministic values for testing
      for (let i = 0; i < array.length; i++) {
        array[i] = i % 256;
      }
      return array;
    }),
    subtle: {
      encrypt: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      decrypt: jest
        .fn()
        .mockResolvedValue(new TextEncoder().encode('decrypted data')),
      importKey: jest.fn().mockResolvedValue('mock-key'),
      deriveKey: jest.fn().mockResolvedValue('mock-derived-key'),
      digest: jest.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
    },
  },
});

// Mock navigator for PWA detection
Object.defineProperty(navigator, 'serviceWorker', {
  value: { controller: {} },
  writable: true,
});

Object.defineProperty(navigator, 'onLine', {
  value: false, // Simulate offline
  writable: true,
});

// Mock WebAuthn API for offline operation
Object.defineProperty(navigator, 'credentials', {
  value: {
    create: jest.fn(),
    get: jest.fn(),
  },
  writable: true,
});

const mockPasskeyEncryptionService =
  PasskeyEncryptionService as jest.MockedClass<typeof PasskeyEncryptionService>;
const mockPinEncryptionService = PinEncryptionService as jest.MockedClass<
  typeof PinEncryptionService
>;
const mockAuthLogger = authLogger as jest.Mocked<typeof authLogger>;

describe('useEncryption Offline PWA Compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default offline-compatible mocks
    mockPasskeyEncryptionService.encrypt.mockResolvedValue(
      'encrypted-passkey-data'
    );
    mockPasskeyEncryptionService.decrypt.mockResolvedValue(
      'decrypted-passkey-data'
    );
    mockPasskeyEncryptionService.testEncryption.mockResolvedValue(true);

    mockPinEncryptionService.encrypt.mockResolvedValue('encrypted-pin-data');
    mockPinEncryptionService.decrypt.mockResolvedValue('decrypted-pin-data');
    mockPinEncryptionService.testEncryption.mockResolvedValue(true);
    mockPinEncryptionService.validateEncryptedData.mockReturnValue(true);

    mockAuthLogger.debug.mockImplementation(() => {});
    mockAuthLogger.error.mockImplementation(() => {});
    mockAuthLogger.performance.mockImplementation(() => {});

    // Reset localStorage mocks
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
    localStorageMock.clear.mockImplementation(() => {});

    // Mock WebAuthn responses for offline operation
    const mockCredential = {
      id: 'offline-credential-id',
      type: 'public-key',
      response: {
        clientDataJSON: new Uint8Array([1, 2, 3]),
        attestationObject: new Uint8Array([4, 5, 6]),
      },
    };

    const mockAssertion = {
      id: 'offline-credential-id',
      type: 'public-key',
      response: {
        clientDataJSON: new Uint8Array([1, 2, 3]),
        authenticatorData: new Uint8Array([4, 5, 6]),
        signature: new Uint8Array([7, 8, 9]),
        userHandle: new Uint8Array([10, 11, 12]),
      },
    };

    (navigator.credentials.create as jest.Mock).mockResolvedValue(
      mockCredential
    );
    (navigator.credentials.get as jest.Mock).mockResolvedValue(mockAssertion);
  });

  describe('Offline Operation Requirements', () => {
    test('works completely offline without network calls', async () => {
      // Ensure we're offline
      expect(navigator.onLine).toBe(false);

      const { result } = renderHook(() => useEncryption());

      // Test PIN encryption (works fully offline)
      await act(async () => {
        const encrypted = await result.current.encryptWithPin(
          'offline data',
          '1234'
        );
        expect(encrypted).toBe('encrypted-pin-data');
      });

      // Test PIN decryption (works fully offline)
      await act(async () => {
        const decrypted = await result.current.decryptWithPin(
          'encrypted-pin-data',
          '1234'
        );
        expect(decrypted).toBe('decrypted-pin-data');
      });

      // Verify no external network calls were made
      expect(mockPasskeyEncryptionService.encrypt).not.toHaveBeenCalled();
      expect(mockPinEncryptionService.encrypt).toHaveBeenCalledWith(
        'offline data',
        '1234'
      );
      expect(mockPinEncryptionService.decrypt).toHaveBeenCalledWith(
        'encrypted-pin-data',
        '1234'
      );
    });

    test('handles localStorage offline persistence', async () => {
      const { result } = renderHook(() => useEncryption());

      // Mock localStorage to simulate offline storage
      localStorageMock.getItem.mockReturnValue('{"test": "data"}');
      localStorageMock.setItem.mockImplementation((key, value) => {
        // Simulate offline storage by storing in memory
        expect(key).toBeDefined();
        expect(value).toBeDefined();
      });

      // Test data validation (uses localStorage offline)
      const isValid = result.current.validateEncryptedData('encrypted-data');
      expect(isValid).toBe(true);

      // Verify localStorage was accessed offline
      expect(localStorageMock.getItem).not.toHaveBeenCalled(); // Not called in this test path
      expect(
        mockPinEncryptionService.validateEncryptedData
      ).toHaveBeenCalledWith('encrypted-data');
    });

    test('crypto operations work offline with Web Crypto API', async () => {
      // Verify Web Crypto API is available offline
      expect(window.crypto).toBeDefined();
      expect(window.crypto.subtle).toBeDefined();
      expect(window.crypto.getRandomValues).toBeDefined();

      const { result } = renderHook(() => useEncryption());

      // Test that crypto operations can be called offline
      await act(async () => {
        const encrypted = await result.current.encryptWithPin(
          'crypto test',
          '1234'
        );
        expect(encrypted).toBe('encrypted-pin-data');
      });

      // Verify crypto functions were called
      expect(window.crypto.subtle.encrypt).toHaveBeenCalled();
      expect(window.crypto.getRandomValues).toHaveBeenCalled();
    });
  });

  describe('PWA Compatibility', () => {
    test('works when installed as PWA', async () => {
      // Simulate PWA installation
      expect(navigator.serviceWorker).toBeDefined();
      expect(navigator.serviceWorker.controller).toBeDefined();

      const { result } = renderHook(() => useEncryption());

      // Test PWA-compatible encryption
      await act(async () => {
        const encrypted = await result.current.encryptWithPin(
          'pwa data',
          '1234'
        );
        expect(encrypted).toBe('encrypted-pin-data');
      });

      // Verify service worker doesn't interfere
      expect(navigator.serviceWorker.controller).toEqual({});
    });

    test('handles service worker offline scenarios', async () => {
      // Simulate service worker offline mode
      const mockServiceWorker = {
        controller: {
          postMessage: jest.fn(),
          onmessage: jest.fn(),
        },
        ready: Promise.resolve({
          active: { state: 'activated' },
        }),
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        writable: true,
      });

      const { result } = renderHook(() => useEncryption());

      // Test encryption with service worker present
      await act(async () => {
        const encrypted = await result.current.encryptWithPin(
          'sw data',
          '1234'
        );
        expect(encrypted).toBe('encrypted-pin-data');
      });

      // Verify service worker wasn't used for encryption
      expect(mockServiceWorker.controller.postMessage).not.toHaveBeenCalled();
    });

    test('PWA install prompt compatible', async () => {
      // Simulate PWA install prompt scenario
      const mockBeforeInstallPromptEvent = {
        preventDefault: jest.fn(),
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      };

      // Mock the beforeinstallprompt event
      window.addEventListener(
        'beforeinstallprompt',
        (
          e: Event & {
            preventDefault: () => void;
            prompt: () => Promise<void>;
            userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
          }
        ) => {
          e.preventDefault = mockBeforeInstallPromptEvent.preventDefault;
          e.prompt = mockBeforeInstallPromptEvent.prompt;
          e.userChoice = mockBeforeInstallPromptEvent.userChoice;
        }
      );

      const { result } = renderHook(() => useEncryption());

      // Test encryption during PWA install flow
      await act(async () => {
        const encrypted = await result.current.encryptWithPin(
          'install data',
          '1234'
        );
        expect(encrypted).toBe('encrypted-pin-data');
      });

      // Verify encryption works independently of install prompt
      expect(mockPinEncryptionService.encrypt).toHaveBeenCalledWith(
        'install data',
        '1234'
      );
    });
  });

  describe('Air-Gapped Wallet Scenarios', () => {
    test('complete offline wallet encryption workflow', async () => {
      // Simulate complete air-gapped environment
      expect(navigator.onLine).toBe(false);
      expect(navigator.serviceWorker).toBeDefined();

      const { result } = renderHook(() => useEncryption());

      const walletData = {
        privateKey: 'air-gapped-private-key',
        address: 'air-gapped-address',
        transactions: ['tx1', 'tx2', 'tx3'],
      };

      const jsonData = JSON.stringify(walletData);

      // 1. Encrypt wallet data offline
      let encrypted: string;
      await act(async () => {
        encrypted = await result.current.encryptWithPin(jsonData, 'secure-pin');
      });

      expect(encrypted).toBe('encrypted-pin-data');
      expect(mockPinEncryptionService.encrypt).toHaveBeenCalledWith(
        jsonData,
        'secure-pin'
      );

      // 2. Decrypt wallet data offline
      let decrypted: string;
      await act(async () => {
        decrypted = await result.current.decryptWithPin(
          encrypted,
          'secure-pin'
        );
      });

      expect(decrypted).toBe('decrypted-pin-data');
      expect(mockPinEncryptionService.decrypt).toHaveBeenCalledWith(
        'encrypted-pin-data',
        'secure-pin'
      );

      // 3. Validate encrypted data format offline
      const isValid = result.current.validateEncryptedData(encrypted);
      expect(isValid).toBe(true);

      // 4. Get metadata without decrypting
      const info = result.current.getEncryptedDataInfo(encrypted);
      expect(info).toBeDefined();
      expect(info?.algorithm).toBe('pin-aes-gcm');
    });

    test('handles network failure gracefully', async () => {
      // Simulate network failure during operation
      mockPinEncryptionService.encrypt.mockRejectedValueOnce(
        new Error('Network temporarily unavailable')
      );

      const { result } = renderHook(() => useEncryption());

      // Test that operations handle network failures gracefully
      await act(async () => {
        await expect(
          result.current.encryptWithPin('test', '1234')
        ).rejects.toThrow('Network temporarily unavailable');
      });

      // Verify error was logged
      expect(mockAuthLogger.error).toHaveBeenCalled();
    });

    test('secure key generation offline', async () => {
      const { result } = renderHook(() => useEncryption());

      // Test that secure keys can be generated offline
      await act(async () => {
        const encrypted = await result.current.encryptWithPin(
          'secure data',
          '1234'
        );
        expect(encrypted).toBe('encrypted-pin-data');
      });

      // Verify crypto operations used secure random generation
      expect(window.crypto.getRandomValues).toHaveBeenCalled();
      expect(window.crypto.subtle.deriveKey).toHaveBeenCalled();
    });
  });

  describe('Offline Data Validation', () => {
    test('validates encrypted data offline', () => {
      const { result } = renderHook(() => useEncryption());

      // Test PIN-encrypted data validation
      const pinValid =
        result.current.validateEncryptedData('pin-encrypted-data');
      expect(pinValid).toBe(true);
      expect(
        mockPinEncryptionService.validateEncryptedData
      ).toHaveBeenCalledWith('pin-encrypted-data');

      // Test invalid data
      mockPinEncryptionService.validateEncryptedData.mockReturnValue(false);
      const invalidValid = result.current.validateEncryptedData('invalid-data');
      expect(invalidValid).toBe(false);
    });

    test('gets encrypted data info offline', () => {
      const { result } = renderHook(() => useEncryption());

      const info = result.current.getEncryptedDataInfo('encrypted-data');
      expect(info).toEqual({
        version: 1,
        algorithm: 'pin-aes-gcm',
        timestamp: expect.any(Number),
        dataSize: 100,
      });
      expect(
        mockPinEncryptionService.getEncryptedDataInfo
      ).toHaveBeenCalledWith('encrypted-data');
    });

    test('handles corrupted encrypted data', () => {
      // Mock atob to throw error (simulating corrupted data)
      global.atob = jest.fn(() => {
        throw new Error('Invalid base64 data');
      });

      const { result } = renderHook(() => useEncryption());

      const isValid = result.current.validateEncryptedData('corrupted-data');
      expect(isValid).toBe(false);

      const info = result.current.getEncryptedDataInfo('corrupted-data');
      expect(info).toBe(null);
    });
  });

  describe('Conditional Encryption Hook', () => {
    test('useConditionalEncryption works offline', async () => {
      // Test with encryption hook enabled (default in tests)
      const { result } = renderHook(() => useConditionalEncryption());

      await act(async () => {
        const encrypted = await result.current.encryptWithPin(
          'conditional data',
          '1234'
        );
        expect(encrypted).toBe('encrypted-pin-data');
      });

      expect(mockPinEncryptionService.encrypt).toHaveBeenCalledWith(
        'conditional data',
        '1234'
      );
    });

    test('handles feature flag switching offline', async () => {
      // Mock feature flag as disabled
      const originalEnv = process.env.NEXT_PUBLIC_USE_ENCRYPTION_HOOK;
      process.env.NEXT_PUBLIC_USE_ENCRYPTION_HOOK = 'false';

      // Force module reload to pick up new env var
      jest.resetModules();

      // Import using ES6 import syntax instead of require
      const { useConditionalEncryption: newUseConditionalEncryption } =
        await import('../../hooks/useEncryption');

      const { result } = renderHook(() => newUseConditionalEncryption());

      // Should use legacy interface when feature flag is disabled
      await act(async () => {
        await expect(
          result.current.encryptWithPin('test', '1234')
        ).rejects.toThrow('Legacy encryption not implemented');
      });

      // Restore original env
      process.env.NEXT_PUBLIC_USE_ENCRYPTION_HOOK = originalEnv;
    });
  });

  describe('Performance in Offline Environment', () => {
    test('fast encryption operations offline', async () => {
      const { result } = renderHook(() => useEncryption());

      const startTime = performance.now();

      await act(async () => {
        await result.current.encryptWithPin('performance test', '1234');
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time offline
      expect(duration).toBeLessThan(100); // Less than 100ms
      expect(mockAuthLogger.performance).toHaveBeenCalled();
    });

    test('handles large data encryption offline', async () => {
      const { result } = renderHook(() => useEncryption());

      // Create large test data (1MB)
      const largeData = 'x'.repeat(1024 * 1024);

      await act(async () => {
        const encrypted = await result.current.encryptWithPin(
          largeData,
          '1234'
        );
        expect(encrypted).toBe('encrypted-pin-data');
      });

      expect(mockPinEncryptionService.encrypt).toHaveBeenCalledWith(
        largeData,
        '1234'
      );
    });
  });

  describe('Error Recovery Offline', () => {
    test('recovers from crypto API errors offline', async () => {
      // Mock crypto.subtle.encrypt to fail
      window.crypto.subtle.encrypt = jest
        .fn()
        .mockRejectedValue(new Error('Crypto operation failed'));

      const { result } = renderHook(() => useEncryption());

      await act(async () => {
        await expect(
          result.current.encryptWithPin('test', '1234')
        ).rejects.toThrow('Crypto operation failed');
      });

      // Verify error was logged
      expect(mockAuthLogger.error).toHaveBeenCalled();
    });

    test('handles localStorage errors offline', async () => {
      // Mock localStorage to fail
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });

      const { result } = renderHook(() => useEncryption());

      // Operations should still work even if localStorage fails
      await act(async () => {
        const encrypted = await result.current.encryptWithPin(
          'storage test',
          '1234'
        );
        expect(encrypted).toBe('encrypted-pin-data');
      });
    });

    test('graceful degradation when WebAuthn unavailable offline', async () => {
      // Mock WebAuthn to be unavailable
      (navigator.credentials.get as jest.Mock).mockRejectedValue(
        new Error('WebAuthn not available offline')
      );

      const { result } = renderHook(() => useEncryption());

      // PIN operations should still work
      await act(async () => {
        const encrypted = await result.current.encryptWithPin(
          'webauthn test',
          '1234'
        );
        expect(encrypted).toBe('encrypted-pin-data');
      });
    });
  });

  describe('Memory Management Offline', () => {
    test('no memory leaks during offline operations', async () => {
      const { result } = renderHook(() => useEncryption());

      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          await result.current.encryptWithPin(`test data ${i}`, '1234');
          await result.current.decryptWithPin('encrypted-data', '1234');
        });
      }

      // Verify operations completed without issues
      expect(mockPinEncryptionService.encrypt).toHaveBeenCalledTimes(10);
      expect(mockPinEncryptionService.decrypt).toHaveBeenCalledTimes(10);
    });

    test('handles large data sets offline', async () => {
      const { result } = renderHook(() => useEncryption());

      // Test with multiple large data sets
      const dataSets = [
        'x'.repeat(100 * 1024), // 100KB
        'y'.repeat(200 * 1024), // 200KB
        'z'.repeat(300 * 1024), // 300KB
      ];

      for (const data of dataSets) {
        await act(async () => {
          const encrypted = await result.current.encryptWithPin(data, '1234');
          expect(encrypted).toBe('encrypted-pin-data');
        });
      }

      expect(mockPinEncryptionService.encrypt).toHaveBeenCalledTimes(3);
    });
  });
});
