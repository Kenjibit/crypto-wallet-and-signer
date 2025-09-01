import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { PasskeyService } from '../../services/auth/PasskeyService';
import { PinService } from '../../services/auth/PinService';
import { AuthStorageService } from '../../services/storage/AuthStorageService';
import { PasskeyEncryptionService } from '../../services/encryption/PasskeyEncryptionService';
import { PinEncryptionService } from '../../services/encryption/PinEncryptionService';
import { authLogger } from '../../../utils/auth/authLogger';

// Mock all services and utilities
jest.mock('../../services/auth/PasskeyService');
jest.mock('../../services/auth/PinService');
jest.mock('../../services/storage/AuthStorageService');
jest.mock('../../services/encryption/PasskeyEncryptionService');
jest.mock('../../services/encryption/PinEncryptionService');
jest.mock('../../../utils/auth/authLogger');

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

// Mock service instances
const mockPasskeyService = PasskeyService as jest.Mocked<typeof PasskeyService>;
const mockPinService = PinService as jest.Mocked<typeof PinService>;
const mockAuthStorageService = AuthStorageService as jest.Mocked<
  typeof AuthStorageService
>;
const mockPasskeyEncryptionService = PasskeyEncryptionService as jest.Mocked<
  typeof PasskeyEncryptionService
>;
const mockPinEncryptionService = PinEncryptionService as jest.Mocked<
  typeof PinEncryptionService
>;
const mockAuthLogger = authLogger as jest.Mocked<typeof authLogger>;

describe('AuthContext - Auth State Migration (Steps 4.1.4-4.1.7)', () => {
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

    mockPinService.validatePinAuth.mockReturnValue({
      isValid: true,
      errors: [],
    });

    mockPinService.hashPin.mockResolvedValue('hashed-pin');
    mockPinService.verifyPinMatch.mockReturnValue(true);
    mockPinService.savePinAuth.mockImplementation(() => {});
    mockPinService.loadPinAuth.mockReturnValue({ pin: '', confirmPin: '' });
    mockPinService.clearPinAuth.mockImplementation(() => {});

    mockAuthStorageService.loadAuthState.mockReturnValue(null);
    mockAuthStorageService.saveAuthState.mockImplementation(() => {});
    mockAuthStorageService.clearAuthState.mockImplementation(() => {});
    mockAuthStorageService.hasAuthData.mockReturnValue(false);
    mockAuthStorageService.getDebugData.mockReturnValue({
      authData: null,
      hasData: false,
    });

    mockPasskeyEncryptionService.encrypt.mockResolvedValue('encrypted-data');
    mockPasskeyEncryptionService.decrypt.mockResolvedValue('decrypted-data');
    mockPasskeyEncryptionService.testEncryption.mockResolvedValue(true);

    mockPinEncryptionService.encrypt.mockResolvedValue('encrypted-data');
    mockPinEncryptionService.decrypt.mockResolvedValue('decrypted-data');
    mockPinEncryptionService.testEncryption.mockResolvedValue(true);

    mockAuthLogger.debug.mockImplementation(() => {});
    mockAuthLogger.error.mockImplementation(() => {});
    mockAuthLogger.performance.mockImplementation(() => {});
  });

  describe('Complete Authentication Flow with useAuthState Hook', () => {
    test('initializes with default unauthenticated state', async () => {
      const TestComponent = () => {
        const { authState } = useAuth();
        return (
          <div>
            <div data-testid="auth-status">{authState.status}</div>
            <div data-testid="auth-method">{authState.method || 'null'}</div>
            <div data-testid="passkey-supported">
              {authState.isPasskeySupported ? 'true' : 'false'}
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
        expect(screen.getByTestId('auth-status')).toHaveTextContent(
          'unauthenticated'
        );
        expect(screen.getByTestId('auth-method')).toHaveTextContent('null');
        expect(screen.getByTestId('passkey-supported')).toHaveTextContent(
          'true'
        );
      });
    });

    test('loads persisted auth state from localStorage', async () => {
      const persistedState = {
        method: 'passkey' as const,
        status: 'authenticated' as const,
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'persisted-credential-id',
      };

      mockAuthStorageService.loadAuthState.mockReturnValue(persistedState);

      const TestComponent = () => {
        const { authState } = useAuth();
        return (
          <div>
            <div data-testid="auth-status">{authState.status}</div>
            <div data-testid="auth-method">{authState.method}</div>
            <div data-testid="credential-id">{authState.credentialId}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockAuthStorageService.loadAuthState).toHaveBeenCalled();
        expect(screen.getByTestId('auth-status')).toHaveTextContent(
          'authenticated'
        );
        expect(screen.getByTestId('auth-method')).toHaveTextContent('passkey');
        expect(screen.getByTestId('credential-id')).toHaveTextContent(
          'persisted-credential-id'
        );
      });
    });

    test('passkey authentication flow works end-to-end', async () => {
      const TestComponent = () => {
        const {
          createPasskey,
          verifyPasskey,
          authState,
          sessionAuthenticated,
        } = useAuth();

        React.useEffect(() => {
          const runAuthFlow = async () => {
            // Step 1: Create passkey
            const createResult = await createPasskey('testuser', 'Test User');
            expect(createResult).toBe(true);

            // Step 2: Verify the authentication worked
            const verifyResult = await verifyPasskey();
            expect(verifyResult).toBe(true);
          };

          runAuthFlow();
        }, [createPasskey, verifyPasskey]);

        return (
          <div>
            <div data-testid="auth-status">{authState.status}</div>
            <div data-testid="auth-method">{authState.method}</div>
            <div data-testid="session-auth">
              {sessionAuthenticated ? 'true' : 'false'}
            </div>
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
        expect(screen.getByTestId('auth-status')).toHaveTextContent(
          'authenticated'
        );
        expect(screen.getByTestId('auth-method')).toHaveTextContent('passkey');
        expect(screen.getByTestId('session-auth')).toHaveTextContent('true');
        expect(screen.getByTestId('credential-id')).toHaveTextContent(
          btoa('test-credential-id')
        );
      });

      // Verify service calls
      expect(mockPasskeyService.createCredential).toHaveBeenCalledWith(
        'testuser',
        'Test User'
      );
      expect(mockPasskeyService.verifyCredential).toHaveBeenCalled();
      expect(mockAuthStorageService.saveAuthState).toHaveBeenCalled();
    });

    test('PIN authentication flow works end-to-end', async () => {
      const TestComponent = () => {
        const { setPinCode, verifyPinCode, authState, sessionAuthenticated } =
          useAuth();

        React.useEffect(() => {
          const runAuthFlow = async () => {
            // Step 1: Set PIN
            const setResult = setPinCode('1234', '1234');
            expect(setResult).toBe(true);

            // Step 2: Verify PIN
            const verifyResult = await verifyPinCode('1234');
            expect(verifyResult).toBe(true);
          };

          runAuthFlow();
        }, [setPinCode, verifyPinCode]);

        return (
          <div>
            <div data-testid="auth-status">{authState.status}</div>
            <div data-testid="auth-method">{authState.method}</div>
            <div data-testid="session-auth">
              {sessionAuthenticated ? 'true' : 'false'}
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
        expect(screen.getByTestId('auth-status')).toHaveTextContent(
          'authenticated'
        );
        expect(screen.getByTestId('auth-method')).toHaveTextContent('pin');
        expect(screen.getByTestId('session-auth')).toHaveTextContent('true');
      });

      // Verify service calls
      expect(mockPinService.validatePinAuth).toHaveBeenCalled();
      expect(mockPinService.hashPin).toHaveBeenCalledWith('1234');
      expect(mockPinService.savePinAuth).toHaveBeenCalled();
      expect(mockAuthStorageService.saveAuthState).toHaveBeenCalled();
    });
  });

  describe('State Persistence with useAuthState Hook', () => {
    test('saves auth state when authentication succeeds', async () => {
      const TestComponent = () => {
        const { createPasskey, authState } = useAuth();

        React.useEffect(() => {
          createPasskey('testuser', 'Test User');
        }, [createPasskey]);

        return <div data-testid="status">{authState.status}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockAuthStorageService.saveAuthState).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'authenticated',
            method: 'passkey',
            credentialId: btoa('test-credential-id'),
          })
        );
      });
    });

    test('clears auth state when logout is called', async () => {
      // Start with authenticated state
      const initialState = {
        method: 'passkey' as const,
        status: 'authenticated' as const,
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'test-credential-id',
      };
      mockAuthStorageService.loadAuthState.mockReturnValue(initialState);

      const TestComponent = () => {
        const { logout, authState } = useAuth();

        React.useEffect(() => {
          logout();
        }, [logout]);

        return (
          <div>
            <div data-testid="auth-status">{authState.status}</div>
            <div data-testid="auth-method">{authState.method}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent(
          'unauthenticated'
        );
        expect(screen.getByTestId('auth-method')).toHaveTextContent('null');
        expect(mockAuthStorageService.clearAuthState).toHaveBeenCalled();
        expect(mockPinService.clearPinAuth).toHaveBeenCalled();
      });
    });

    test('persists state changes through component re-mounts', async () => {
      const persistedState = {
        method: 'passkey' as const,
        status: 'authenticated' as const,
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'persisted-credential-id',
      };

      mockAuthStorageService.loadAuthState.mockReturnValue(persistedState);

      const TestComponent = ({ onReady }: { onReady?: () => void }) => {
        const { authState } = useAuth();

        React.useEffect(() => {
          if (authState.status === 'authenticated' && onReady) {
            onReady();
          }
        }, [authState.status, onReady]);

        return (
          <div>
            <div data-testid="auth-status">{authState.status}</div>
            <div data-testid="auth-method">{authState.method}</div>
            <div data-testid="credential-id">{authState.credentialId}</div>
          </div>
        );
      };

      const { rerender } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent(
          'authenticated'
        );
        expect(screen.getByTestId('auth-method')).toHaveTextContent('passkey');
        expect(screen.getByTestId('credential-id')).toHaveTextContent(
          'persisted-credential-id'
        );
      });

      // Re-mount component to test persistence
      rerender(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // State should still be persisted
      expect(screen.getByTestId('auth-status')).toHaveTextContent(
        'authenticated'
      );
      expect(screen.getByTestId('auth-method')).toHaveTextContent('passkey');
      expect(screen.getByTestId('credential-id')).toHaveTextContent(
        'persisted-credential-id'
      );
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    test('handles passkey creation failure gracefully', async () => {
      mockPasskeyService.createCredential.mockRejectedValue(
        new Error('User cancelled passkey creation')
      );

      const TestComponent = () => {
        const { createPasskey, authState } = useAuth();

        React.useEffect(() => {
          createPasskey('testuser', 'Test User');
        }, [createPasskey]);

        return (
          <div>
            <div data-testid="auth-status">{authState.status}</div>
            <div data-testid="auth-method">{authState.method}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('failed');
        expect(screen.getByTestId('auth-method')).toHaveTextContent('null');
        expect(mockAuthStorageService.saveAuthState).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'failed',
          })
        );
      });
    });

    test('handles PIN verification failure gracefully', async () => {
      mockPinService.verifyPinMatch.mockReturnValue(false);

      const TestComponent = () => {
        const { setPinCode, verifyPinCode, authState } = useAuth();

        React.useEffect(() => {
          const runFlow = async () => {
            setPinCode('1234', '1234');
            await verifyPinCode('9999'); // Wrong PIN
          };
          runFlow();
        }, [setPinCode, verifyPinCode]);

        return (
          <div>
            <div data-testid="auth-status">{authState.status}</div>
            <div data-testid="auth-method">{authState.method}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('failed');
        expect(screen.getByTestId('auth-method')).toHaveTextContent('pin');
        expect(mockAuthStorageService.saveAuthState).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'failed',
            method: 'pin',
          })
        );
      });
    });

    test('handles localStorage errors gracefully', async () => {
      mockAuthStorageService.saveAuthState.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const TestComponent = () => {
        const { createPasskey, authState } = useAuth();

        React.useEffect(() => {
          createPasskey('testuser', 'Test User');
        }, [createPasskey]);

        return <div data-testid="status">{authState.status}</div>;
      };

      // Mock console.error to avoid test output pollution
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'AuthStorageService effect: Error saving auth state',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });

    test('resets session authentication on invalid state transitions', async () => {
      // Start with authenticated state
      const initialState = {
        method: 'passkey' as const,
        status: 'authenticated' as const,
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'test-credential-id',
      };
      mockAuthStorageService.loadAuthState.mockReturnValue(initialState);

      const TestComponent = () => {
        const { resetAuth, authState, sessionAuthenticated } = useAuth();

        React.useEffect(() => {
          resetAuth();
        }, [resetAuth]);

        return (
          <div>
            <div data-testid="auth-status">{authState.status}</div>
            <div data-testid="session-auth">
              {sessionAuthenticated ? 'true' : 'false'}
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
        expect(screen.getByTestId('auth-status')).toHaveTextContent(
          'unauthenticated'
        );
        expect(screen.getByTestId('session-auth')).toHaveTextContent('false');
      });
    });
  });

  describe('Performance Validation', () => {
    test('auth state updates complete within 100ms', async () => {
      const startTime = performance.now();

      const TestComponent = () => {
        const { createPasskey, authState } = useAuth();

        React.useEffect(() => {
          createPasskey('testuser', 'Test User');
        }, [createPasskey]);

        return <div data-testid="status">{authState.status}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(mockAuthLogger.performance).toHaveBeenCalled();
    });

    test('handles rapid consecutive state updates', async () => {
      const TestComponent = () => {
        const { setAuthState, authState } = useAuth();

        React.useEffect(() => {
          // Simulate rapid state updates
          setAuthState({ status: 'authenticating' });
          setAuthState((prev) => ({
            ...prev,
            status: 'authenticated',
            method: 'passkey',
          }));
          setAuthState((prev) => ({ ...prev, status: 'failed' }));
        }, [setAuthState]);

        return <div data-testid="status">{authState.status}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockAuthStorageService.saveAuthState).toHaveBeenCalledTimes(3);
      });
    });

    test('maintains performance with multiple auth operations', async () => {
      const TestComponent = () => {
        const { createPasskey, verifyPasskey, setPinCode, verifyPinCode } =
          useAuth();

        React.useEffect(() => {
          const runOperations = async () => {
            // Multiple auth operations
            await createPasskey('user1', 'User 1');
            await verifyPasskey();
            setPinCode('1234', '1234');
            await verifyPinCode('1234');
          };

          runOperations();
        }, [createPasskey, verifyPasskey, setPinCode, verifyPinCode]);

        return <div>Test completed</div>;
      };

      const startTime = performance.now();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockPasskeyService.createCredential).toHaveBeenCalled();
        expect(mockPasskeyService.verifyCredential).toHaveBeenCalled();
        expect(mockPinService.validatePinAuth).toHaveBeenCalled();
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // Should complete within 200ms for multiple operations
    });
  });
});
