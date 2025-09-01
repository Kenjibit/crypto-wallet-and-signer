/**
 * Step 4.1.14 Validation Tests: PIN Encryption Migration
 *
 * Tests for the PIN encryption migration to useEncryption and usePinAuth hooks
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { FEATURES } from '../../config/features';

// Mock all hooks to return successful responses
vi.mock('../../../hooks/useAuthState', () => ({
  useAuthState: () => ({
    authState: {
      method: 'pin',
      status: 'unauthenticated',
      isPasskeySupported: false,
      isPWA: false,
    },
    setAuthState: vi.fn(),
    sessionAuthenticated: false,
    setSessionAuthenticated: vi.fn(),
  }),
}));

vi.mock('../../../hooks/usePasskeyAuth', () => ({
  usePasskeyAuth: () => ({
    createPasskey: vi.fn(),
    verifyPasskey: vi.fn(),
    verifyCredentialExists: vi.fn(),
    encryptWithPasskey: vi.fn(),
    decryptWithPasskey: vi.fn(),
    testPasskeyEncryption: vi.fn(),
  }),
}));

vi.mock('../../../hooks/usePinAuth', () => ({
  usePinAuth: () => ({
    setPinCode: vi.fn().mockReturnValue(true),
    verifyPinCode: vi.fn().mockReturnValue(true),
    encryptWithPin: vi.fn().mockResolvedValue('encrypted-by-pin-auth'),
    decryptWithPin: vi.fn().mockResolvedValue('decrypted-by-pin-auth'),
    testPinEncryption: vi.fn().mockResolvedValue(true),
    getValidationResult: vi.fn(),
    isLoading: false,
    error: null,
    clearError: vi.fn(),
    getStoredPin: vi.fn().mockReturnValue('1234'),
  }),
}));

vi.mock('../../../hooks/useEncryption', () => ({
  useConditionalEncryption: () => ({
    encryptData: vi.fn().mockResolvedValue('encrypted-data'),
    decryptData: vi.fn().mockResolvedValue('decrypted-data'),
    testEncryption: vi.fn().mockResolvedValue(true),
    encryptWithPasskey: vi.fn().mockResolvedValue('encrypted-data'),
    decryptWithPasskey: vi.fn().mockResolvedValue('decrypted-data'),
    testPasskeyEncryption: vi.fn().mockResolvedValue(true),
    encryptWithPin: vi.fn().mockResolvedValue('encrypted-by-encryption-hook'),
    decryptWithPin: vi.fn().mockResolvedValue('decrypted-by-encryption-hook'),
    validateEncryptedData: vi.fn().mockReturnValue(true),
    getEncryptedDataInfo: vi
      .fn()
      .mockReturnValue({ method: 'pin', version: '1' }),
  }),
}));

describe('AuthContext - Step 4.1.14: PIN Encryption Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure AUTH_ENCRYPTION_HOOK_MIGRATION is enabled for this test
    process.env.NEXT_PUBLIC_AUTH_ENCRYPTION_HOOK_MIGRATION = 'true';
    // Ensure AUTH_PIN_HOOK_MIGRATION is enabled for this test
    process.env.NEXT_PUBLIC_AUTH_PIN_HOOK_MIGRATION = 'true';
  });

  describe('Feature Flag Validation', () => {
    test('should have AUTH_ENCRYPTION_HOOK_MIGRATION enabled', () => {
      expect(FEATURES.AUTH_ENCRYPTION_HOOK_MIGRATION).toBe(true);
    });

    test('should have AUTH_PIN_HOOK_MIGRATION enabled', () => {
      expect(FEATURES.AUTH_PIN_HOOK_MIGRATION).toBe(true);
    });
  });

  describe('PIN Encryption Migration', () => {
    test('should handle PIN encryption calls without throwing', async () => {
      const TestComponent = () => {
        const { encryptWithPin } = useAuth();

        return (
          <button
            data-testid="encrypt-pin-button"
            onClick={() => encryptWithPin('test-data', '1234')}
          >
            Encrypt with PIN
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // This should not throw with our mocked hooks
      await act(async () => {
        getByTestId('encrypt-pin-button').click();
      });
    });

    test('should handle PIN encryption with feature flag disabled', async () => {
      // Temporarily disable encryption hook migration
      process.env.NEXT_PUBLIC_AUTH_ENCRYPTION_HOOK_MIGRATION = 'false';

      const TestComponent = () => {
        const { encryptWithPin } = useAuth();

        return (
          <button
            data-testid="encrypt-pin-button"
            onClick={() => encryptWithPin('test-data', '1234')}
          >
            Encrypt with PIN
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // This should not throw when encryption hook is disabled
      await act(async () => {
        getByTestId('encrypt-pin-button').click();
      });

      // Re-enable encryption hook migration
      process.env.NEXT_PUBLIC_AUTH_ENCRYPTION_HOOK_MIGRATION = 'true';
    });
  });

  describe('PIN Decryption Migration', () => {
    test('should handle PIN decryption calls without throwing', async () => {
      const TestComponent = () => {
        const { decryptWithPin } = useAuth();

        return (
          <button
            data-testid="decrypt-pin-button"
            onClick={() => decryptWithPin('encrypted-data', '1234')}
          >
            Decrypt with PIN
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // This should not throw with our mocked hooks
      await act(async () => {
        getByTestId('decrypt-pin-button').click();
      });
    });

    test('should handle PIN decryption with feature flag disabled', async () => {
      // Temporarily disable encryption hook migration
      process.env.NEXT_PUBLIC_AUTH_ENCRYPTION_HOOK_MIGRATION = 'false';

      const TestComponent = () => {
        const { decryptWithPin } = useAuth();

        return (
          <button
            data-testid="decrypt-pin-button"
            onClick={() => decryptWithPin('encrypted-data', '1234')}
          >
            Decrypt with PIN
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // This should not throw when encryption hook is disabled
      await act(async () => {
        getByTestId('decrypt-pin-button').click();
      });

      // Re-enable encryption hook migration
      process.env.NEXT_PUBLIC_AUTH_ENCRYPTION_HOOK_MIGRATION = 'true';
    });
  });

  describe('Migration Architecture', () => {
    test('should maintain AuthContext API compatibility for encryptWithPin', () => {
      const TestComponent = () => {
        const auth = useAuth();

        // Check that encryptWithPin function exists
        expect(auth).toHaveProperty('encryptWithPin');
        expect(typeof auth.encryptWithPin).toBe('function');

        return <div>Test</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    test('should maintain AuthContext API compatibility for decryptWithPin', () => {
      const TestComponent = () => {
        const auth = useAuth();

        // Check that decryptWithPin function exists
        expect(auth).toHaveProperty('decryptWithPin');
        expect(typeof auth.decryptWithPin).toBe('function');

        return <div>Test</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });
  });
});
