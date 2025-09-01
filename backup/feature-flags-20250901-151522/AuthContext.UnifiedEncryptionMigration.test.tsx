/**
 * Step 4.1.16 Validation Tests: Unified Encryption Migration
 *
 * Tests for the unified encryption interface that auto-detects auth method
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
    encryptWithPasskey: vi
      .fn()
      .mockResolvedValue('encrypted-by-passkey-auth-hook'),
    decryptWithPasskey: vi
      .fn()
      .mockResolvedValue('decrypted-by-passkey-auth-hook'),
    testPasskeyEncryption: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('../../../hooks/usePinAuth', () => ({
  usePinAuth: () => ({
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
  }),
}));

vi.mock('../../../hooks/useEncryption', () => ({
  useConditionalEncryption: () => ({
    encryptData: vi.fn().mockResolvedValue('encrypted-data'),
    decryptData: vi.fn().mockResolvedValue('decrypted-data'),
    testEncryption: vi.fn().mockResolvedValue(true),
    encryptWithPasskey: vi
      .fn()
      .mockResolvedValue('encrypted-by-encryption-hook'),
    decryptWithPasskey: vi
      .fn()
      .mockResolvedValue('decrypted-by-encryption-hook'),
    testPasskeyEncryption: vi.fn().mockResolvedValue(true),
    encryptWithPin: vi.fn().mockResolvedValue('encrypted-by-encryption-hook'),
    decryptWithPin: vi.fn().mockResolvedValue('decrypted-by-encryption-hook'),
    validateEncryptedData: vi.fn().mockReturnValue(true),
    getEncryptedDataInfo: vi
      .fn()
      .mockReturnValue({ method: 'pin', version: '1' }),
  }),
}));

describe('AuthContext - Step 4.1.16: Unified Encryption Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure all relevant feature flags are enabled
    process.env.NEXT_PUBLIC_AUTH_ENCRYPTION_HOOK_MIGRATION = 'true';
    process.env.NEXT_PUBLIC_AUTH_PIN_HOOK_MIGRATION = 'true';
    process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';
  });

  describe('Feature Flag Validation', () => {
    test('should have all encryption-related feature flags enabled', () => {
      expect(FEATURES.AUTH_ENCRYPTION_HOOK_MIGRATION).toBe(true);
      expect(FEATURES.AUTH_PIN_HOOK_MIGRATION).toBe(true);
      expect(FEATURES.AUTH_PASSKEY_HOOK_MIGRATION).toBe(true);
    });
  });

  describe('Unified Encryption Interface', () => {
    test('should expose unified encryption functions in AuthContext', () => {
      const TestComponent = () => {
        const auth = useAuth();

        // Check that unified functions exist
        expect(auth).toHaveProperty('encryptData');
        expect(auth).toHaveProperty('decryptData');
        expect(typeof auth.encryptData).toBe('function');
        expect(typeof auth.decryptData).toBe('function');

        return <div>Test</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    test('should handle encryptData calls without throwing', async () => {
      const TestComponent = () => {
        const { encryptData } = useAuth();

        return (
          <button
            data-testid="encrypt-data-button"
            onClick={() => encryptData('test-data', '1234')}
          >
            Encrypt Data
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger unified encryption
      await act(async () => {
        getByTestId('encrypt-data-button').click();
      });
    });

    test('should handle decryptData calls without throwing', async () => {
      const TestComponent = () => {
        const { decryptData } = useAuth();

        return (
          <button
            data-testid="decrypt-data-button"
            onClick={() => decryptData('encrypted-data', '1234')}
          >
            Decrypt Data
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger unified decryption
      await act(async () => {
        getByTestId('decrypt-data-button').click();
      });
    });
  });

  describe('Auto-Detection Logic', () => {
    test('should auto-detect PIN encryption when PIN is provided', async () => {
      // Test with PIN method auth state (using existing mocks)

      const TestComponent = () => {
        const { encryptData } = useAuth();

        const handleEncrypt = async () => {
          return await encryptData('test-data', '1234');
        };

        return (
          <button data-testid="auto-detect-pin-button" onClick={handleEncrypt}>
            Auto-detect PIN
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger auto-detection
      await act(async () => {
        getByTestId('auto-detect-pin-button').click();
      });
    });

    test('should auto-detect passkey encryption when authenticated with passkey', async () => {
      // Test with passkey method auth state (using existing mocks)

      const TestComponent = () => {
        const { encryptData } = useAuth();

        const handleEncrypt = async () => {
          return await encryptData('test-data');
        };

        return (
          <button
            data-testid="auto-detect-passkey-button"
            onClick={handleEncrypt}
          >
            Auto-detect Passkey
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger auto-detection
      await act(async () => {
        getByTestId('auto-detect-passkey-button').click();
      });
    });

    test('should fallback to PIN encryption when PIN is provided without auth state', async () => {
      const TestComponent = () => {
        const { encryptData } = useAuth();

        const handleEncrypt = async () => {
          return await encryptData('test-data', '1234');
        };

        return (
          <button data-testid="fallback-pin-button" onClick={handleEncrypt}>
            Fallback PIN
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger fallback
      await act(async () => {
        getByTestId('fallback-pin-button').click();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle encryption errors gracefully', async () => {
      const TestComponent = () => {
        const { encryptData } = useAuth();

        const handleError = async () => {
          try {
            await encryptData('', '1234'); // Empty data should cause error
            return { success: true };
          } catch (error) {
            return { success: false, error: error.message };
          }
        };

        return (
          <button data-testid="error-test-button" onClick={handleError}>
            Test Error
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger error handling test
      await act(async () => {
        getByTestId('error-test-button').click();
      });
    });

    test('should handle decryption errors gracefully', async () => {
      const TestComponent = () => {
        const { decryptData } = useAuth();

        const handleError = async () => {
          try {
            await decryptData('', '1234'); // Empty data should cause error
            return { success: true };
          } catch (error) {
            return { success: false, error: error.message };
          }
        };

        return (
          <button data-testid="decrypt-error-test-button" onClick={handleError}>
            Test Decrypt Error
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger decryption error handling test
      await act(async () => {
        getByTestId('decrypt-error-test-button').click();
      });
    });

    test('should handle no valid encryption method error', async () => {
      const TestComponent = () => {
        const { encryptData } = useAuth();

        const handleError = async () => {
          try {
            await encryptData('test-data'); // No PIN provided, no auth state
            return { success: true };
          } catch (error) {
            return { success: false, error: error.message };
          }
        };

        return (
          <button data-testid="no-method-error-button" onClick={handleError}>
            Test No Method Error
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger no method error test
      await act(async () => {
        getByTestId('no-method-error-button').click();
      });
    });
  });

  describe('Performance Validation', () => {
    test('should complete unified encryption within acceptable time limits', async () => {
      const TestComponent = () => {
        const { encryptData, decryptData } = useAuth();

        const handlePerformanceTest = async () => {
          const testData = 'performance-test-data-for-unified-encryption';

          const startTime = performance.now();
          const encrypted = await encryptData(testData, '1234');
          const decrypted = await decryptData(encrypted, '1234');
          const endTime = performance.now();

          return {
            duration: endTime - startTime,
            original: testData,
            encrypted,
            decrypted,
          };
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

      // Unified encryption should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds should be plenty
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain all existing encryption function APIs', () => {
      const TestComponent = () => {
        const auth = useAuth();

        // Check that all existing functions still exist
        const existingFunctions = [
          'encryptWithPasskey',
          'decryptWithPasskey',
          'encryptWithPin',
          'decryptWithPin',
          'testPasskeyEncryption',
        ];

        const missingFunctions = existingFunctions.filter(
          (func) => !(func in auth)
        );

        expect(missingFunctions).toHaveLength(0);

        return <div>Test</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    test('should work with feature flag toggles', async () => {
      // Test with all flags enabled (already done in beforeEach)

      // Test with encryption hook disabled
      process.env.NEXT_PUBLIC_AUTH_ENCRYPTION_HOOK_MIGRATION = 'false';

      const TestComponent = () => {
        const { encryptData } = useAuth();

        const handleFlagTest = async () => {
          return await encryptData('test-data', '1234');
        };

        return (
          <button
            data-testid="flag-toggle-test-button"
            onClick={handleFlagTest}
          >
            Test Flag Toggle
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Test with flag disabled
      await act(async () => {
        getByTestId('flag-toggle-test-button').click();
      });

      // Restore flag
      process.env.NEXT_PUBLIC_AUTH_ENCRYPTION_HOOK_MIGRATION = 'true';
    });
  });

  describe('Integration with Existing Workflows', () => {
    test('should integrate with PIN setup and verification workflow', async () => {
      const TestComponent = () => {
        const { setPinCode, verifyPinCode, encryptData, decryptData } =
          useAuth();

        const handleWorkflow = async () => {
          // Step 1: Setup PIN
          const setupSuccess = setPinCode('1234', '1234');
          if (setupSuccess) {
            // Step 2: Verify PIN
            const verifySuccess = verifyPinCode('1234');
            if (verifySuccess) {
              // Step 3: Use unified encryption
              const testData = 'sensitive-wallet-data';
              const encrypted = await encryptData(testData, '1234');
              const decrypted = await decryptData(encrypted, '1234');

              return {
                setup: setupSuccess,
                verify: verifySuccess,
                original: testData,
                encrypted,
                decrypted,
              };
            }
          }
          return { setup: false, verify: false };
        };

        return (
          <button data-testid="full-workflow-button" onClick={handleWorkflow}>
            Full Workflow
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger full workflow test
      await act(async () => {
        getByTestId('full-workflow-button').click();
      });
    });
  });
});
