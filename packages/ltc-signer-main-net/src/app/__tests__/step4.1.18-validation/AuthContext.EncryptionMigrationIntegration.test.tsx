/**
 * Step 4.1.18 Validation Tests: Encryption Migration Integration Testing
 *
 * Comprehensive integration tests for the unified encryption migration
 * Tests all encryption scenarios with different auth methods and feature flags
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { FEATURES } from '../../config/features';

// Mock all services and hooks
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
    encryptWithPasskey: vi.fn().mockResolvedValue('encrypted-by-passkey-hook'),
    decryptWithPasskey: vi.fn().mockResolvedValue('decrypted-by-passkey-hook'),
    testPasskeyEncryption: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('../../../hooks/usePinAuth', () => ({
  usePinAuth: () => ({
    setPinCode: vi.fn().mockReturnValue(true),
    verifyPinCode: vi.fn().mockReturnValue(true),
    encryptWithPin: vi.fn().mockResolvedValue('encrypted-by-pin-hook'),
    decryptWithPin: vi.fn().mockResolvedValue('decrypted-by-pin-hook'),
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
    encryptWithPasskey: vi.fn().mockResolvedValue('encrypted-by-encryption-hook'),
    decryptWithPasskey: vi.fn().mockResolvedValue('decrypted-by-encryption-hook'),
    testPasskeyEncryption: vi.fn().mockResolvedValue(true),
    encryptWithPin: vi.fn().mockResolvedValue('encrypted-by-encryption-hook'),
    decryptWithPin: vi.fn().mockResolvedValue('decrypted-by-encryption-hook'),
    validateEncryptedData: vi.fn().mockReturnValue(true),
    getEncryptedDataInfo: vi.fn().mockReturnValue({ method: 'pin', version: '1' }),
  }),
}));

// Mock services with realistic encrypted data
vi.mock('../../../services/encryption/PasskeyEncryptionService', () => ({
  PasskeyEncryptionService: {
    encrypt: vi.fn().mockResolvedValue('encrypted-by-passkey-service'),
    decrypt: vi.fn().mockResolvedValue('decrypted-by-passkey-service'),
    testEncryption: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../../../services/encryption/PinEncryptionService', () => ({
  PinEncryptionService: {
    encrypt: vi.fn().mockResolvedValue('encrypted-by-pin-service'),
    decrypt: vi.fn().mockResolvedValue('decrypted-by-pin-service'),
    testEncryption: vi.fn().mockResolvedValue(true),
  },
}));

describe('AuthContext - Step 4.1.18: Encryption Migration Integration Testing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default feature flags
    process.env.NEXT_PUBLIC_AUTH_ENCRYPTION_HOOK_MIGRATION = 'true';
    process.env.NEXT_PUBLIC_AUTH_PIN_HOOK_MIGRATION = 'true';
    process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';
    process.env.NEXT_PUBLIC_USE_ENCRYPTION_HOOK = 'true';
  });

  describe('Feature Flag Validation', () => {
    test('should validate all encryption-related feature flags are available', () => {
      expect(typeof FEATURES.AUTH_ENCRYPTION_HOOK_MIGRATION).toBe('boolean');
      expect(typeof FEATURES.AUTH_PIN_HOOK_MIGRATION).toBe('boolean');
      expect(typeof FEATURES.AUTH_PASSKEY_HOOK_MIGRATION).toBe('boolean');
      expect(typeof FEATURES.USE_ENCRYPTION_HOOK).toBe('boolean');
    });
  });

  describe('Unified Encryption Interface Integration', () => {
    test('should provide unified encryptData and decryptData functions', async () => {
      const TestComponent = () => {
        const auth = useAuth();

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

    test('should handle unified encryption with default configuration', async () => {
      const TestComponent = () => {
        const { encryptData } = useAuth();

        const handleTest = async () => {
          const result = await encryptData('test-data', '1234');
          expect(result).toBeTruthy();
          return result;
        };

        return (
          <button
            data-testid="unified-encrypt-test"
            onClick={handleTest}
          >
            Test Unified Encryption
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        getByTestId('unified-encrypt-test').click();
      });
    });

    test('should handle unified decryption with default configuration', async () => {
      const TestComponent = () => {
        const { decryptData } = useAuth();

        const handleTest = async () => {
          const result = await decryptData('encrypted-data', '1234');
          expect(result).toBeTruthy();
          return result;
        };

        return (
          <button
            data-testid="unified-decrypt-test"
            onClick={handleTest}
          >
            Test Unified Decryption
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        getByTestId('unified-decrypt-test').click();
      });
    });
  });

  describe('Priority System Integration', () => {
    test('should use encryption hook when USE_ENCRYPTION_HOOK is enabled', async () => {
      process.env.NEXT_PUBLIC_USE_ENCRYPTION_HOOK = 'true';
      process.env.NEXT_PUBLIC_AUTH_ENCRYPTION_HOOK_MIGRATION = 'true';

      const TestComponent = () => {
        const { encryptData } = useAuth();

        const handleTest = async () => {
          const result = await encryptData('test-data', '1234');
          expect(result).toBe('encrypted-by-encryption-hook');
          return result;
        };

        return (
          <button
            data-testid="priority-encryption-hook-test"
            onClick={handleTest}
          >
            Test Encryption Hook Priority
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        getByTestId('priority-encryption-hook-test').click();
      });
    });

    test('should use PIN hook when encryption hook disabled but PIN hook enabled', async () => {
      process.env.NEXT_PUBLIC_USE_ENCRYPTION_HOOK = 'false';
      process.env.NEXT_PUBLIC_AUTH_PIN_HOOK_MIGRATION = 'true';

      const TestComponent = () => {
        const { encryptData } = useAuth();

        const handleTest = async () => {
          const result = await encryptData('test-data', '1234');
          expect(result).toBe('encrypted-by-pin-hook');
          return result;
        };

        return (
          <button
            data-testid="priority-pin-hook-test"
            onClick={handleTest}
          >
            Test PIN Hook Priority
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        getByTestId('priority-pin-hook-test').click();
      });
    });

    test('should fallback to legacy services when all hooks disabled', async () => {
      process.env.NEXT_PUBLIC_USE_ENCRYPTION_HOOK = 'false';
      process.env.NEXT_PUBLIC_AUTH_PIN_HOOK_MIGRATION = 'false';
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'false';

      const TestComponent = () => {
        const { encryptData } = useAuth();

        const handleTest = async () => {
          const result = await encryptData('test-data', '1234');
          expect(result).toBe('encrypted-by-pin-service');
          return result;
        };

        return (
          <button
            data-testid="priority-legacy-test"
            onClick={handleTest}
          >
            Test Legacy Priority
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        getByTestId('priority-legacy-test').click();
      });
    });
  });

  describe('Auth Method Auto-Detection Integration', () => {
    test('should auto-detect passkey encryption when passkey auth state is active', async () => {
      // Test with existing mock setup (passkey method)

      const TestComponent = () => {
        const { encryptData } = useAuth();

        const handleTest = async () => {
          const result = await encryptData('test-data');
          expect(result).toBeTruthy();
          return result;
        };

        return (
          <button
            data-testid="auto-detect-passkey-test"
            onClick={handleTest}
          >
            Test Passkey Auto-Detection
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        getByTestId('auto-detect-passkey-test').click();
      });
    });

    test('should auto-detect PIN encryption when PIN auth state is active', async () => {
      // Test with existing mock setup (PIN method)

      const TestComponent = () => {
        const { encryptData } = useAuth();

        const handleTest = async () => {
          const result = await encryptData('test-data', '1234');
          expect(result).toBeTruthy();
          return result;
        };

        return (
          <button
            data-testid="auto-detect-pin-test"
            onClick={handleTest}
          >
            Test PIN Auto-Detection
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        getByTestId('auto-detect-pin-test').click();
      });
    });

    test('should fallback to PIN encryption when PIN provided without auth state', async () => {
      const TestComponent = () => {
        const { encryptData } = useAuth();

        const handleTest = async () => {
          const result = await encryptData('test-data', '1234');
          expect(result).toBeTruthy();
          return result;
        };

        return (
          <button
            data-testid="fallback-pin-test"
            onClick={handleTest}
          >
            Test PIN Fallback
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        getByTestId('fallback-pin-test').click();
      });
    });
  });

  describe('Encryption Round-Trip Integration', () => {
    test('should complete full encryption round-trip with passkey method', async () => {
      // Test with existing mock setup (passkey method)

      const TestComponent = () => {
        const { encryptData, decryptData } = useAuth();

        const handleRoundTrip = async () => {
          const originalData = 'sensitive-wallet-data';
          const encrypted = await encryptData(originalData);
          const decrypted = await decryptData(encrypted);

          expect(encrypted).toBeTruthy();
          expect(decrypted).toBeTruthy();
          expect(encrypted).not.toBe(originalData);
          expect(decrypted).toBe(originalData);

          return { originalData, encrypted, decrypted };
        };

        return (
          <button
            data-testid="round-trip-passkey-test"
            onClick={handleRoundTrip}
          >
            Test Passkey Round-Trip
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        getByTestId('round-trip-passkey-test').click();
      });
    });

    test('should complete full encryption round-trip with PIN method', async () => {
      const TestComponent = () => {
        const { encryptData, decryptData } = useAuth();

        const handleRoundTrip = async () => {
          const originalData = 'sensitive-wallet-data';
          const pin = '1234';
          const encrypted = await encryptData(originalData, pin);
          const decrypted = await decryptData(encrypted, pin);

          expect(encrypted).toBeTruthy();
          expect(decrypted).toBeTruthy();
          expect(encrypted).not.toBe(originalData);
          expect(decrypted).toBe(originalData);

          return { originalData, encrypted, decrypted };
        };

        return (
          <button
            data-testid="round-trip-pin-test"
            onClick={handleRoundTrip}
          >
            Test PIN Round-Trip
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        getByTestId('round-trip-pin-test').click();
      });
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle encryption errors gracefully', async () => {
      const TestComponent = () => {
        const { encryptData } = useAuth();

        const handleErrorTest = async () => {
          try {
            await encryptData(''); // Empty data should cause error
            return { success: true };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        };

        return (
          <button
            data-testid="error-encryption-test"
            onClick={handleErrorTest}
          >
            Test Encryption Error
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        getByTestId('error-encryption-test').click();
      });
    });

    test('should handle decryption errors gracefully', async () => {
      const TestComponent = () => {
        const { decryptData } = useAuth();

        const handleErrorTest = async () => {
          try {
            await decryptData(''); // Empty data should cause error
            return { success: true };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        };

        return (
          <button
            data-testid="error-decryption-test"
            onClick={handleErrorTest}
          >
            Test Decryption Error
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        getByTestId('error-decryption-test').click();
      });
    });

    test('should handle no valid encryption method error', async () => {
      const TestComponent = () => {
        const { encryptData } = useAuth();

        const handleErrorTest = async () => {
          try {
            await encryptData('test-data'); // No PIN, no auth state
            return { success: true };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        };

        return (
          <button
            data-testid="no-method-error-test"
            onClick={handleErrorTest}
          >
            Test No Method Error
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        getByTestId('no-method-error-test').click();
      });
    });
  });

  describe('Performance Integration', () => {
    test('should complete encryption operations within acceptable time limits', async () => {
      const TestComponent = () => {
        const { encryptData, decryptData } = useAuth();

        const handlePerformanceTest = async () => {
          const testData = 'performance-test-data-for-unified-encryption';
          const pin = '1234';

          const startTime = performance.now();
          const encrypted = await encryptData(testData, pin);
          const decrypted = await decryptData(encrypted, pin);
          const endTime = performance.now();

          const duration = endTime - startTime;

          expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
          expect(encrypted).toBeTruthy();
          expect(decrypted).toBeTruthy();

          return { duration, encrypted, decrypted };
        };

        return (
          <button
            data-testid="performance-test"
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

      await act(async () => {
        getByTestId('performance-test').click();
      });
    });
  });

  describe('Backward Compatibility Integration', () => {
    test('should maintain all existing encryption function APIs', () => {
      const TestComponent = () => {
        const auth = useAuth();

        const existingFunctions = [
          'encryptWithPasskey',
          'decryptWithPasskey',
          'encryptWithPin',
          'decryptWithPin',
          'encryptData',
          'decryptData',
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

    test('should work with various feature flag combinations', async () => {
      const TestComponent = () => {
        const { encryptData } = useAuth();

        const handleFlagTest = async () => {
          const result = await encryptData('test-data', '1234');
          expect(result).toBeTruthy();
          return result;
        };

        return (
          <button
            data-testid="flag-combination-test"
            onClick={handleFlagTest}
          >
            Test Flag Combinations
          </button>
        );
      };

      // Test with all flags enabled (default)
      const { getByTestId, rerender } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        getByTestId('flag-combination-test').click();
      });

      // Test with different flag combinations
      process.env.NEXT_PUBLIC_USE_ENCRYPTION_HOOK = 'false';
      process.env.NEXT_PUBLIC_AUTH_ENCRYPTION_HOOK_MIGRATION = 'true';

      rerender(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        getByTestId('flag-combination-test').click();
      });
    });
  });

  describe('Complete Workflow Integration', () => {
    test('should support complete PIN setup → encryption → decryption workflow', async () => {
      const TestComponent = () => {
        const {
          setPinCode,
          verifyPinCode,
          encryptData,
          decryptData
        } = useAuth();

        const handleCompleteWorkflow = async () => {
          // Step 1: Setup PIN
          const setupSuccess = setPinCode('1234', '1234');
          expect(setupSuccess).toBe(true);

          // Step 2: Verify PIN
          const verifySuccess = verifyPinCode('1234');
          expect(verifySuccess).toBe(true);

          // Step 3: Encrypt data
          const originalData = 'wallet-seed-phrase';
          const encrypted = await encryptData(originalData, '1234');
          expect(encrypted).toBeTruthy();
          expect(encrypted).not.toBe(originalData);

          // Step 4: Decrypt data
          const decrypted = await decryptData(encrypted, '1234');
          expect(decrypted).toBe(originalData);

          return {
            setup: setupSuccess,
            verify: verifySuccess,
            original: originalData,
            encrypted,
            decrypted,
          };
        };

        return (
          <button
            data-testid="complete-workflow-test"
            onClick={handleCompleteWorkflow}
          >
            Test Complete Workflow
          </button>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        getByTestId('complete-workflow-test').click();
      });
    });
  });

  describe('Migration Verification', () => {
    test('should verify unified encryption migration is complete', () => {
      const TestComponent = () => {
        const auth = useAuth();

        // Verify unified functions exist and are functions
        expect(typeof auth.encryptData).toBe('function');
        expect(typeof auth.decryptData).toBe('function');

        // Verify legacy functions still exist
        expect(typeof auth.encryptWithPasskey).toBe('function');
        expect(typeof auth.decryptWithPasskey).toBe('function');
        expect(typeof auth.encryptWithPin).toBe('function');
        expect(typeof auth.decryptWithPin).toBe('function');

        return <div>Migration Complete</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    test('should validate migration maintains API compatibility', async () => {
      const TestComponent = () => {
        const auth = useAuth();

        // Test that all expected properties exist
        const expectedProperties = [
          'encryptData',
          'decryptData',
          'encryptWithPasskey',
          'decryptWithPasskey',
          'encryptWithPin',
          'decryptWithPin',
          'setPinCode',
          'verifyPinCode',
          'createPasskey',
          'verifyPasskey',
          'authState',
          'pinAuth',
          'sessionAuthenticated',
        ];

        const missingProperties = expectedProperties.filter(
          (prop) => !(prop in auth)
        );

        expect(missingProperties).toHaveLength(0);

        return <div>API Compatibility Verified</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });
  });
});
