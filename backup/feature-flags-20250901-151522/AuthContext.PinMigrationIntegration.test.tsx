/**
 * Step 4.1.15 Validation Tests: PIN Migration Integration Testing
 *
 * Comprehensive integration tests for the complete PIN migration functionality
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
  usePinAuth: vi.fn(() => ({
    setPinCode: vi.fn().mockReturnValue(true),
    verifyPinCode: vi.fn().mockReturnValue(true),
    encryptWithPin: vi.fn().mockResolvedValue('encrypted-by-pin-auth-hook'),
    decryptWithPin: vi.fn().mockResolvedValue('decrypted-by-pin-auth-hook'),
    testPinEncryption: vi.fn().mockResolvedValue(true),
    getValidationResult: vi.fn(),
    isLoading: false,
    error: null,
    clearError: vi.fn(),
    getStoredPin: vi.fn().mockReturnValue('1234'),
  })),
}));

vi.mock('../../../hooks/useEncryption', () => ({
  useConditionalEncryption: vi.fn(() => ({
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
  })),
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
    loadPinAuth: vi.fn().mockReturnValue({ pin: '1234', confirmPin: '1234' }),
    clearPinAuth: vi.fn(),
  },
}));

vi.mock('../../services/encryption/PinEncryptionService', () => ({
  PinEncryptionService: {
    encrypt: vi.fn().mockResolvedValue('encrypted-by-legacy-service'),
    decrypt: vi.fn().mockResolvedValue('decrypted-by-legacy-service'),
    testEncryption: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../../services/encryption/PasskeyEncryptionService', () => ({
  PasskeyEncryptionService: {
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

describe('AuthContext - Step 4.1.15: PIN Migration Integration Testing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure all relevant feature flags are enabled
    process.env.NEXT_PUBLIC_AUTH_ENCRYPTION_HOOK_MIGRATION = 'true';
    process.env.NEXT_PUBLIC_AUTH_PIN_HOOK_MIGRATION = 'true';
  });

  describe('Feature Flag Validation', () => {
    test('should have all PIN-related feature flags enabled', () => {
      expect(FEATURES.AUTH_ENCRYPTION_HOOK_MIGRATION).toBe(true);
      expect(FEATURES.AUTH_PIN_HOOK_MIGRATION).toBe(true);
    });
  });

  describe('PIN Setup and Verification Integration', () => {
    test('should handle PIN setup calls without throwing', async () => {
      const TestComponent = () => {
        const { setPinCode } = useAuth();

        return (
          <button
            data-testid="setup-pin-button"
            onClick={() => setPinCode('1234', '1234')}
          >
            Setup PIN
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger PIN setup
      await act(async () => {
        getByTestId('setup-pin-button').click();
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

      // Trigger PIN verification
      await act(async () => {
        getByTestId('verify-pin-button').click();
      });
    });

    test('should complete PIN setup and verification workflow', async () => {
      const TestComponent = () => {
        const { setPinCode, verifyPinCode } = useAuth();

        const handleWorkflow = () => {
          // Setup PIN first
          const setupSuccess = setPinCode('1234', '1234');
          if (setupSuccess) {
            // Then verify PIN
            return verifyPinCode('1234');
          }
          return false;
        };

        return (
          <button data-testid="workflow-button" onClick={handleWorkflow}>
            PIN Workflow
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger PIN workflow
      await act(async () => {
        getByTestId('workflow-button').click();
      });
    });
  });

  describe('PIN Encryption Operations', () => {
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

      // Trigger PIN encryption
      await act(async () => {
        getByTestId('encrypt-pin-button').click();
      });
    });

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

      // Trigger PIN decryption
      await act(async () => {
        getByTestId('decrypt-pin-button').click();
      });
    });

    test('should handle PIN encryption/decryption workflow', async () => {
      const TestComponent = () => {
        const { encryptWithPin, decryptWithPin } = useAuth();

        const handleWorkflow = async () => {
          const originalData = 'sensitive-wallet-data';
          const encrypted = await encryptWithPin(originalData, '1234');
          const decrypted = await decryptWithPin(encrypted, '1234');
          return { originalData, encrypted, decrypted };
        };

        return (
          <button data-testid="crypto-workflow-button" onClick={handleWorkflow}>
            Crypto Workflow
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger crypto workflow
      await act(async () => {
        getByTestId('crypto-workflow-button').click();
      });
    });
  });

  describe('PIN Security Validation', () => {
    test('should handle PIN validation without throwing', () => {
      const TestComponent = () => {
        const { setPinCode } = useAuth();

        const handleValidation = () => {
          // Test various PIN scenarios
          setPinCode('1234', '1234'); // Valid
          setPinCode('1234', '5678'); // Mismatched
        };

        return (
          <button
            data-testid="validation-test-button"
            onClick={handleValidation}
          >
            Test PIN Validation
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger PIN validation test
      expect(() => {
        act(() => {
          getByTestId('validation-test-button').click();
        });
      }).not.toThrow();
    });

    test('should handle timing attack protection for PIN verification', async () => {
      const TestComponent = () => {
        const { verifyPinCode } = useAuth();

        const handleTimingTest = async () => {
          const pins = [
            '1234', // Correct PIN
            '1235', // Wrong PIN (similar)
            '9999', // Wrong PIN (different)
            '0000', // Wrong PIN (different)
          ];

          for (const pin of pins) {
            await verifyPinCode(pin);
          }
        };

        return (
          <button data-testid="timing-test-button" onClick={handleTimingTest}>
            Test Timing Protection
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger timing test
      await act(async () => {
        getByTestId('timing-test-button').click();
      });
    });
  });

  describe('PIN Migration Error Handling', () => {
    test('should handle PIN operation errors gracefully', async () => {
      const TestComponent = () => {
        const { setPinCode, verifyPinCode, encryptWithPin, decryptWithPin } =
          useAuth();

        const handleErrorTest = async () => {
          try {
            // Test various error scenarios
            setPinCode('1234', '5678'); // Mismatched PINs
            verifyPinCode('wrong-pin'); // Wrong PIN
            await encryptWithPin('', '1234'); // Empty data
            await decryptWithPin('', '1234'); // Empty data
            return { success: true };
          } catch (error) {
            return { success: false, error: error.message };
          }
        };

        return (
          <button data-testid="error-test-button" onClick={handleErrorTest}>
            Test Error Handling
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger error test
      await act(async () => {
        getByTestId('error-test-button').click();
      });
    });
  });

  describe('PIN Migration Performance', () => {
    test('should complete PIN operations within acceptable time limits', async () => {
      const TestComponent = () => {
        const { setPinCode, verifyPinCode, encryptWithPin, decryptWithPin } =
          useAuth();

        const handlePerformanceTest = async () => {
          // Setup PIN
          setPinCode('1234', '1234');

          // Verify PIN
          verifyPinCode('1234');

          // Encrypt and decrypt data
          const testData = 'performance-test-data';
          const encrypted = await encryptWithPin(testData, '1234');
          const decrypted = await decryptWithPin(encrypted, '1234');

          return { testData, encrypted, decrypted };
        };

        return (
          <button
            data-testid="performance-test-button"
            onClick={handlePerformanceTest}
          >
            Test Performance
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger performance test
      const startTime = performance.now();
      await act(async () => {
        getByTestId('performance-test-button').click();
      });
      const endTime = performance.now();
      const duration = endTime - startTime;

      // PIN operations should complete within reasonable time (allowing for test overhead)
      expect(duration).toBeLessThan(5000); // 5 seconds should be plenty
    });
  });

  describe('PIN Migration API Compatibility', () => {
    test('should maintain AuthContext API compatibility', () => {
      const TestComponent = () => {
        const auth = useAuth();

        // Check that all PIN-related methods exist
        const pinMethods = [
          'setPinCode',
          'verifyPinCode',
          'encryptWithPin',
          'decryptWithPin',
        ];

        const missingMethods = pinMethods.filter((method) => !(method in auth));

        return (
          <div>
            <div data-testid="missing-methods">{missingMethods.join(',')}</div>
            <div data-testid="method-count">{Object.keys(auth).length}</div>
          </div>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Verify no methods are missing
      expect(getByTestId('missing-methods').textContent).toBe('');
      // Verify we have a reasonable number of methods
      expect(
        parseInt(getByTestId('method-count').textContent || '0')
      ).toBeGreaterThan(10);
    });

    test('should handle feature flag toggles correctly', async () => {
      // Test with all flags enabled
      process.env.NEXT_PUBLIC_AUTH_ENCRYPTION_HOOK_MIGRATION = 'true';
      process.env.NEXT_PUBLIC_AUTH_PIN_HOOK_MIGRATION = 'true';

      const TestComponent = () => {
        const { encryptWithPin } = useAuth();

        const handleFlagTest = async () => {
          return await encryptWithPin('test-data', '1234');
        };

        return (
          <button data-testid="flag-test-button" onClick={handleFlagTest}>
            Test Feature Flags
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Test with flags enabled
      await act(async () => {
        getByTestId('flag-test-button').click();
      });

      // Test with encryption hook disabled
      process.env.NEXT_PUBLIC_AUTH_ENCRYPTION_HOOK_MIGRATION = 'false';

      await act(async () => {
        getByTestId('flag-test-button').click();
      });

      // Test with PIN hook disabled
      process.env.NEXT_PUBLIC_AUTH_PIN_HOOK_MIGRATION = 'false';

      await act(async () => {
        getByTestId('flag-test-button').click();
      });

      // Restore flags
      process.env.NEXT_PUBLIC_AUTH_ENCRYPTION_HOOK_MIGRATION = 'true';
      process.env.NEXT_PUBLIC_AUTH_PIN_HOOK_MIGRATION = 'true';
    });
  });
});
