import React from 'react';
import { render, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { authLogger } from '../../utils/auth/authLogger';

import { vi } from 'vitest';
// Mock the authLogger to track calls
vi.mock('../../utils/auth/authLogger');
const mockAuthLogger = authLogger as vi.Mocked<typeof authLogger>;

// Mock console methods to ensure no accidental console output
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock WebAuthn API
Object.defineProperty(navigator, 'credentials', {
  value: {
    create: vi.fn(),
    get: vi.fn(),
  },
  writable: true,
});

describe('AuthContext Logging Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
  });

  test('logs initialization when AuthProvider mounts', () => {
    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>
    );

    expect(mockAuthLogger.debug).toHaveBeenCalledWith(
      'AuthContext initializing'
    );
    expect(mockAuthLogger.debug).toHaveBeenCalledWith(
      'No saved auth state found in localStorage'
    );
    expect(mockAuthLogger.debug).toHaveBeenCalledWith(
      'Using default auth state',
      expect.any(Object)
    );
  });

  test('logs localStorage operations during state changes', () => {
    const TestComponent = () => {
      const { setAuthState } = useAuth();

      React.useEffect(() => {
        act(() => {
          setAuthState({
            method: 'pin',
            status: 'authenticated',
            isPasskeySupported: false,
            isPWA: false,
          });
        });
      }, [setAuthState]);

      return <div>Test</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(mockAuthLogger.debug).toHaveBeenCalledWith('setAuthState called', {
      hasFunction: false,
    });
    expect(mockAuthLogger.debug).toHaveBeenCalledWith(
      'Auth state updated directly',
      expect.any(Object)
    );
  });

  test('logs PIN validation with performance timing', () => {
    const TestComponent = () => {
      const { setPinCode } = useAuth();

      React.useEffect(() => {
        act(() => {
          setPinCode('1234', '1234');
        });
      }, [setPinCode]);

      return <div>Test</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(mockAuthLogger.debug).toHaveBeenCalledWith('setPinCode called', {
      pinLength: 4,
      confirmPinLength: 4,
    });
    expect(mockAuthLogger.performance).toHaveBeenCalledWith(
      'validatePinAuth',
      expect.any(Number)
    );
  });

  test('logs passkey creation attempts', async () => {
    // Mock successful credential creation
    const mockCredential = {
      type: 'public-key',
      rawId: new Uint8Array(32),
    };
    (
      navigator.credentials.create as vi.MockedFunction<
        typeof navigator.credentials.create
      >
    ).mockResolvedValue(mockCredential);

    const TestComponent = () => {
      const { createPasskey } = useAuth();

      React.useEffect(() => {
        act(async () => {
          await createPasskey('testuser', 'Test User');
        });
      }, [createPasskey]);

      return <div>Test</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      // Wait for async operations
    });

    expect(mockAuthLogger.debug).toHaveBeenCalledWith('createPasskey called', {
      username: 'testuser',
      displayName: 'Test User',
    });
    expect(mockAuthLogger.debug).toHaveBeenCalledWith(
      'Current auth state before passkey creation',
      expect.any(Object)
    );
    expect(mockAuthLogger.performance).toHaveBeenCalledWith(
      'navigator.credentials.create',
      expect.any(Number)
    );
  });

  test('logs passkey verification attempts', async () => {
    // Mock successful assertion
    const mockAssertion = {
      type: 'public-key',
      response: {
        authenticatorData: new Uint8Array(32),
        clientDataJSON: new Uint8Array(32),
        signature: new Uint8Array(64),
      },
    };
    (
      navigator.credentials.get as vi.MockedFunction<
        typeof navigator.credentials.get
      >
    ).mockResolvedValue(mockAssertion);

    const TestComponent = () => {
      const { verifyPasskey } = useAuth();

      React.useEffect(() => {
        act(async () => {
          await verifyPasskey();
        });
      }, [verifyPasskey]);

      return <div>Test</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      // Wait for async operations
    });

    expect(mockAuthLogger.debug).toHaveBeenCalledWith('verifyPasskey called');
    expect(mockAuthLogger.performance).toHaveBeenCalledWith(
      'navigator.credentials.get (verification)',
      expect.any(Number)
    );
  });

  test('logs encryption operations with performance', async () => {
    const TestComponent = () => {
      const { encryptWithPin } = useAuth();

      React.useEffect(() => {
        act(async () => {
          try {
            await encryptWithPin('test data', '1234');
          } catch {
            // Expected to fail without proper crypto setup in test
          }
        });
      }, [encryptWithPin]);

      return <div>Test</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      // Wait for async operations
    });

    expect(mockAuthLogger.debug).toHaveBeenCalledWith('encryptWithPin called');
  });

  test('logs resetAuth operations', () => {
    const TestComponent = () => {
      const { resetAuth } = useAuth();

      React.useEffect(() => {
        act(() => {
          resetAuth();
        });
      }, [resetAuth]);

      return <div>Test</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(mockAuthLogger.debug).toHaveBeenCalledWith('resetAuth called');
    expect(mockAuthLogger.debug).toHaveBeenCalledWith(
      'Auth state reset to unauthenticated'
    );
    expect(mockAuthLogger.debug).toHaveBeenCalledWith(
      'Session authentication reset to false'
    );
    expect(mockAuthLogger.debug).toHaveBeenCalledWith('localStorage cleared');
  });

  test('logs logout operations', () => {
    const TestComponent = () => {
      const { logout } = useAuth();

      React.useEffect(() => {
        act(() => {
          logout();
        });
      }, [logout]);

      return <div>Test</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(mockAuthLogger.debug).toHaveBeenCalledWith('logout called');
    expect(mockAuthLogger.debug).toHaveBeenCalledWith(
      'Auth state set to unauthenticated'
    );
    expect(mockAuthLogger.debug).toHaveBeenCalledWith(
      'Session authentication reset to false'
    );
    expect(mockAuthLogger.debug).toHaveBeenCalledWith('localStorage cleared');
  });

  test('does not produce console output in production', () => {
    // Set production environment
    process.env.NODE_ENV = 'production';

    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>
    );

    // Verify no console output occurred
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    // Reset environment
    process.env.NODE_ENV = 'test';
  });

  test('handles localStorage errors gracefully', () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });

    const TestComponent = () => {
      const { setAuthState } = useAuth();

      React.useEffect(() => {
        act(() => {
          setAuthState({
            method: 'pin',
            status: 'authenticated',
            isPasskeySupported: false,
            isPWA: false,
          });
        });
      }, [setAuthState]);

      return <div>Test</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(mockAuthLogger.error).toHaveBeenCalledWith(
      'Failed to save auth state',
      expect.any(Error)
    );
  });

  test('logs performance metrics for validation operations', () => {
    const TestComponent = () => {
      const { setAuthState } = useAuth();

      React.useEffect(() => {
        act(() => {
          setAuthState({
            method: 'pin',
            status: 'authenticated',
            isPasskeySupported: false,
            isPWA: false,
          });
        });
      }, [setAuthState]);

      return <div>Test</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(mockAuthLogger.performance).toHaveBeenCalledWith(
      'validateAndCorrectAuthState',
      expect.any(Number)
    );
  });
});
