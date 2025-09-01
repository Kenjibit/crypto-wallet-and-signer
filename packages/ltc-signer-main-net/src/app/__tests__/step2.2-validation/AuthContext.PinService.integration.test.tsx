import React from 'react';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { PinService } from '../../services/auth/PinService';
import { PinEncryptionService } from '../../services/encryption/PinEncryptionService';

// Mock the authLogger to avoid console output during tests
jest.mock('../../../utils/auth/authLogger', () => ({
  authLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    performance: jest.fn(),
  },
}));

// Mock crypto.getRandomValues
const mockGetRandomValues = jest.fn();
Object.defineProperty(global.crypto, 'getRandomValues', {
  value: mockGetRandomValues,
  writable: true,
});

// Mock crypto.subtle
const mockCryptoSubtle = {
  importKey: jest.fn(),
  deriveKey: jest.fn(),
  exportKey: jest.fn(),
  sign: jest.fn(),
  encrypt: jest.fn(),
  decrypt: jest.fn(),
};
Object.defineProperty(global.crypto, 'subtle', {
  value: mockCryptoSubtle,
  writable: true,
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('AuthContext - PinService Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset localStorage mocks
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockImplementation(() => {});
    mockLocalStorage.removeItem.mockImplementation(() => {});

    // Mock crypto operations
    mockGetRandomValues.mockImplementation((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = i % 256;
      }
    });

    const mockKey = { type: 'secret' };
    const mockEncryptedData = new Uint8Array([1, 2, 3, 4, 5]);
    const mockDecryptedData = new TextEncoder().encode('decrypted data');

    mockCryptoSubtle.importKey.mockResolvedValue(mockKey);
    mockCryptoSubtle.deriveKey.mockResolvedValue(mockKey);
    mockCryptoSubtle.exportKey.mockResolvedValue(mockEncryptedData);
    mockCryptoSubtle.encrypt.mockResolvedValue(mockEncryptedData);
    mockCryptoSubtle.decrypt.mockResolvedValue(mockDecryptedData);
  });

  describe('PIN Authentication Flow', () => {
    test('setPinCode uses PinService validation', async () => {
      const TestComponent = () => {
        const { setPinCode, authState } = useAuth();

        return (
          <div>
            <button
              onClick={() => setPinCode('1234', '1234')}
              data-testid="set-pin"
            >
              Set PIN
            </button>
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

      const setPinButton = screen.getByTestId('set-pin');

      await act(async () => {
        setPinButton.click();
      });

      expect(screen.getByTestId('auth-status')).toHaveTextContent(
        'authenticated'
      );
      expect(screen.getByTestId('auth-method')).toHaveTextContent('pin');
    });

    test('setPinCode rejects invalid PIN format', async () => {
      const TestComponent = () => {
        const { setPinCode, authState } = useAuth();

        return (
          <div>
            <button
              onClick={() => setPinCode('123', '123')} // Invalid: too short
              data-testid="set-invalid-pin"
            >
              Set Invalid PIN
            </button>
            <div data-testid="auth-status">{authState.status}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const setPinButton = screen.getByTestId('set-invalid-pin');

      await act(async () => {
        setPinButton.click();
      });

      // Should remain unauthenticated due to invalid PIN
      expect(screen.getByTestId('auth-status')).toHaveTextContent(
        'unauthenticated'
      );
    });

    test('verifyPinCode works with stored PIN', async () => {
      // First set up a PIN
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          pin: '1234',
          confirmPin: '1234',
        })
      );

      const TestComponent = () => {
        const { verifyPinCode, authState } = useAuth();

        return (
          <div>
            <button
              onClick={() => verifyPinCode('1234')}
              data-testid="verify-pin"
            >
              Verify PIN
            </button>
            <div data-testid="auth-status">{authState.status}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const verifyPinButton = screen.getByTestId('verify-pin');

      await act(async () => {
        verifyPinButton.click();
      });

      expect(screen.getByTestId('auth-status')).toHaveTextContent(
        'authenticated'
      );
    });
  });

  describe('PIN Encryption Integration', () => {
    test('encryptWithPin uses PinEncryptionService', async () => {
      const TestComponent = () => {
        const { encryptWithPin } = useAuth();
        const [result, setResult] = React.useState<string>('');

        return (
          <div>
            <button
              onClick={async () => {
                const encrypted = await encryptWithPin('test data', '1234');
                setResult(encrypted);
              }}
              data-testid="encrypt-data"
            >
              Encrypt Data
            </button>
            <div data-testid="encrypted-result">{result}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const encryptButton = screen.getByTestId('encrypt-data');

      await act(async () => {
        encryptButton.click();
      });

      const result = screen.getByTestId('encrypted-result').textContent;
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    test('decryptWithPin uses PinEncryptionService', async () => {
      const TestComponent = () => {
        const { decryptWithPin } = useAuth();
        const [result, setResult] = React.useState<string>('');

        return (
          <div>
            <button
              onClick={async () => {
                // First encrypt some data
                const encrypted = await PinEncryptionService.encrypt(
                  'test data',
                  '1234'
                );
                // Then decrypt it
                const decrypted = await decryptWithPin(encrypted, '1234');
                setResult(decrypted);
              }}
              data-testid="decrypt-data"
            >
              Decrypt Data
            </button>
            <div data-testid="decrypted-result">{result}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const decryptButton = screen.getByTestId('decrypt-data');

      await act(async () => {
        decryptButton.click();
      });

      expect(screen.getByTestId('decrypted-result')).toHaveTextContent(
        'test data'
      );
    });
  });

  describe('PIN State Persistence', () => {
    test('loads PIN auth from localStorage on initialization', () => {
      const savedPinAuth = { pin: '1234', confirmPin: '1234' };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedPinAuth));

      const TestComponent = () => {
        const { pinAuth } = useAuth();
        return (
          <div>
            <div data-testid="stored-pin">{pinAuth.pin}</div>
            <div data-testid="stored-confirm-pin">{pinAuth.confirmPin}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('stored-pin')).toHaveTextContent('1234');
      expect(screen.getByTestId('stored-confirm-pin')).toHaveTextContent(
        '1234'
      );
    });

    test('saves PIN auth to localStorage when PIN is set', async () => {
      const TestComponent = () => {
        const { setPinCode } = useAuth();

        return (
          <div>
            <button
              onClick={() => setPinCode('1234', '1234')}
              data-testid="set-pin-persist"
            >
              Set PIN with Persistence
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const setPinButton = screen.getByTestId('set-pin-persist');

      await act(async () => {
        setPinButton.click();
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ltc-signer-pin',
        JSON.stringify({ pin: '1234', confirmPin: '1234' })
      );
    });
  });

  describe('Reset and Logout Integration', () => {
    test('resetAuth clears PIN data from localStorage', async () => {
      const TestComponent = () => {
        const { resetAuth } = useAuth();

        return (
          <button onClick={resetAuth} data-testid="reset-auth">
            Reset Auth
          </button>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const resetButton = screen.getByTestId('reset-auth');

      await act(async () => {
        resetButton.click();
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        'ltc-signer-auth'
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        'ltc-signer-pin'
      );
    });

    test('logout clears PIN data from localStorage', async () => {
      const TestComponent = () => {
        const { logout } = useAuth();

        return (
          <button onClick={logout} data-testid="logout">
            Logout
          </button>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const logoutButton = screen.getByTestId('logout');

      await act(async () => {
        logoutButton.click();
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        'ltc-signer-auth'
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        'ltc-signer-pin'
      );
    });
  });

  describe('Error Handling Integration', () => {
    test('handles PIN encryption failures gracefully', async () => {
      mockCryptoSubtle.importKey.mockRejectedValue(new Error('Crypto failed'));

      const TestComponent = () => {
        const { encryptWithPin } = useAuth();
        const [error, setError] = React.useState<string>('');

        return (
          <div>
            <button
              onClick={async () => {
                try {
                  await encryptWithPin('test data', '1234');
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : 'Unknown error'
                  );
                }
              }}
              data-testid="encrypt-fail"
            >
              Encrypt with Failure
            </button>
            <div data-testid="error-message">{error}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const encryptButton = screen.getByTestId('encrypt-fail');

      await act(async () => {
        encryptButton.click();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'PIN encryption failed'
      );
    });

    test('handles localStorage failures gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const TestComponent = () => {
        const { setPinCode } = useAuth();

        return (
          <button
            onClick={() => setPinCode('1234', '1234')}
            data-testid="set-pin-storage-fail"
          >
            Set PIN with Storage Failure
          </button>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const setPinButton = screen.getByTestId('set-pin-storage-fail');

      // Should not throw, should handle error gracefully
      expect(async () => {
        await act(async () => {
          setPinButton.click();
        });
      }).not.toThrow();
    });
  });

  describe('Service Integration Verification', () => {
    test('AuthContext uses PinService for validation', async () => {
      // Spy on PinService methods
      const validatePinAuthSpy = jest.spyOn(PinService, 'validatePinAuth');

      const TestComponent = () => {
        const { setPinCode } = useAuth();

        return (
          <button
            onClick={() => setPinCode('1234', '1234')}
            data-testid="validate-with-service"
          >
            Validate with Service
          </button>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const validateButton = screen.getByTestId('validate-with-service');

      await act(async () => {
        validateButton.click();
      });

      expect(validatePinAuthSpy).toHaveBeenCalledWith('1234', '1234');
      validatePinAuthSpy.mockRestore();
    });

    test('AuthContext uses PinEncryptionService for crypto operations', async () => {
      // Spy on PinEncryptionService methods
      const encryptSpy = jest.spyOn(PinEncryptionService, 'encrypt');

      const TestComponent = () => {
        const { encryptWithPin } = useAuth();

        return (
          <button
            onClick={async () => {
              await encryptWithPin('test data', '1234');
            }}
            data-testid="encrypt-with-service"
          >
            Encrypt with Service
          </button>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const encryptButton = screen.getByTestId('encrypt-with-service');

      await act(async () => {
        encryptButton.click();
      });

      expect(encryptSpy).toHaveBeenCalledWith('test data', '1234');
      encryptSpy.mockRestore();
    });
  });
});
