import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { PasskeyService } from '../../services/auth/PasskeyService';
import { PasskeyEncryptionService } from '../../services/encryption/PasskeyEncryptionService';

// Mock the services
jest.mock('../../services/auth/PasskeyService');
jest.mock('../../services/encryption/PasskeyEncryptionService');
jest.mock('../../utils/auth/authLogger');

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock window.location
Object.defineProperty(window, 'location', {
  value: { hostname: 'test.example.com' },
  writable: true,
});

// Mock crypto
Object.defineProperty(window, 'crypto', {
  value: { getRandomValues: jest.fn() },
  writable: true,
});

// Mock performance
Object.defineProperty(window, 'performance', {
  value: { now: jest.fn(() => 1000) },
  writable: true,
});

// Mock PublicKeyCredential
Object.defineProperty(window, 'PublicKeyCredential', {
  value: {
    isUserVerifyingPlatformAuthenticatorAvailable: jest.fn(),
    isConditionalMediationAvailable: jest.fn(),
  },
  writable: true,
});

const mockPasskeyService = PasskeyService as jest.Mocked<typeof PasskeyService>;
const mockPasskeyEncryptionService = PasskeyEncryptionService as jest.Mocked<
  typeof PasskeyEncryptionService
>;

describe('AuthContext - PasskeyService Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset localStorage mocks
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockImplementation(() => {});
    mockLocalStorage.removeItem.mockImplementation(() => {});

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

    mockPasskeyService.createCredential.mockResolvedValue({
      credential: {
        type: 'public-key',
        rawId: new Uint8Array([1, 2, 3, 4, 5]),
      } as PublicKeyCredential,
      credentialId: btoa('test-credential-id'),
    });

    mockPasskeyService.verifyCredential.mockResolvedValue({
      success: true,
      authenticated: true,
    });

    mockPasskeyService.verifyCredentialExists.mockResolvedValue(true);

    mockPasskeyEncryptionService.encrypt.mockResolvedValue('encrypted-data');
    mockPasskeyEncryptionService.decrypt.mockResolvedValue('decrypted-data');
    mockPasskeyEncryptionService.testEncryption.mockResolvedValue(true);
  });

  describe('Passkey support detection', () => {
    test('uses PasskeyService.isSupported for passkey support detection', async () => {
      const TestComponent = () => {
        const { authState } = useAuth();
        return (
          <div>
            <div data-testid="passkey-supported">
              {authState.isPasskeySupported ? 'supported' : 'not-supported'}
            </div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockPasskeyService.isSupported).toHaveBeenCalled();
      });

      expect(screen.getByTestId('passkey-supported')).toHaveTextContent(
        'supported'
      );
    });

    test('handles PasskeyService.isSupported failure gracefully', async () => {
      mockPasskeyService.isSupported.mockRejectedValue(
        new Error('Service unavailable')
      );

      const TestComponent = () => {
        const { authState } = useAuth();
        return (
          <div>
            <div data-testid="passkey-supported">
              {authState.isPasskeySupported ? 'supported' : 'not-supported'}
            </div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockPasskeyService.isSupported).toHaveBeenCalled();
      });

      expect(screen.getByTestId('passkey-supported')).toHaveTextContent(
        'not-supported'
      );
    });
  });

  describe('Passkey creation', () => {
    test('createPasskey calls PasskeyService.createCredential', async () => {
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
    });

    test('createPasskey handles service errors gracefully', async () => {
      mockPasskeyService.createCredential.mockRejectedValue(
        new Error('Creation failed')
      );

      const TestComponent = () => {
        const { createPasskey, authState } = useAuth();

        React.useEffect(() => {
          createPasskey('testuser', 'Test User');
        }, [createPasskey]);

        return (
          <div>
            <div data-testid="auth-status">{authState.status}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockPasskeyService.createCredential).toHaveBeenCalled();
      });

      expect(screen.getByTestId('auth-status')).toHaveTextContent('failed');
    });

    test('createPasskey updates auth state on success', async () => {
      const TestComponent = () => {
        const { createPasskey, authState } = useAuth();

        React.useEffect(() => {
          createPasskey('testuser', 'Test User');
        }, [createPasskey]);

        return (
          <div>
            <div data-testid="auth-method">{authState.method}</div>
            <div data-testid="auth-status">{authState.status}</div>
            <div data-testid="credential-id">
              {authState.credentialId || 'none'}
            </div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-method')).toHaveTextContent('passkey');
        expect(screen.getByTestId('auth-status')).toHaveTextContent(
          'authenticated'
        );
        expect(screen.getByTestId('credential-id')).toHaveTextContent(
          btoa('test-credential-id')
        );
      });
    });
  });

  describe('Passkey verification', () => {
    test('verifyPasskey calls PasskeyService.verifyCredential', async () => {
      const TestComponent = () => {
        const { verifyPasskey } = useAuth();

        React.useEffect(() => {
          verifyPasskey();
        }, [verifyPasskey]);

        return <div>Test</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockPasskeyService.verifyCredential).toHaveBeenCalledWith(
          undefined
        );
      });
    });

    test('verifyPasskey passes credentialId to service when available', async () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          method: 'passkey',
          status: 'authenticated',
          credentialId: 'existing-credential-id',
        })
      );

      const TestComponent = () => {
        const { verifyPasskey } = useAuth();

        React.useEffect(() => {
          verifyPasskey();
        }, [verifyPasskey]);

        return <div>Test</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockPasskeyService.verifyCredential).toHaveBeenCalledWith(
          'existing-credential-id'
        );
      });
    });

    test('verifyPasskey handles service errors gracefully', async () => {
      mockPasskeyService.verifyCredential.mockRejectedValue(
        new Error('Verification failed')
      );

      const TestComponent = () => {
        const { verifyPasskey, authState } = useAuth();

        React.useEffect(() => {
          verifyPasskey();
        }, [verifyPasskey]);

        return (
          <div>
            <div data-testid="auth-status">{authState.status}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockPasskeyService.verifyCredential).toHaveBeenCalled();
      });

      expect(screen.getByTestId('auth-status')).toHaveTextContent('failed');
    });
  });

  describe('Credential existence verification', () => {
    test('verifyCredentialExists calls PasskeyService.verifyCredentialExists', async () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          method: 'passkey',
          status: 'authenticated',
          credentialId: 'test-credential-id',
        })
      );

      const TestComponent = () => {
        const { verifyCredentialExists } = useAuth();

        const [result, setResult] = React.useState<boolean | null>(null);

        React.useEffect(() => {
          verifyCredentialExists().then(setResult);
        }, [verifyCredentialExists]);

        return (
          <div>
            <div data-testid="result">
              {result === null ? 'loading' : result.toString()}
            </div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockPasskeyService.verifyCredentialExists).toHaveBeenCalledWith(
          'test-credential-id'
        );
      });

      expect(screen.getByTestId('result')).toHaveTextContent('true');
    });

    test('verifyCredentialExists returns false when no credentialId', async () => {
      const TestComponent = () => {
        const { verifyCredentialExists } = useAuth();

        const [result, setResult] = React.useState<boolean | null>(null);

        React.useEffect(() => {
          verifyCredentialExists().then(setResult);
        }, [verifyCredentialExists]);

        return (
          <div>
            <div data-testid="result">
              {result === null ? 'loading' : result.toString()}
            </div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(
          mockPasskeyService.verifyCredentialExists
        ).not.toHaveBeenCalled();
      });

      expect(screen.getByTestId('result')).toHaveTextContent('false');
    });
  });

  describe('Passkey encryption integration', () => {
    test('encryptWithPasskey calls PasskeyEncryptionService.encrypt', async () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          method: 'passkey',
          status: 'authenticated',
          credentialId: 'test-credential-id',
        })
      );

      const TestComponent = () => {
        const { encryptWithPasskey } = useAuth();

        const [result, setResult] = React.useState<string | null>(null);

        React.useEffect(() => {
          encryptWithPasskey('test data').then(setResult);
        }, [encryptWithPasskey]);

        return (
          <div>
            <div data-testid="result">{result || 'loading'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockPasskeyEncryptionService.encrypt).toHaveBeenCalledWith(
          'test data',
          'test-credential-id'
        );
      });

      expect(screen.getByTestId('result')).toHaveTextContent('encrypted-data');
    });

    test('decryptWithPasskey calls PasskeyEncryptionService.decrypt', async () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          method: 'passkey',
          status: 'authenticated',
          credentialId: 'test-credential-id',
        })
      );

      const TestComponent = () => {
        const { decryptWithPasskey } = useAuth();

        const [result, setResult] = React.useState<string | null>(null);

        React.useEffect(() => {
          decryptWithPasskey('encrypted-data').then(setResult);
        }, [decryptWithPasskey]);

        return (
          <div>
            <div data-testid="result">{result || 'loading'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockPasskeyEncryptionService.decrypt).toHaveBeenCalledWith(
          'encrypted-data',
          'test-credential-id'
        );
      });

      expect(screen.getByTestId('result')).toHaveTextContent('decrypted-data');
    });

    test('testPasskeyEncryption calls PasskeyEncryptionService.testEncryption', async () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          method: 'passkey',
          status: 'authenticated',
          credentialId: 'test-credential-id',
        })
      );

      const TestComponent = () => {
        const { testPasskeyEncryption } = useAuth();

        const [result, setResult] = React.useState<boolean | null>(null);

        React.useEffect(() => {
          testPasskeyEncryption().then(setResult);
        }, [testPasskeyEncryption]);

        return (
          <div>
            <div data-testid="result">
              {result === null ? 'loading' : result.toString()}
            </div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(
          mockPasskeyEncryptionService.testEncryption
        ).toHaveBeenCalledWith('test-credential-id');
      });

      expect(screen.getByTestId('result')).toHaveTextContent('true');
    });

    test('encryption functions throw error when no credentialId', async () => {
      const TestComponent = () => {
        const { encryptWithPasskey } = useAuth();

        const [error, setError] = React.useState<string | null>(null);

        React.useEffect(() => {
          encryptWithPasskey('test data').catch((err) => setError(err.message));
        }, [encryptWithPasskey]);

        return (
          <div>
            <div data-testid="error">{error || 'no-error'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(
          'No passkey available for encryption'
        );
      });
    });
  });

  describe('Error handling and state management', () => {
    test('maintains existing error handling behavior', async () => {
      // Test that user cancellation still preserves localStorage
      mockPasskeyService.createCredential.mockRejectedValue(
        new Error('User cancelled')
      );

      const TestComponent = () => {
        const { createPasskey, authState } = useAuth();

        React.useEffect(() => {
          createPasskey('testuser', 'Test User');
        }, [createPasskey]);

        return (
          <div>
            <div data-testid="auth-status">{authState.status}</div>
            <div data-testid="auth-method">{authState.method || 'null'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockPasskeyService.createCredential).toHaveBeenCalled();
      });

      expect(screen.getByTestId('auth-status')).toHaveTextContent('failed');
      expect(screen.getByTestId('auth-method')).toHaveTextContent('null');
    });

    test('preserves existing authentication on user cancellation', async () => {
      // Simulate existing authentication
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          method: 'passkey',
          status: 'authenticated',
          credentialId: 'existing-credential-id',
        })
      );

      mockPasskeyService.createCredential.mockRejectedValue(
        new Error('User cancelled')
      );

      const TestComponent = () => {
        const { createPasskey, authState } = useAuth();

        React.useEffect(() => {
          createPasskey('testuser', 'Test User');
        }, [createPasskey]);

        return (
          <div>
            <div data-testid="auth-status">{authState.status}</div>
            <div data-testid="auth-method">{authState.method || 'null'}</div>
            <div data-testid="credential-id">
              {authState.credentialId || 'null'}
            </div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockPasskeyService.createCredential).toHaveBeenCalled();
      });

      expect(screen.getByTestId('auth-status')).toHaveTextContent('failed');
      expect(screen.getByTestId('auth-method')).toHaveTextContent('passkey');
      expect(screen.getByTestId('credential-id')).toHaveTextContent(
        'existing-credential-id'
      );
    });
  });
});
