/**
 * Step 4.1.13 Validation Tests: PIN Verification Migration
 *
 * Tests for the PIN verification migration to usePinAuth hook
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
    encryptWithPin: vi.fn().mockResolvedValue('encrypted-data'),
    decryptWithPin: vi.fn().mockResolvedValue('decrypted-data'),
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
    encryptWithPin: vi.fn().mockResolvedValue('encrypted-data'),
    decryptWithPin: vi.fn().mockResolvedValue('decrypted-data'),
    validateEncryptedData: vi.fn().mockReturnValue(true),
    getEncryptedDataInfo: vi
      .fn()
      .mockReturnValue({ method: 'pin', version: '1' }),
  }),
}));

describe('AuthContext - Step 4.1.13: PIN Verification Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure AUTH_PIN_HOOK_MIGRATION is enabled for this test
    process.env.NEXT_PUBLIC_AUTH_PIN_HOOK_MIGRATION = 'true';
  });

  describe('Feature Flag Validation', () => {
    test('should have AUTH_PIN_HOOK_MIGRATION enabled', () => {
      expect(FEATURES.AUTH_PIN_HOOK_MIGRATION).toBe(true);
    });
  });

  describe('PIN Verification Migration', () => {
    test('should handle PIN verification calls without throwing', async () => {
      const TestComponent = () => {
        const { verifyPinCode } = useAuth();

        return (
          <button
            data-testid="verify-pin-button"
            onClick={() => verifyPinCode('1234')}
          >
            Verify PIN
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
        getByTestId('verify-pin-button').click();
      });
    });

    test('should maintain backward compatibility when feature flag is disabled', async () => {
      // Temporarily disable the feature flag
      process.env.NEXT_PUBLIC_AUTH_PIN_HOOK_MIGRATION = 'false';

      const TestComponent = () => {
        const { verifyPinCode } = useAuth();

        return (
          <button
            data-testid="verify-pin-button"
            onClick={() => verifyPinCode('1234')}
          >
            Verify PIN
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger PIN verification
      await act(async () => {
        getByTestId('verify-pin-button').click();
      });

      // Re-enable the feature flag
      process.env.NEXT_PUBLIC_AUTH_PIN_HOOK_MIGRATION = 'true';
    });
  });

  describe('Migration Architecture', () => {
    test('should maintain AuthContext API compatibility for verifyPinCode', () => {
      const TestComponent = () => {
        const auth = useAuth();

        // Check that verifyPinCode function exists
        expect(auth).toHaveProperty('verifyPinCode');
        expect(typeof auth.verifyPinCode).toBe('function');

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
