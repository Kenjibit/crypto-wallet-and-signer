import React from 'react';
import { render, act, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { usePasskeyAuth } from '../../hooks/usePasskeyAuth';
import { usePinAuth } from '../../hooks/usePinAuth';
import { PasskeyService } from '../../services/auth/PasskeyService';
import { PinService } from '../../services/auth/PinService';

// Mock all services
jest.mock('../../services/auth/PasskeyService');
jest.mock('../../services/auth/PinService');
jest.mock('../../services/encryption/PasskeyEncryptionService');
jest.mock('../../services/encryption/PinEncryptionService');
jest.mock('../../services/storage/AuthStorageService');
jest.mock('../../services/validation/AuthValidationService');
jest.mock('../../../utils/auth/authLogger', () => ({
  authLogger: {
    debug: jest.fn(),
    error: jest.fn(),
    performance: jest.fn(),
  },
}));

const mockPasskeyService = PasskeyService as jest.Mocked<typeof PasskeyService>;
const mockPinService = PinService as jest.Mocked<typeof PinService>;

describe('AuthContext with Authentication Hooks Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock window for PWA detection
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

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
        getRandomValues: jest.fn((array) => array.fill(0)),
        subtle: {
          importKey: jest.fn(),
          deriveKey: jest.fn(),
          exportKey: jest.fn(),
        },
      },
      writable: true,
    });

    // Mock PublicKeyCredential
    Object.defineProperty(window, 'PublicKeyCredential', {
      value: {
        isUserVerifyingPlatformAuthenticatorAvailable: jest
          .fn()
          .mockResolvedValue(true),
      },
      writable: true,
    });

    // Mock navigator.credentials
    Object.defineProperty(navigator, 'credentials', {
      value: {
        create: jest.fn(),
        get: jest.fn(),
      },
      writable: true,
    });

    // Setup service mocks
    mockPasskeyService.createCredential.mockResolvedValue({
      credential: {} as PublicKeyCredential,
      credentialId: 'mock-credential-id',
    });

    mockPasskeyService.verifyCredential.mockResolvedValue({
      success: true,
      authenticated: true,
    });

    mockPasskeyService.verifyCredentialExists.mockResolvedValue(true);
    mockPasskeyService.isSupported.mockResolvedValue({
      isSupported: true,
      hasWebAuthn: true,
      hasPlatformAuthenticator: true,
      hasConditionalMediation: false,
      platformAuthenticatorAvailable: true,
      isIOS: false,
      isIOS16Plus: false,
      isIOS18Plus: false,
    });

    mockPinService.validatePinAuth.mockReturnValue({
      isValid: true,
      errors: [],
    });

    mockPinService.verifyPinMatch.mockReturnValue(true);
    mockPinService.savePinAuth.mockImplementation(() => {});
    mockPinService.loadPinAuth.mockReturnValue({ pin: '', confirmPin: '' });
  });

  describe('Hook Integration with AuthContext', () => {
    test('AuthContext provides all authentication functions', () => {
      const TestComponent = () => {
        const auth = useAuth();

        return (
          <div>
            <div data-testid="auth-state">{auth.authState.status}</div>
            <div data-testid="has-createPasskey">{!!auth.createPasskey}</div>
            <div data-testid="has-verifyPasskey">{!!auth.verifyPasskey}</div>
            <div data-testid="has-setPinCode">{!!auth.setPinCode}</div>
            <div data-testid="has-verifyPinCode">{!!auth.verifyPinCode}</div>
            <div data-testid="has-encryptWithPasskey">
              {!!auth.encryptWithPasskey}
            </div>
            <div data-testid="has-decryptWithPasskey">
              {!!auth.decryptWithPasskey}
            </div>
            <div data-testid="has-encryptWithPin">{!!auth.encryptWithPin}</div>
            <div data-testid="has-decryptWithPin">{!!auth.decryptWithPin}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('auth-state')).toHaveTextContent(
        'unauthenticated'
      );
      expect(screen.getByTestId('has-createPasskey')).toHaveTextContent('true');
      expect(screen.getByTestId('has-verifyPasskey')).toHaveTextContent('true');
      expect(screen.getByTestId('has-setPinCode')).toHaveTextContent('true');
      expect(screen.getByTestId('has-verifyPinCode')).toHaveTextContent('true');
      expect(screen.getByTestId('has-encryptWithPasskey')).toHaveTextContent(
        'true'
      );
      expect(screen.getByTestId('has-decryptWithPasskey')).toHaveTextContent(
        'true'
      );
      expect(screen.getByTestId('has-encryptWithPin')).toHaveTextContent(
        'true'
      );
      expect(screen.getByTestId('has-decryptWithPin')).toHaveTextContent(
        'true'
      );
    });

    test('passkey authentication flow works end-to-end', async () => {
      const TestComponent = () => {
        const auth = useAuth();
        const [step, setStep] = React.useState<'idle' | 'creating' | 'created'>(
          'idle'
        );

        const handleCreatePasskey = async () => {
          setStep('creating');
          const success = await auth.createPasskey('testuser', 'Test User');
          if (success) {
            setStep('created');
          }
        };

        return (
          <div>
            <div data-testid="step">{step}</div>
            <div data-testid="auth-status">{auth.authState.status}</div>
            <div data-testid="auth-method">
              {auth.authState.method || 'none'}
            </div>
            <button onClick={handleCreatePasskey} data-testid="create-btn">
              Create Passkey
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('step')).toHaveTextContent('idle');
      expect(screen.getByTestId('auth-status')).toHaveTextContent(
        'unauthenticated'
      );
      expect(screen.getByTestId('auth-method')).toHaveTextContent('none');

      await act(async () => {
        screen.getByTestId('create-btn').click();
      });

      expect(screen.getByTestId('step')).toHaveTextContent('created');
      expect(screen.getByTestId('auth-status')).toHaveTextContent(
        'authenticated'
      );
      expect(screen.getByTestId('auth-method')).toHaveTextContent('passkey');
    });

    test('PIN authentication flow works end-to-end', () => {
      const TestComponent = () => {
        const auth = useAuth();
        const [step, setStep] = React.useState<'idle' | 'setting' | 'set'>(
          'idle'
        );

        const handleSetPin = () => {
          setStep('setting');
          const success = auth.setPinCode('1234', '1234');
          if (success) {
            setStep('set');
          }
        };

        return (
          <div>
            <div data-testid="step">{step}</div>
            <div data-testid="auth-status">{auth.authState.status}</div>
            <div data-testid="auth-method">
              {auth.authState.method || 'none'}
            </div>
            <button onClick={handleSetPin} data-testid="set-pin-btn">
              Set PIN
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('step')).toHaveTextContent('idle');
      expect(screen.getByTestId('auth-status')).toHaveTextContent(
        'unauthenticated'
      );
      expect(screen.getByTestId('auth-method')).toHaveTextContent('none');

      act(() => {
        screen.getByTestId('set-pin-btn').click();
      });

      expect(screen.getByTestId('step')).toHaveTextContent('set');
      expect(screen.getByTestId('auth-status')).toHaveTextContent(
        'authenticated'
      );
      expect(screen.getByTestId('auth-method')).toHaveTextContent('pin');
    });

    test('encryption functions work with authenticated state', async () => {
      const TestComponent = () => {
        const auth = useAuth();
        const [encrypted, setEncrypted] = React.useState<string>('');
        const [decrypted, setDecrypted] = React.useState<string>('');

        const handleEncrypt = async () => {
          // First set up passkey authentication
          await auth.createPasskey('testuser', 'Test User');
          // Then encrypt
          const result = await auth.encryptWithPasskey('test data');
          setEncrypted(result);
        };

        const handleDecrypt = async () => {
          if (encrypted) {
            const result = await auth.decryptWithPasskey(encrypted);
            setDecrypted(result);
          }
        };

        return (
          <div>
            <div data-testid="encrypted">{encrypted}</div>
            <div data-testid="decrypted">{decrypted}</div>
            <button onClick={handleEncrypt} data-testid="encrypt-btn">
              Encrypt
            </button>
            <button onClick={handleDecrypt} data-testid="decrypt-btn">
              Decrypt
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Test encryption
      await act(async () => {
        screen.getByTestId('encrypt-btn').click();
      });

      expect(screen.getByTestId('encrypted')).toHaveTextContent(
        'encrypted-data'
      );

      // Test decryption
      await act(async () => {
        screen.getByTestId('decrypt-btn').click();
      });

      expect(screen.getByTestId('decrypted')).toHaveTextContent(
        'decrypted-data'
      );
    });
  });

  describe('Hook Usage in Components', () => {
    test('usePasskeyAuth hook works independently', async () => {
      const TestComponent = () => {
        const passkeyAuth = usePasskeyAuth();
        const [result, setResult] = React.useState<boolean | null>(null);

        const handleCreate = async () => {
          const success = await passkeyAuth.createPasskey(
            'testuser',
            'Test User'
          );
          setResult(success);
        };

        return (
          <div>
            <div data-testid="result">
              {result === null ? 'null' : result.toString()}
            </div>
            <div data-testid="loading">{passkeyAuth.isLoading.toString()}</div>
            <div data-testid="error">{passkeyAuth.error || 'none'}</div>
            <button onClick={handleCreate} data-testid="create-btn">
              Create Passkey
            </button>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('result')).toHaveTextContent('null');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('none');

      await act(async () => {
        screen.getByTestId('create-btn').click();
      });

      expect(screen.getByTestId('result')).toHaveTextContent('true');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('none');
    });

    test('usePinAuth hook works independently', () => {
      const TestComponent = () => {
        const pinAuth = usePinAuth();
        const [result, setResult] = React.useState<boolean | null>(null);

        const handleSetPin = () => {
          const success = pinAuth.setPinCode('1234', '1234');
          setResult(success);
        };

        return (
          <div>
            <div data-testid="result">
              {result === null ? 'null' : result.toString()}
            </div>
            <div data-testid="error">{pinAuth.error || 'none'}</div>
            <div data-testid="stored-pin">{pinAuth.getStoredPin()}</div>
            <button onClick={handleSetPin} data-testid="set-pin-btn">
              Set PIN
            </button>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('result')).toHaveTextContent('null');
      expect(screen.getByTestId('error')).toHaveTextContent('none');
      expect(screen.getByTestId('stored-pin')).toHaveTextContent('');

      act(() => {
        screen.getByTestId('set-pin-btn').click();
      });

      expect(screen.getByTestId('result')).toHaveTextContent('true');
      expect(screen.getByTestId('error')).toHaveTextContent('none');
      expect(screen.getByTestId('stored-pin')).toHaveTextContent('1234');
    });
  });

  describe('Error Handling Integration', () => {
    test('handles passkey creation errors gracefully', async () => {
      mockPasskeyService.createCredential.mockRejectedValue(
        new Error('User cancelled')
      );

      const TestComponent = () => {
        const auth = useAuth();
        const [error, setError] = React.useState<string>('');

        const handleCreate = async () => {
          const success = await auth.createPasskey('testuser', 'Test User');
          if (!success) {
            // In a real app, you'd get error from auth state or hook
            setError('Creation failed');
          }
        };

        return (
          <div>
            <div data-testid="error">{error}</div>
            <button onClick={handleCreate} data-testid="create-btn">
              Create Passkey
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

      expect(screen.getByTestId('error')).toHaveTextContent('Creation failed');
    });

    test('handles PIN validation errors gracefully', () => {
      mockPinService.validatePinAuth.mockReturnValue({
        isValid: false,
        errors: ['PIN too weak'],
      });

      const TestComponent = () => {
        const auth = useAuth();
        const [error, setError] = React.useState<string>('');

        const handleSetPin = () => {
          const success = auth.setPinCode('1111', '1111');
          if (!success) {
            setError('PIN setup failed');
          }
        };

        return (
          <div>
            <div data-testid="error">{error}</div>
            <button onClick={handleSetPin} data-testid="set-pin-btn">
              Set PIN
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      act(() => {
        screen.getByTestId('set-pin-btn').click();
      });

      expect(screen.getByTestId('error')).toHaveTextContent('PIN setup failed');
    });
  });

  describe('PWA Compatibility', () => {
    test('works in PWA standalone mode', () => {
      // Mock PWA standalone mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const TestComponent = () => {
        const auth = useAuth();
        return (
          <div>
            <div data-testid="is-pwa">{auth.authState.isPWA.toString()}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('is-pwa')).toHaveTextContent('true');
    });

    test('handles offline mode gracefully', async () => {
      // Mock offline mode by making services reject with network errors
      mockPasskeyService.createCredential.mockRejectedValue(
        new Error('Network unavailable')
      );

      const TestComponent = () => {
        const auth = useAuth();
        const [error, setError] = React.useState<string>('');

        const handleCreate = async () => {
          try {
            await auth.createPasskey('testuser', 'Test User');
          } catch {
            setError('Network error handled');
          }
        };

        return (
          <div>
            <div data-testid="error">{error}</div>
            <button onClick={handleCreate} data-testid="create-btn">
              Create Passkey
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

      expect(screen.getByTestId('error')).toHaveTextContent(
        'Network error handled'
      );
    });
  });
});

