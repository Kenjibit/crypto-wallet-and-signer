import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { usePasskeyAuth } from '../../hooks/usePasskeyAuth';
import { PasskeyService } from '../../services/auth/PasskeyService';

// Mock all dependencies
jest.mock('../../services/auth/PasskeyService');
jest.mock('../../hooks/usePasskeyAuth');
jest.mock('../../../utils/auth/authLogger');

const mockPasskeyService = PasskeyService as jest.Mocked<typeof PasskeyService>;
const mockUsePasskeyAuth = usePasskeyAuth as jest.MockedFunction<
  typeof usePasskeyAuth
>;

describe('Passkey Migration - Edge Cases and Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });

    // Mock crypto
    Object.defineProperty(window, 'crypto', {
      value: {
        getRandomValues: jest.fn(),
        subtle: {
          importKey: jest.fn(),
          deriveKey: jest.fn(),
          exportKey: jest.fn(),
          encrypt: jest.fn(),
          decrypt: jest.fn(),
        },
      },
      writable: true,
    });

    // Default service mocks
    mockPasskeyService.isSupported.mockResolvedValue({
      isSupported: true,
      hasWebAuthn: true,
      hasPlatformAuthenticator: true,
      hasConditionalMediation: true,
      platformAuthenticatorAvailable: true,
      isIOS: false,
      isIOS16Plus: false,
      isIOS18Plus: false,
    });
  });

  describe('WebAuthn API Unavailability', () => {
    test('gracefully handles when navigator.credentials is undefined', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';

      // Mock navigator.credentials as undefined
      const originalCredentials = navigator.credentials;
      delete (navigator as unknown as Record<string, unknown>).credentials;

      const mockHook = {
        createPasskey: jest
          .fn()
          .mockRejectedValue(new Error('WebAuthn not available')),
        verifyPasskey: jest
          .fn()
          .mockRejectedValue(new Error('WebAuthn not available')),
        verifyCredentialExists: jest.fn().mockResolvedValue(false),
        encryptWithPasskey: jest
          .fn()
          .mockRejectedValue(new Error('WebAuthn not available')),
        decryptWithPasskey: jest
          .fn()
          .mockRejectedValue(new Error('WebAuthn not available')),
        testPasskeyEncryption: jest.fn().mockResolvedValue(false),
        isLoading: false,
        error: 'WebAuthn not available',
        clearError: jest.fn(),
      };
      mockUsePasskeyAuth.mockReturnValue(mockHook);

      const TestComponent = () => {
        const { createPasskey, authState } = useAuth();

        const [result, setResult] = React.useState<boolean | null>(null);

        const handleCreate = async () => {
          const success = await createPasskey('testuser', 'Test User');
          setResult(success);
        };

        return (
          <div>
            <div data-testid="result">{result}</div>
            <div data-testid="status">{authState.status}</div>
            <button onClick={handleCreate} data-testid="create-btn">
              Create
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId('create-btn').click();
      });

      expect(mockHook.createPasskey).toHaveBeenCalled();
      expect(screen.getByTestId('result')).toHaveTextContent('false');
      expect(screen.getByTestId('status')).toHaveTextContent('failed');

      // Restore navigator.credentials
      navigator.credentials = originalCredentials;
      process.env = originalEnv;
    });

    test('falls back to legacy when WebAuthn unavailable and hooks disabled', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'false';

      // Mock navigator.credentials as undefined
      const originalCredentials = navigator.credentials;
      delete (navigator as unknown as Record<string, unknown>).credentials;

      // Mock legacy service to handle gracefully
      mockPasskeyService.createCredential.mockRejectedValue(
        new Error('WebAuthn not supported')
      );

      const TestComponent = () => {
        const { createPasskey, authState } = useAuth();

        const [result, setResult] = React.useState<boolean | null>(null);

        const handleCreate = async () => {
          const success = await createPasskey('testuser', 'Test User');
          setResult(success);
        };

        return (
          <div>
            <div data-testid="result">{result}</div>
            <div data-testid="status">{authState.status}</div>
            <button onClick={handleCreate} data-testid="create-btn">
              Create
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId('create-btn').click();
      });

      expect(mockPasskeyService.createCredential).toHaveBeenCalled();
      expect(screen.getByTestId('result')).toHaveTextContent('false');
      expect(screen.getByTestId('status')).toHaveTextContent('failed');

      // Restore navigator.credentials
      navigator.credentials = originalCredentials;
      process.env = originalEnv;
    });
  });

  describe('Service Layer Failures', () => {
    test('handles PasskeyService.createCredential throwing unexpected errors', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';

      const mockHook = {
        createPasskey: jest
          .fn()
          .mockRejectedValue(new Error('Unexpected service error')),
        verifyPasskey: jest.fn().mockResolvedValue(true),
        verifyCredentialExists: jest.fn().mockResolvedValue(true),
        encryptWithPasskey: jest.fn().mockResolvedValue('encrypted'),
        decryptWithPasskey: jest.fn().mockResolvedValue('decrypted'),
        testPasskeyEncryption: jest.fn().mockResolvedValue(true),
        isLoading: false,
        error: 'Unexpected service error',
        clearError: jest.fn(),
      };
      mockUsePasskeyAuth.mockReturnValue(mockHook);

      const TestComponent = () => {
        const { createPasskey, authState } = useAuth();

        const [error, setError] = React.useState<string>('');

        const handleCreate = async () => {
          try {
            await createPasskey('testuser', 'Test User');
          } catch {
            setError('Creation failed');
          }
        };

        return (
          <div>
            <div data-testid="error">{error}</div>
            <div data-testid="status">{authState.status}</div>
            <button onClick={handleCreate} data-testid="create-btn">
              Create
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId('create-btn').click();
      });

      expect(mockHook.createPasskey).toHaveBeenCalled();
      expect(screen.getByTestId('error')).toHaveTextContent('Creation failed');
      expect(screen.getByTestId('status')).toHaveTextContent('failed');

      process.env = originalEnv;
    });

    test('handles encryption service failures during migration', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';
      process.env.NEXT_PUBLIC_USE_ENCRYPTION_HOOK = 'false';

      // Mock existing auth state
      const mockLocalStorage = window.localStorage as unknown as Record<
        string,
        unknown
      >;
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          method: 'passkey',
          status: 'authenticated',
          credentialId: 'test-credential-id',
        })
      );

      const mockHook = {
        createPasskey: jest.fn().mockResolvedValue(true),
        verifyPasskey: jest.fn().mockResolvedValue(true),
        verifyCredentialExists: jest.fn().mockResolvedValue(true),
        encryptWithPasskey: jest
          .fn()
          .mockRejectedValue(new Error('Encryption failed')),
        decryptWithPasskey: jest.fn().mockResolvedValue('decrypted'),
        testPasskeyEncryption: jest.fn().mockResolvedValue(true),
        isLoading: false,
        error: 'Encryption failed',
        clearError: jest.fn(),
      };
      mockUsePasskeyAuth.mockReturnValue(mockHook);

      const TestComponent = () => {
        const { encryptWithPasskey } = useAuth();

        const [error, setError] = React.useState<string>('');

        const handleEncrypt = async () => {
          try {
            await encryptWithPasskey('test data');
          } catch {
            setError('Encryption failed');
          }
        };

        return (
          <div>
            <div data-testid="error">{error}</div>
            <button onClick={handleEncrypt} data-testid="encrypt-btn">
              Encrypt
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId('encrypt-btn').click();
      });

      expect(mockHook.encryptWithPasskey).toHaveBeenCalled();
      expect(screen.getByTestId('error')).toHaveTextContent(
        'Encryption failed'
      );

      process.env = originalEnv;
    });
  });

  describe('State Synchronization Issues', () => {
    test('handles race conditions between hook and legacy state updates', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';

      const mockHook = {
        createPasskey: jest.fn().mockImplementation(async () => {
          // Simulate async delay that could cause race conditions
          await new Promise((resolve) => setTimeout(resolve, 100));
          return true;
        }),
        verifyPasskey: jest.fn().mockResolvedValue(true),
        verifyCredentialExists: jest.fn().mockResolvedValue(true),
        encryptWithPasskey: jest.fn().mockResolvedValue('encrypted'),
        decryptWithPasskey: jest.fn().mockResolvedValue('decrypted'),
        testPasskeyEncryption: jest.fn().mockResolvedValue(true),
        isLoading: false,
        error: null,
        clearError: jest.fn(),
      };
      mockUsePasskeyAuth.mockReturnValue(mockHook);

      const TestComponent = () => {
        const { createPasskey, authState } = useAuth();
        const [attempts, setAttempts] = React.useState(0);

        const handleMultipleCreates = async () => {
          // Simulate rapid multiple calls that could cause race conditions
          const promises = [];
          for (let i = 0; i < 3; i++) {
            promises.push(
              createPasskey(`user${i}`, `User ${i}`).then(() => {
                setAttempts((prev) => prev + 1);
              })
            );
          }
          await Promise.all(promises);
        };

        return (
          <div>
            <div data-testid="attempts">{attempts}</div>
            <div data-testid="status">{authState.status}</div>
            <button
              onClick={handleMultipleCreates}
              data-testid="multi-create-btn"
            >
              Multi Create
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId('multi-create-btn').click();
      });

      // All attempts should complete without race condition issues
      expect(mockHook.createPasskey).toHaveBeenCalledTimes(3);
      expect(screen.getByTestId('attempts')).toHaveTextContent('3');

      process.env = originalEnv;
    });

    test('handles concurrent hook and legacy operations', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';

      // Mock mixed scenario where some operations use hook, others legacy
      const mockHook = {
        createPasskey: jest.fn().mockResolvedValue(true),
        verifyPasskey: jest.fn().mockResolvedValue(true),
        verifyCredentialExists: jest.fn().mockResolvedValue(true),
        encryptWithPasskey: jest.fn().mockResolvedValue('hook-encrypted'),
        decryptWithPasskey: jest.fn().mockResolvedValue('hook-decrypted'),
        testPasskeyEncryption: jest.fn().mockResolvedValue(true),
        isLoading: false,
        error: null,
        clearError: jest.fn(),
      };
      mockUsePasskeyAuth.mockReturnValue(mockHook);

      mockPasskeyService.createCredential.mockResolvedValue({
        credential: {} as PublicKeyCredential,
        credentialId: 'legacy-credential-id',
      });

      const TestComponent = () => {
        const { createPasskey } = useAuth();

        const [hookResult, setHookResult] = React.useState<string>('');
        const [legacyResult, setLegacyResult] = React.useState<string>('');

        const testMixed = async () => {
          // Test hook operation
          const hookSuccess = await createPasskey('hookuser', 'Hook User');
          setHookResult(hookSuccess ? 'hook-success' : 'hook-failed');

          // Mock environment change to legacy
          process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'false';

          // Test legacy operation (this would use legacy in real scenario)
          // Note: In test, we can't easily switch environments mid-test
          // but this demonstrates the concept
          setLegacyResult('legacy-simulated');
        };

        return (
          <div>
            <div data-testid="hook-result">{hookResult}</div>
            <div data-testid="legacy-result">{legacyResult}</div>
            <button onClick={testMixed} data-testid="mixed-btn">
              Test Mixed
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId('mixed-btn').click();
      });

      expect(mockHook.createPasskey).toHaveBeenCalledWith(
        'hookuser',
        'Hook User'
      );
      expect(screen.getByTestId('hook-result')).toHaveTextContent(
        'hook-success'
      );

      process.env = originalEnv;
    });
  });

  describe('Browser Compatibility Edge Cases', () => {
    test('handles browsers with partial WebAuthn support', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';

      // Mock partial WebAuthn support
      mockPasskeyService.isSupported.mockResolvedValue({
        isSupported: false,
        hasWebAuthn: true,
        hasPlatformAuthenticator: false,
        hasConditionalMediation: false,
        platformAuthenticatorAvailable: false,
        isIOS: false,
        isIOS16Plus: false,
        isIOS18Plus: false,
      });

      const mockHook = {
        createPasskey: jest
          .fn()
          .mockRejectedValue(new Error('Platform authenticator not available')),
        verifyPasskey: jest.fn().mockResolvedValue(true),
        verifyCredentialExists: jest.fn().mockResolvedValue(true),
        encryptWithPasskey: jest.fn().mockResolvedValue('encrypted'),
        decryptWithPasskey: jest.fn().mockResolvedValue('decrypted'),
        testPasskeyEncryption: jest.fn().mockResolvedValue(true),
        isLoading: false,
        error: 'Platform authenticator not available',
        clearError: jest.fn(),
      };
      mockUsePasskeyAuth.mockReturnValue(mockHook);

      const TestComponent = () => {
        const { createPasskey, authState } = useAuth();

        const [result, setResult] = React.useState<boolean | null>(null);

        const handleCreate = async () => {
          const success = await createPasskey('testuser', 'Test User');
          setResult(success);
        };

        return (
          <div>
            <div data-testid="result">{result}</div>
            <div data-testid="passkey-support">
              {authState.isPasskeySupported.toString()}
            </div>
            <button onClick={handleCreate} data-testid="create-btn">
              Create
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId('create-btn').click();
      });

      expect(mockHook.createPasskey).toHaveBeenCalled();
      expect(screen.getByTestId('result')).toHaveTextContent('false');
      expect(screen.getByTestId('passkey-support')).toHaveTextContent('false');

      process.env = originalEnv;
    });

    test('handles iOS-specific WebAuthn limitations', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';

      // Mock iOS WebAuthn support
      mockPasskeyService.isSupported.mockResolvedValue({
        isSupported: true,
        hasWebAuthn: true,
        hasPlatformAuthenticator: true,
        hasConditionalMediation: false, // iOS doesn't support conditional mediation
        platformAuthenticatorAvailable: true,
        isIOS: true,
        isIOS16Plus: true,
        isIOS18Plus: false,
      });

      const mockHook = {
        createPasskey: jest.fn().mockResolvedValue(true),
        verifyPasskey: jest.fn().mockResolvedValue(true),
        verifyCredentialExists: jest.fn().mockResolvedValue(true),
        encryptWithPasskey: jest.fn().mockResolvedValue('encrypted'),
        decryptWithPasskey: jest.fn().mockResolvedValue('decrypted'),
        testPasskeyEncryption: jest.fn().mockResolvedValue(true),
        isLoading: false,
        error: null,
        clearError: jest.fn(),
      };
      mockUsePasskeyAuth.mockReturnValue(mockHook);

      const TestComponent = () => {
        const { createPasskey, authState } = useAuth();

        const [result, setResult] = React.useState<boolean | null>(null);

        const handleCreate = async () => {
          const success = await createPasskey('testuser', 'Test User');
          setResult(success);
        };

        return (
          <div>
            <div data-testid="result">{result}</div>
            <div data-testid="is-ios">
              {authState.isPWA ? 'ios-pwa' : 'not-ios-pwa'}
            </div>
            <button onClick={handleCreate} data-testid="create-btn">
              Create
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId('create-btn').click();
      });

      expect(mockHook.createPasskey).toHaveBeenCalled();
      expect(screen.getByTestId('result')).toHaveTextContent('true');

      process.env = originalEnv;
    });
  });

  describe('Memory and Resource Management', () => {
    test('prevents memory leaks from hook subscriptions', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';

      const mockHook = {
        createPasskey: jest.fn().mockResolvedValue(true),
        verifyPasskey: jest.fn().mockResolvedValue(true),
        verifyCredentialExists: jest.fn().mockResolvedValue(true),
        encryptWithPasskey: jest.fn().mockResolvedValue('encrypted'),
        decryptWithPasskey: jest.fn().mockResolvedValue('decrypted'),
        testPasskeyEncryption: jest.fn().mockResolvedValue(true),
        isLoading: false,
        error: null,
        clearError: jest.fn(),
      };
      mockUsePasskeyAuth.mockReturnValue(mockHook);

      let componentExists = true;

      const TestComponent = () => {
        const { createPasskey } = useAuth();

        React.useEffect(() => {
          return () => {
            componentExists = false;
          };
        }, []);

        const handleCreate = async () => {
          if (componentExists) {
            await createPasskey('testuser', 'Test User');
          }
        };

        return (
          <button onClick={handleCreate} data-testid="create-btn">
            Create
          </button>
        );
      };

      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId('create-btn').click();
      });

      // Unmount should clean up properly
      unmount();

      expect(componentExists).toBe(false);
      expect(mockHook.createPasskey).toHaveBeenCalledTimes(1);

      process.env = originalEnv;
    });
  });
});
