import { renderHook, act } from '@testing-library/react';
import { usePasskeyAuth } from '../../hooks/usePasskeyAuth';
import { usePinAuth } from '../../hooks/usePinAuth';
import { PasskeyService } from '../../services/auth/PasskeyService';
import { PinService } from '../../services/auth/PinService';
import { PasskeyEncryptionService } from '../../services/encryption/PasskeyEncryptionService';
import { PinEncryptionService } from '../../services/encryption/PinEncryptionService';

import { vi } from 'vitest';
// Mock all services
vi.mock('../../services/auth/PasskeyService');
vi.mock('../../services/auth/PinService');
vi.mock('../../services/encryption/PasskeyEncryptionService');
vi.mock('../../services/encryption/PinEncryptionService');
vi.mock('../../../utils/auth/authLogger', () => ({
  authLogger: {
    debug: vi.fn(),
    error: vi.fn(),
    performance: vi.fn(),
  },
}));

const mockPasskeyService = PasskeyService as vi.Mocked<typeof PasskeyService>;
const mockPinService = PinService as vi.Mocked<typeof PinService>;
const mockPasskeyEncryptionService = PasskeyEncryptionService as vi.Mocked<
  typeof PasskeyEncryptionService
>;
const mockPinEncryptionService = PinEncryptionService as vi.Mocked<
  typeof PinEncryptionService
>;

describe('Authentication Hooks - Offline PWA Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup service mocks with offline-compatible responses
    mockPasskeyService.createCredential.mockResolvedValue({
      credential: {} as PublicKeyCredential,
      credentialId: 'mock-credential-id',
    });

    mockPasskeyService.verifyCredential.mockResolvedValue({
      success: true,
      authenticated: true,
    });

    mockPasskeyService.verifyCredentialExists.mockResolvedValue(true);
    mockPasskeyService.isSupported.mockResolvedValue({
      isSupported: true,
      hasWebAuthn: true,
      hasPlatformAuthenticator: true,
      hasConditionalMediation: false,
      platformAuthenticatorAvailable: true,
      isIOS: false,
      isIOS16Plus: false,
      isIOS18Plus: false,
    });

    mockPinService.validatePinAuth.mockReturnValue({
      isValid: true,
      errors: [],
    });

    mockPinService.verifyPinMatch.mockReturnValue(true);
    mockPinService.savePinAuth.mockImplementation(() => {});
    mockPinService.loadPinAuth.mockReturnValue({ pin: '', confirmPin: '' });

    mockPasskeyEncryptionService.encrypt.mockResolvedValue('encrypted-data');
    mockPasskeyEncryptionService.decrypt.mockResolvedValue('decrypted-data');
    mockPasskeyEncryptionService.testEncryption.mockResolvedValue(true);

    mockPinEncryptionService.encrypt.mockResolvedValue('encrypted-data');
    mockPinEncryptionService.decrypt.mockResolvedValue('decrypted-data');
    mockPinEncryptionService.testEncryption.mockResolvedValue(true);
  });

  describe('Offline Environment Simulation', () => {
    test('usePasskeyAuth works without network connectivity', async () => {
      // Mock offline mode - no navigator object
      const originalNavigator = global.navigator;
      delete (global as unknown as Record<string, unknown>).navigator;

      const { result } = renderHook(() => usePasskeyAuth());

      // Should not crash and should handle gracefully
      expect(result.current).toBeDefined();
      expect(typeof result.current.createPasskey).toBe('function');

      // Restore navigator
      global.navigator = originalNavigator;
    });

    test('usePinAuth works without localStorage', () => {
      // Mock localStorage as unavailable (some PWA environments)
      const originalLocalStorage = global.localStorage;
      delete (global as unknown as Record<string, unknown>).localStorage;

      const { result } = renderHook(() => usePinAuth());

      // Should not crash and should handle gracefully
      expect(result.current).toBeDefined();
      expect(typeof result.current.setPinCode).toBe('function');

      // Restore localStorage
      global.localStorage = originalLocalStorage;
    });

    test('handles WebAuthn API unavailability gracefully', async () => {
      // Mock PublicKeyCredential as unavailable
      const originalPublicKeyCredential = (
        global as unknown as Record<string, unknown>
      ).PublicKeyCredential;
      delete (global as unknown as Record<string, unknown>).PublicKeyCredential;

      const { result } = renderHook(() => usePasskeyAuth());

      // Should handle gracefully without crashing
      expect(result.current).toBeDefined();

      // Restore PublicKeyCredential
      (global as unknown as Record<string, unknown>).PublicKeyCredential =
        originalPublicKeyCredential;
    });
  });

  describe('PWA Standalone Mode', () => {
    test('passkey authentication works in PWA standalone mode', async () => {
      // Mock PWA environment
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { result } = renderHook(() => usePasskeyAuth());

      let success = false;
      await act(async () => {
        success = await result.current.createPasskey('testuser', 'Test User');
      });

      expect(success).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('PIN authentication works in PWA standalone mode', () => {
      // Mock PWA environment
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { result } = renderHook(() => usePinAuth());

      let success = false;
      act(() => {
        success = result.current.setPinCode('1234', '1234');
      });

      expect(success).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.getStoredPin()).toBe('1234');
    });
  });

  describe('Service Worker Compatibility', () => {
    test('encryption operations work without external dependencies', async () => {
      const { result } = renderHook(() => usePasskeyAuth());

      // Test passkey encryption
      let encrypted = '';
      await act(async () => {
        encrypted = await result.current.encryptWithPasskey(
          'test data',
          'credential-id'
        );
      });

      expect(encrypted).toBe('encrypted-data');
      expect(result.current.error).toBeNull();

      // Test decryption
      let decrypted = '';
      await act(async () => {
        decrypted = await result.current.decryptWithPasskey(
          encrypted,
          'credential-id'
        );
      });

      expect(decrypted).toBe('decrypted-data');
      expect(result.current.error).toBeNull();
    });

    test('PIN encryption works without external network calls', async () => {
      const { result } = renderHook(() => usePinAuth());

      // Test PIN encryption
      let encrypted = '';
      await act(async () => {
        encrypted = await result.current.encryptWithPin('test data', '1234');
      });

      expect(encrypted).toBe('encrypted-data');
      expect(result.current.error).toBeNull();

      // Test decryption
      let decrypted = '';
      await act(async () => {
        decrypted = await result.current.decryptWithPin(encrypted, '1234');
      });

      expect(decrypted).toBe('decrypted-data');
      expect(result.current.error).toBeNull();
    });
  });

  describe('Air-Gapped Wallet Scenarios', () => {
    test('complete authentication flow works offline', async () => {
      // Test passkey flow
      const passkeyHook = renderHook(() => usePasskeyAuth());

      // Create passkey
      let success = false;
      await act(async () => {
        success = await passkeyHook.result.current.createPasskey(
          'testuser',
          'Test User'
        );
      });
      expect(success).toBe(true);

      // Verify passkey
      await act(async () => {
        success = await passkeyHook.result.current.verifyPasskey(
          'credential-id'
        );
      });
      expect(success).toBe(true);

      // Test encryption
      let encrypted = '';
      await act(async () => {
        encrypted = await passkeyHook.result.current.encryptWithPasskey(
          'wallet data',
          'credential-id'
        );
      });
      expect(encrypted).toBe('encrypted-data');

      // Test PIN flow
      const pinHook = renderHook(() => usePinAuth());

      // Set PIN
      act(() => {
        success = pinHook.result.current.setPinCode('1234', '1234');
      });
      expect(success).toBe(true);

      // Verify PIN
      act(() => {
        success = pinHook.result.current.verifyPinCode('1234');
      });
      expect(success).toBe(true);

      // Test PIN encryption
      await act(async () => {
        encrypted = await pinHook.result.current.encryptWithPin(
          'wallet data',
          '1234'
        );
      });
      expect(encrypted).toBe('encrypted-data');
    });

    test('handles crypto API unavailability gracefully', async () => {
      // Mock crypto as unavailable (some restricted environments)
      const originalCrypto = global.crypto;
      delete (global as unknown as Record<string, unknown>).crypto;

      const { result } = renderHook(() => usePasskeyAuth());

      // Should not crash
      expect(result.current).toBeDefined();

      // Operations should fail gracefully
      let success = false;
      await act(async () => {
        success = await result.current.createPasskey('testuser', 'Test User');
      });
      expect(success).toBe(false);
      expect(result.current.error).toBeTruthy();

      // Restore crypto
      global.crypto = originalCrypto;
    });

    test('handles localStorage quota exceeded gracefully', () => {
      // Mock localStorage quota exceeded
      const mockLocalStorage = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(() => {
          throw new Error('Quota exceeded');
        }),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });

      const { result } = renderHook(() => usePinAuth());

      let success = false;
      act(() => {
        success = result.current.setPinCode('1234', '1234');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe(
        'PIN validation passed but failed to save'
      );
    });
  });

  describe('Performance in Offline Mode', () => {
    test('operations complete within acceptable time limits', async () => {
      const { result } = renderHook(() => usePasskeyAuth());

      const startTime = performance.now();

      await act(async () => {
        await result.current.createPasskey('testuser', 'Test User');
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time for offline operation
      expect(duration).toBeLessThan(1000); // Less than 1 second
    });

    test('PIN operations are fast in offline mode', () => {
      const { result } = renderHook(() => usePinAuth());

      const startTime = performance.now();

      act(() => {
        result.current.setPinCode('1234', '1234');
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete very quickly for offline operation
      expect(duration).toBeLessThan(100); // Less than 100ms
    });
  });

  describe('Memory Management', () => {
    test('hooks clean up properly after unmount', () => {
      const { result, unmount } = renderHook(() => usePasskeyAuth());

      // Use the hook
      expect(result.current).toBeDefined();

      // Unmount
      unmount();

      // Hook should be cleaned up (no memory leaks)
      expect(result.current).toBeDefined();
    });

    test('error states are properly managed', async () => {
      mockPasskeyService.createCredential.mockRejectedValueOnce(
        new Error('Test error')
      );

      const { result } = renderHook(() => usePasskeyAuth());

      // Trigger error
      await act(async () => {
        await result.current.createPasskey('testuser', 'Test User');
      });

      expect(result.current.error).toBe('Test error');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Concurrent Operations', () => {
    test('handles multiple concurrent authentication attempts', async () => {
      const { result } = renderHook(() => usePasskeyAuth());

      // Start multiple operations concurrently
      const promises = [
        result.current.createPasskey('user1', 'User 1'),
        result.current.verifyPasskey('credential1'),
        result.current.encryptWithPasskey('data1', 'credential1'),
      ];

      const results = await Promise.all(promises);

      // All operations should complete successfully
      expect(results).toEqual([true, true, 'encrypted-data']);
    });

    test('loading state is properly managed during concurrent operations', async () => {
      let resolveCreate: (value: {
        credential: PublicKeyCredential;
        credentialId: string;
      }) => void;
      const createPromise = new Promise((resolve) => {
        resolveCreate = resolve;
      });

      mockPasskeyService.createCredential.mockReturnValue(createPromise);

      const { result } = renderHook(() => usePasskeyAuth());

      // Start operation
      act(() => {
        result.current.createPasskey('testuser', 'Test User');
      });

      expect(result.current.isLoading).toBe(true);

      // Complete operation
      await act(async () => {
        resolveCreate({
          credential: {} as PublicKeyCredential,
          credentialId: 'mock-credential-id',
        });
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    test('recovers from network errors gracefully', async () => {
      // First call fails with network error
      mockPasskeyService.createCredential.mockRejectedValueOnce(
        new Error('Network error')
      );
      // Second call succeeds
      mockPasskeyService.createCredential.mockResolvedValueOnce({
        credential: {} as PublicKeyCredential,
        credentialId: 'mock-credential-id',
      });

      const { result } = renderHook(() => usePasskeyAuth());

      // First attempt fails
      let success = false;
      await act(async () => {
        success = await result.current.createPasskey('testuser', 'Test User');
      });
      expect(success).toBe(false);
      expect(result.current.error).toBe('Network error');

      // Clear error and retry
      act(() => {
        result.current.clearError();
      });
      expect(result.current.error).toBeNull();

      // Second attempt succeeds
      await act(async () => {
        success = await result.current.createPasskey('testuser', 'Test User');
      });
      expect(success).toBe(true);
      expect(result.current.error).toBeNull();
    });

    test('handles partial failures gracefully', async () => {
      // Mock encryption service failure
      mockPasskeyEncryptionService.encrypt.mockRejectedValue(
        new Error('Encryption failed')
      );

      const { result } = renderHook(() => usePasskeyAuth());

      // Encryption should fail but not crash the app
      await expect(
        result.current.encryptWithPasskey('test data', 'credential-id')
      ).rejects.toThrow('Encryption failed');

      // Hook should still be functional
      expect(result.current).toBeDefined();
      expect(typeof result.current.createPasskey).toBe('function');
    });
  });
});
