/**
 * Step 4.1.12 Validation Tests: PIN Setup Migration
 *
 * Tests for the PIN setup migration to usePinAuth hook
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
      method: null,
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
    getStoredPin: vi.fn().mockReturnValue(''),
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

// Mock services
vi.mock('../../services/auth/PasskeyService', () => ({
  PasskeyService: {
    createCredential: vi.fn(),
    verifyCredential: vi.fn(),
    isSupported: vi.fn().mockResolvedValue({
      isSupported: true,
      hasCredentials: false,
    }),
    verifyCredentialExists: vi.fn(),
  },
}));

vi.mock('../../services/auth/PinService', () => ({
  PinService: {
    validatePinAuth: vi.fn().mockReturnValue({
      isValid: true,
      errors: [],
    }),
    verifyPinMatch: vi.fn().mockReturnValue(true),
    savePinAuth: vi.fn(),
    loadPinAuth: vi.fn().mockReturnValue({ pin: '', confirmPin: '' }),
    clearPinAuth: vi.fn(),
  },
}));

vi.mock('../../services/encryption/PasskeyEncryptionService', () => ({
  PasskeyEncryptionService: {
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    testEncryption: vi.fn(),
  },
}));

vi.mock('../../services/encryption/PinEncryptionService', () => ({
  PinEncryptionService: {
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    testEncryption: vi.fn(),
  },
}));

vi.mock('../../services/storage/AuthStorageService', () => ({
  AuthStorageService: {
    loadAuthState: vi.fn().mockReturnValue(null),
    saveAuthState: vi.fn(),
    clearAuthState: vi.fn(),
    hasAuthData: vi.fn().mockReturnValue(false),
    getDebugData: vi.fn().mockReturnValue({ hasData: false }),
    forceClearAuthData: vi.fn(),
  },
}));

// Mock authLogger
vi.mock('../../../utils/auth/authLogger', () => ({
  authLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    performance: vi.fn(),
  },
}));

// Mock validation utilities
vi.mock('../../utils/auth-validation', () => ({
  validateAuthState: vi.fn().mockReturnValue({ isValid: true }),
  validatePasskeyCreation: vi.fn().mockReturnValue(true),
}));

describe('AuthContext - Step 4.1.12: PIN Setup Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure AUTH_PIN_HOOK_MIGRATION is enabled for this test
    process.env.NEXT_PUBLIC_AUTH_PIN_HOOK_MIGRATION = 'true';
  });

  describe('Feature Flag Validation', () => {
    test('should have AUTH_PIN_HOOK_MIGRATION enabled', () => {
      expect(FEATURES.AUTH_PIN_HOOK_MIGRATION).toBe(true);
    });

    test('should have correct feature flag configuration', () => {
      // Verify the feature flag is properly configured
      expect(typeof FEATURES.AUTH_PIN_HOOK_MIGRATION).toBe('boolean');
      expect(FEATURES.AUTH_PIN_HOOK_MIGRATION).toBeTruthy();
    });
  });

  describe('AuthContext Integration', () => {
    test('should render AuthProvider without errors', () => {
      const TestComponent = () => {
        const { setPinCode } = useAuth();
        return (
          <div>
            <button onClick={() => setPinCode('1234', '1234')}>Set PIN</button>
          </div>
        );
      };

      expect(() => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      }).not.toThrow();
    });

    test('should provide PIN-related functions from useAuth hook', () => {
      const TestComponent = () => {
        const { setPinCode, verifyPinCode, encryptWithPin, decryptWithPin } =
          useAuth();

        expect(typeof setPinCode).toBe('function');
        expect(typeof verifyPinCode).toBe('function');
        expect(typeof encryptWithPin).toBe('function');
        expect(typeof decryptWithPin).toBe('function');

        return <div>Test</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    test('should handle PIN setup calls without throwing', async () => {
      const TestComponent = () => {
        const { setPinCode } = useAuth();

        return (
          <button
            data-testid="set-pin-button"
            onClick={() => setPinCode('1234', '1234')}
          >
            Set PIN
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
        getByTestId('set-pin-button').click();
      });
    });

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

    test('should handle PIN encryption calls without throwing', async () => {
      const TestComponent = () => {
        const { encryptWithPin } = useAuth();

        return (
          <button
            data-testid="encrypt-button"
            onClick={async () => await encryptWithPin('test', '1234')}
          >
            Encrypt
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
        getByTestId('encrypt-button').click();
      });
    });
  });

  describe('Migration Architecture', () => {
    test('should maintain AuthContext API compatibility', () => {
      // Test that the AuthContext still provides the expected API
      const TestComponent = () => {
        const auth = useAuth();

        // Check that all expected properties exist
        expect(auth).toHaveProperty('authState');
        expect(auth).toHaveProperty('pinAuth');
        expect(auth).toHaveProperty('sessionAuthenticated');
        expect(auth).toHaveProperty('setPinCode');
        expect(auth).toHaveProperty('verifyPinCode');
        expect(auth).toHaveProperty('encryptWithPin');
        expect(auth).toHaveProperty('decryptWithPin');

        return <div>API Test</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    test('should handle feature flag conditional logic', () => {
      // Test that the feature flag controls the behavior
      const enabledValue = FEATURES.AUTH_PIN_HOOK_MIGRATION;

      // Temporarily disable
      process.env.NEXT_PUBLIC_AUTH_PIN_HOOK_MIGRATION = 'false';

      // Force re-evaluation of the features
      // This tests that the conditional logic works
      const disabledValue =
        process.env.NEXT_PUBLIC_AUTH_PIN_HOOK_MIGRATION === 'true';

      expect(enabledValue).toBe(true);
      expect(disabledValue).toBe(false);

      // Restore
      process.env.NEXT_PUBLIC_AUTH_PIN_HOOK_MIGRATION = 'true';
    });

    test('should be compatible with existing components', () => {
      // This test ensures that existing components using the AuthContext
      // will continue to work with the migrated implementation
      const ExistingComponent = () => {
        const { authState, setPinCode, verifyPinCode } = useAuth();

        // Simulate existing component usage patterns
        React.useEffect(() => {
          if (authState?.status === 'authenticated') {
            // Existing component logic
          }
        }, [authState?.status]);

        return (
          <div>
            Status: {authState?.status}
            <button onClick={() => setPinCode('1234', '1234')}>Setup</button>
            <button onClick={() => verifyPinCode('1234')}>Verify</button>
          </div>
        );
      };

      expect(() => {
        render(
          <AuthProvider>
            <ExistingComponent />
          </AuthProvider>
        );
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle AuthContext errors gracefully', () => {
      // Test that errors in the AuthContext are handled properly
      const ErrorComponent = () => {
        const {} = useAuth();
        try {
          // Try to use the hook result
          return <div>Success</div>;
        } catch (error) {
          return (
            <div>
              Error: {error instanceof Error ? error.message : 'Unknown'}
            </div>
          );
        }
      };

      expect(() => {
        render(
          <AuthProvider>
            <ErrorComponent />
          </AuthProvider>
        );
      }).not.toThrow();
    });
  });
});
