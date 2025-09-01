import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { usePasskeyAuth } from '../../hooks/usePasskeyAuth';
import { PasskeyService } from '../../services/auth/PasskeyService';
import { PasskeyEncryptionService } from '../../services/encryption/PasskeyEncryptionService';
import { AuthStorageService } from '../../services/storage/AuthStorageService';

// Mock all dependencies
jest.mock('../../services/auth/PasskeyService');
jest.mock('../../services/encryption/PasskeyEncryptionService');
jest.mock('../../services/storage/AuthStorageService');
jest.mock('../../hooks/usePasskeyAuth');
jest.mock('../../../utils/auth/authLogger');

const mockPasskeyService = PasskeyService as jest.Mocked<typeof PasskeyService>;
const mockPasskeyEncryptionService = PasskeyEncryptionService as jest.Mocked<
  typeof PasskeyEncryptionService
>;
const mockAuthStorageService = AuthStorageService as jest.Mocked<
  typeof AuthStorageService
>;
const mockUsePasskeyAuth = usePasskeyAuth as jest.MockedFunction<
  typeof usePasskeyAuth
>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('AuthContext - Step 4.1.11: Passkey Migration Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset localStorage mocks
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockImplementation(() => {});
    mockLocalStorage.removeItem.mockImplementation(() => {});

    // Mock AuthStorageService
    mockAuthStorageService.loadAuthState.mockReturnValue(null);
    mockAuthStorageService.saveAuthState.mockImplementation(() => {});
    mockAuthStorageService.clearAuthState.mockImplementation(() => {});
    mockAuthStorageService.hasAuthData.mockReturnValue(false);
    mockAuthStorageService.getDebugData.mockReturnValue({
      hasData: false,
      dataLength: 0,
      authState: null,
    });
    mockAuthStorageService.forceClearAuthData.mockImplementation(() => {});

    // Mock PasskeyService
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

    mockPasskeyService.createCredential.mockResolvedValue({
      credential: {} as PublicKeyCredential,
      credentialId: 'test-credential-id',
    });

    mockPasskeyService.verifyCredential.mockResolvedValue({
      success: true,
      authenticated: true,
    });

    mockPasskeyService.verifyCredentialExists.mockResolvedValue(true);

    // Mock PasskeyEncryptionService
    mockPasskeyEncryptionService.encrypt.mockResolvedValue('encrypted-data');
    mockPasskeyEncryptionService.decrypt.mockResolvedValue('decrypted-data');
    mockPasskeyEncryptionService.testEncryption.mockResolvedValue(true);

    // Mock usePasskeyAuth hook
    const mockPasskeyAuthHook = {
      createPasskey: jest.fn().mockResolvedValue(true),
      verifyPasskey: jest.fn().mockResolvedValue(true),
      verifyCredentialExists: jest.fn().mockResolvedValue(true),
      encryptWithPasskey: jest.fn().mockResolvedValue('hook-encrypted-data'),
      decryptWithPasskey: jest.fn().mockResolvedValue('hook-decrypted-data'),
      testPasskeyEncryption: jest.fn().mockResolvedValue(true),
      isLoading: false,
      error: null,
      clearError: jest.fn(),
    };

    mockUsePasskeyAuth.mockReturnValue(mockPasskeyAuthHook);
  });

  describe('Feature Flag Migration Testing', () => {
    test('uses usePasskeyAuth hook when AUTH_PASSKEY_HOOK_MIGRATION is enabled', async () => {
      // Mock feature flag as enabled
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';

      const TestComponent = () => {
        const { createPasskey } = useAuth();

        React.useEffect(() => {
          createPasskey('testuser', 'Test User');
        }, [createPasskey]);

        return <div>Test</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const mockHook = mockUsePasskeyAuth.mock.results[0].value;
        expect(mockHook.createPasskey).toHaveBeenCalledWith(
          'testuser',
          'Test User'
        );
      });

      // Restore environment
      process.env = originalEnv;
    });

    test('falls back to legacy implementation when AUTH_PASSKEY_HOOK_MIGRATION is disabled', async () => {
      // Mock feature flag as disabled
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'false';

      const TestComponent = () => {
        const { createPasskey } = useAuth();

        React.useEffect(() => {
          createPasskey('testuser', 'Test User');
        }, [createPasskey]);

        return <div>Test</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockPasskeyService.createCredential).toHaveBeenCalledWith(
          'testuser',
          'Test User'
        );
      });

      // Restore environment
      process.env = originalEnv;
    });
  });

  describe('Passkey Creation Migration', () => {
    test('createPasskey uses hook when feature flag enabled', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';

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

      const mockHook = mockUsePasskeyAuth.mock.results[0].value;
      expect(mockHook.createPasskey).toHaveBeenCalledWith(
        'testuser',
        'Test User'
      );
      expect(screen.getByTestId('result')).toHaveTextContent('true');

      process.env = originalEnv;
    });

    test('createPasskey uses legacy when feature flag disabled', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'false';

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

      expect(mockPasskeyService.createCredential).toHaveBeenCalledWith(
        'testuser',
        'Test User'
      );
      expect(screen.getByTestId('result')).toHaveTextContent('true');

      process.env = originalEnv;
    });
  });

  describe('Passkey Verification Migration', () => {
    test('verifyPasskey uses hook when feature flag enabled', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';

      // Mock existing auth state
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          method: 'passkey',
          status: 'authenticated',
          credentialId: 'existing-credential-id',
        })
      );

      const TestComponent = () => {
        const { verifyPasskey, authState } = useAuth();

        const [result, setResult] = React.useState<boolean | null>(null);

        const handleVerify = async () => {
          const success = await verifyPasskey();
          setResult(success);
        };

        return (
          <div>
            <div data-testid="result">{result}</div>
            <div data-testid="status">{authState.status}</div>
            <button onClick={handleVerify} data-testid="verify-btn">
              Verify
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
        screen.getByTestId('verify-btn').click();
      });

      const mockHook = mockUsePasskeyAuth.mock.results[0].value;
      expect(mockHook.verifyPasskey).toHaveBeenCalledWith(
        'existing-credential-id'
      );
      expect(screen.getByTestId('result')).toHaveTextContent('true');

      process.env = originalEnv;
    });

    test('verifyPasskey uses legacy when feature flag disabled', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'false';

      // Mock existing auth state
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          method: 'passkey',
          status: 'authenticated',
          credentialId: 'existing-credential-id',
        })
      );

      const TestComponent = () => {
        const { verifyPasskey, authState } = useAuth();

        const [result, setResult] = React.useState<boolean | null>(null);

        const handleVerify = async () => {
          const success = await verifyPasskey();
          setResult(success);
        };

        return (
          <div>
            <div data-testid="result">{result}</div>
            <div data-testid="status">{authState.status}</div>
            <button onClick={handleVerify} data-testid="verify-btn">
              Verify
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
        screen.getByTestId('verify-btn').click();
      });

      expect(mockPasskeyService.verifyCredential).toHaveBeenCalledWith(
        'existing-credential-id'
      );
      expect(screen.getByTestId('result')).toHaveTextContent('true');

      process.env = originalEnv;
    });
  });

  describe('Passkey Encryption Migration', () => {
    test('encryptWithPasskey prioritizes useEncryption hook over usePasskeyAuth', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';
      process.env.NEXT_PUBLIC_USE_ENCRYPTION_HOOK = 'true';

      // Mock existing auth state
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          method: 'passkey',
          status: 'authenticated',
          credentialId: 'test-credential-id',
        })
      );

      const TestComponent = () => {
        const { encryptWithPasskey } = useAuth();

        const [result, setResult] = React.useState<string>('');

        const handleEncrypt = async () => {
          const encrypted = await encryptWithPasskey('test data');
          setResult(encrypted);
        };

        return (
          <div>
            <div data-testid="result">{result}</div>
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

      // Should use useEncryption hook (higher priority), not usePasskeyAuth hook
      const mockHook = mockUsePasskeyAuth.mock.results[0].value;
      expect(mockHook.encryptWithPasskey).not.toHaveBeenCalled();

      process.env = originalEnv;
    });

    test('encryptWithPasskey uses usePasskeyAuth hook when encryption hook disabled', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';
      process.env.NEXT_PUBLIC_USE_ENCRYPTION_HOOK = 'false';

      // Mock existing auth state
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          method: 'passkey',
          status: 'authenticated',
          credentialId: 'test-credential-id',
        })
      );

      const TestComponent = () => {
        const { encryptWithPasskey } = useAuth();

        const [result, setResult] = React.useState<string>('');

        const handleEncrypt = async () => {
          const encrypted = await encryptWithPasskey('test data');
          setResult(encrypted);
        };

        return (
          <div>
            <div data-testid="result">{result}</div>
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

      // Should use usePasskeyAuth hook when encryption hook is disabled
      const mockHook = mockUsePasskeyAuth.mock.results[0].value;
      expect(mockHook.encryptWithPasskey).toHaveBeenCalledWith(
        'test data',
        'test-credential-id'
      );
      expect(screen.getByTestId('result')).toHaveTextContent(
        'hook-encrypted-data'
      );

      process.env = originalEnv;
    });

    test('encryptWithPasskey uses legacy when both hooks disabled', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'false';
      process.env.NEXT_PUBLIC_USE_ENCRYPTION_HOOK = 'false';

      // Mock existing auth state
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          method: 'passkey',
          status: 'authenticated',
          credentialId: 'test-credential-id',
        })
      );

      const TestComponent = () => {
        const { encryptWithPasskey } = useAuth();

        const [result, setResult] = React.useState<string>('');

        const handleEncrypt = async () => {
          const encrypted = await encryptWithPasskey('test data');
          setResult(encrypted);
        };

        return (
          <div>
            <div data-testid="result">{result}</div>
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

      // Should use legacy implementation
      expect(mockPasskeyEncryptionService.encrypt).toHaveBeenCalledWith(
        'test data',
        'test-credential-id'
      );
      expect(screen.getByTestId('result')).toHaveTextContent('encrypted-data');

      process.env = originalEnv;
    });
  });

  describe('Error Handling Migration', () => {
    test('hook errors are handled gracefully with proper fallback', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';

      // Mock hook to fail
      const mockHook = {
        createPasskey: jest.fn().mockResolvedValue(false),
        verifyPasskey: jest.fn().mockResolvedValue(false),
        verifyCredentialExists: jest.fn().mockResolvedValue(false),
        encryptWithPasskey: jest
          .fn()
          .mockRejectedValue(new Error('Hook failed')),
        decryptWithPasskey: jest
          .fn()
          .mockRejectedValue(new Error('Hook failed')),
        testPasskeyEncryption: jest.fn().mockResolvedValue(false),
        isLoading: false,
        error: 'Hook error',
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

      expect(mockHook.createPasskey).toHaveBeenCalledWith(
        'testuser',
        'Test User'
      );
      expect(screen.getByTestId('result')).toHaveTextContent('false');
      expect(screen.getByTestId('status')).toHaveTextContent('failed');

      process.env = originalEnv;
    });
  });

  describe('Backward Compatibility', () => {
    test('legacy implementation still works when hooks are disabled', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'false';
      process.env.NEXT_PUBLIC_USE_ENCRYPTION_HOOK = 'false';

      const TestComponent = () => {
        const { createPasskey, verifyPasskey, encryptWithPasskey } = useAuth();

        const [createResult, setCreateResult] = React.useState<boolean | null>(
          null
        );
        const [verifyResult, setVerifyResult] = React.useState<boolean | null>(
          null
        );
        const [encryptResult, setEncryptResult] = React.useState<string>('');

        const handleTest = async () => {
          // Test creation
          const createSuccess = await createPasskey('testuser', 'Test User');
          setCreateResult(createSuccess);

          // Mock auth state for verification and encryption
          mockLocalStorage.getItem.mockReturnValue(
            JSON.stringify({
              method: 'passkey',
              status: 'authenticated',
              credentialId: 'test-credential-id',
            })
          );

          // Test verification
          const verifySuccess = await verifyPasskey();
          setVerifyResult(verifySuccess);

          // Test encryption
          const encrypted = await encryptWithPasskey('test data');
          setEncryptResult(encrypted);
        };

        return (
          <div>
            <div data-testid="create-result">{createResult}</div>
            <div data-testid="verify-result">{verifyResult}</div>
            <div data-testid="encrypt-result">{encryptResult}</div>
            <button onClick={handleTest} data-testid="test-btn">
              Test Legacy
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
        screen.getByTestId('test-btn').click();
      });

      // Verify legacy services were called
      expect(mockPasskeyService.createCredential).toHaveBeenCalled();
      expect(mockPasskeyService.verifyCredential).toHaveBeenCalled();
      expect(mockPasskeyEncryptionService.encrypt).toHaveBeenCalled();

      // Verify hook was not called
      const mockHook = mockUsePasskeyAuth.mock.results[0].value;
      expect(mockHook.createPasskey).not.toHaveBeenCalled();

      process.env = originalEnv;
    });
  });

  describe('Performance and Stability', () => {
    test('hook initialization does not cause unnecessary re-renders', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';

      let renderCount = 0;

      const TestComponent = () => {
        renderCount++;
        const { authState } = useAuth();

        return (
          <div>
            <div data-testid="render-count">{renderCount}</div>
            <div data-testid="status">{authState.status}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for any async operations
      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent(
          'unauthenticated'
        );
      });

      // Component should not have excessive re-renders
      expect(renderCount).toBeLessThan(5);

      process.env = originalEnv;
    });
  });
});
