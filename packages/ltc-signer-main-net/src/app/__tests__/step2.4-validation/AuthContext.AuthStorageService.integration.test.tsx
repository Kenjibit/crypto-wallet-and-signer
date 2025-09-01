import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { AuthStorageService } from '../../services/storage/AuthStorageService';
import { PasskeyService } from '../../services/auth/PasskeyService';
import { PinService } from '../../services/auth/PinService';
import { authLogger } from '../../../utils/auth/authLogger';
import type { AuthState } from '../../types/auth';

import { vi } from 'vitest';
// Mock all services
vi.mock('../../services/auth/PasskeyService', () => ({
  PasskeyService: {
    isSupported: vi.fn(),
    createCredential: vi.fn(),
    verifyCredential: vi.fn(),
    verifyCredentialExists: vi.fn(),
  },
}));

vi.mock('../../services/auth/PinService', () => ({
  PinService: {
    validatePinAuth: vi.fn(),
    hashPin: vi.fn(),
    verifyPinMatch: vi.fn(),
    savePinAuth: vi.fn(),
    loadPinAuth: vi.fn(),
    clearPinAuth: vi.fn(),
  },
}));

vi.mock('../../services/storage/AuthStorageService', () => ({
  AuthStorageService: {
    loadAuthState: vi.fn(),
    saveAuthState: vi.fn(),
    clearAuthState: vi.fn(),
    hasAuthData: vi.fn(),
    getDebugData: vi.fn(),
    forceClearAuthData: vi.fn(),
  },
}));

vi.mock('../../../utils/auth/authLogger', () => ({
  authLogger: {
    debug: vi.fn(),
    error: vi.fn(),
    performance: vi.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('AuthContext + AuthStorageService Integration', () => {
  const mockPasskeyService = PasskeyService as vi.Mocked<typeof PasskeyService>;
  const mockPinService = PinService as vi.Mocked<typeof PinService>;
  const mockAuthStorageService = AuthStorageService as vi.Mocked<
    typeof AuthStorageService
  >;
  const mockAuthLogger = authLogger as vi.Mocked<typeof authLogger>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();

    // Default mocks
    mockPasskeyService.isSupported.mockResolvedValue({
      isSupported: true,
      hasCredentials: false,
    });
    mockPinService.loadPinAuth.mockReturnValue({ pin: '', confirmPin: '' });
    mockAuthStorageService.loadAuthState.mockReturnValue(null);
    mockAuthStorageService.getDebugData.mockReturnValue({
      authData: null,
      hasData: false,
    });
  });

  const TestComponent: React.FC<{
    onAuthStateChange?: (state: AuthState) => void;
  }> = ({ onAuthStateChange }) => {
    const {
      authState,
      createPasskey,
      verifyPasskey,
      setPinCode,
      resetAuth,
      logout,
    } = useAuth();

    React.useEffect(() => {
      onAuthStateChange?.(authState);
    }, [authState, onAuthStateChange]);

    return (
      <div data-testid="auth-state">
        <span data-testid="status">{authState.status}</span>
        <span data-testid="method">{authState.method || 'null'}</span>
        <button
          data-testid="create-passkey"
          onClick={() => createPasskey('test', 'Test User')}
        >
          Create Passkey
        </button>
        <button data-testid="verify-passkey" onClick={() => verifyPasskey()}>
          Verify Passkey
        </button>
        <button
          data-testid="set-pin"
          onClick={() => setPinCode('1234', '1234')}
        >
          Set PIN
        </button>
        <button data-testid="reset-auth" onClick={() => resetAuth()}>
          Reset Auth
        </button>
        <button data-testid="logout" onClick={() => logout()}>
          Logout
        </button>
      </div>
    );
  };

  describe('Initialization with AuthStorageService', () => {
    test('loads auth state from AuthStorageService on mount', async () => {
      const mockAuthState: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: false,
        isPWA: false,
        credentialId: 'test-credential-id',
      };

      mockAuthStorageService.loadAuthState.mockReturnValue(mockAuthState);

      let capturedAuthState: AuthState | null = null;
      render(
        <AuthProvider>
          <TestComponent
            onAuthStateChange={(state) => (capturedAuthState = state)}
          />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(capturedAuthState).toEqual(mockAuthState);
      });

      expect(mockAuthStorageService.loadAuthState).toHaveBeenCalled();
      expect(mockAuthLogger.debug).toHaveBeenCalledWith(
        'AuthContext initializing'
      );
      expect(mockAuthLogger.debug).toHaveBeenCalledWith(
        'Restored auth state from AuthStorageService',
        mockAuthState
      );
    });

    test('uses default state when AuthStorageService returns null', async () => {
      mockAuthStorageService.loadAuthState.mockReturnValue(null);

      let capturedAuthState: AuthState | null = null;
      render(
        <AuthProvider>
          <TestComponent
            onAuthStateChange={(state) => (capturedAuthState = state)}
          />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(capturedAuthState?.status).toBe('unauthenticated');
        expect(capturedAuthState?.method).toBeNull();
      });

      expect(mockAuthStorageService.loadAuthState).toHaveBeenCalled();
      expect(mockAuthLogger.debug).toHaveBeenCalledWith(
        'No saved auth state found, using default state'
      );
    });
  });

  describe('Auth state persistence with AuthStorageService', () => {
    test('saves auth state when passkey creation succeeds', async () => {
      const mockCredential = {
        credential: { id: 'test-credential-id' },
        credentialId: 'test-credential-id',
      };

      mockPasskeyService.createCredential.mockResolvedValue(mockCredential);

      let capturedAuthState: AuthState | null = null;
      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent
            onAuthStateChange={(state) => (capturedAuthState = state)}
          />
        </AuthProvider>
      );

      const createButton = getByTestId('create-passkey');
      await act(async () => {
        createButton.click();
      });

      await waitFor(() => {
        expect(capturedAuthState?.status).toBe('authenticated');
        expect(capturedAuthState?.method).toBe('passkey');
        expect(capturedAuthState?.credentialId).toBe('test-credential-id');
      });

      expect(mockAuthStorageService.saveAuthState).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'passkey',
          status: 'authenticated',
          credentialId: 'test-credential-id',
        })
      );
    });

    test('clears auth state when resetAuth is called', async () => {
      const mockAuthState: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: false,
        isPWA: false,
        credentialId: 'test-credential-id',
      };

      mockAuthStorageService.loadAuthState.mockReturnValue(mockAuthState);

      let capturedAuthState: AuthState | null = null;
      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent
            onAuthStateChange={(state) => (capturedAuthState = state)}
          />
        </AuthProvider>
      );

      // Wait for initial state to be loaded
      await waitFor(() => {
        expect(capturedAuthState?.status).toBe('authenticated');
      });

      const resetButton = getByTestId('reset-auth');
      await act(async () => {
        resetButton.click();
      });

      await waitFor(() => {
        expect(capturedAuthState?.status).toBe('unauthenticated');
        expect(capturedAuthState?.method).toBeNull();
        expect(capturedAuthState?.credentialId).toBeUndefined();
      });

      expect(mockAuthStorageService.forceClearAuthData).toHaveBeenCalled();
      expect(mockPinService.clearPinAuth).toHaveBeenCalled();
    });

    test('clears auth state when logout is called', async () => {
      const mockAuthState: AuthState = {
        method: 'pin',
        status: 'authenticated',
        isPasskeySupported: false,
        isPWA: false,
      };

      mockAuthStorageService.loadAuthState.mockReturnValue(mockAuthState);

      let capturedAuthState: AuthState | null = null;
      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent
            onAuthStateChange={(state) => (capturedAuthState = state)}
          />
        </AuthProvider>
      );

      // Wait for initial state to be loaded
      await waitFor(() => {
        expect(capturedAuthState?.status).toBe('authenticated');
      });

      const logoutButton = getByTestId('logout');
      await act(async () => {
        logoutButton.click();
      });

      await waitFor(() => {
        expect(capturedAuthState?.status).toBe('unauthenticated');
        expect(capturedAuthState?.method).toBeNull();
        expect(capturedAuthState?.credentialId).toBeUndefined();
      });

      expect(mockAuthStorageService.forceClearAuthData).toHaveBeenCalled();
      expect(mockPinService.clearPinAuth).toHaveBeenCalled();
    });
  });

  describe('Error handling with AuthStorageService', () => {
    test('handles AuthStorageService errors gracefully during initialization', async () => {
      mockAuthStorageService.loadAuthState.mockImplementation(() => {
        throw new Error('Storage error');
      });

      let capturedAuthState: AuthState | null = null;
      render(
        <AuthProvider>
          <TestComponent
            onAuthStateChange={(state) => (capturedAuthState = state)}
          />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(capturedAuthState?.status).toBe('unauthenticated');
        expect(capturedAuthState?.method).toBeNull();
      });

      expect(mockAuthLogger.error).toHaveBeenCalled();
    });

    test('handles AuthStorageService errors gracefully during save operations', async () => {
      mockAuthStorageService.saveAuthState.mockImplementation(() => {
        throw new Error('Storage save error');
      });

      const mockCredential = {
        credential: { id: 'test-credential-id' },
        credentialId: 'test-credential-id',
      };

      mockPasskeyService.createCredential.mockResolvedValue(mockCredential);

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const createButton = getByTestId('create-passkey');
      await act(async () => {
        createButton.click();
      });

      // Auth state should still update even if storage fails
      await waitFor(() => {
        expect(mockAuthLogger.error).toHaveBeenCalledWith(
          'AuthStorageService.saveAuthState - failed to save auth state',
          expect.any(Error)
        );
      });
    });

    test('handles AuthStorageService errors gracefully during clear operations', async () => {
      mockAuthStorageService.forceClearAuthData.mockImplementation(() => {
        throw new Error('Storage clear error');
      });

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const resetButton = getByTestId('reset-auth');
      await act(async () => {
        resetButton.click();
      });

      await waitFor(() => {
        expect(mockAuthLogger.error).toHaveBeenCalledWith(
          'Failed to clear auth state',
          expect.any(Error)
        );
      });
    });
  });

  describe('Debug data integration', () => {
    test('uses AuthStorageService.getDebugData for visibility change logging', async () => {
      const mockDebugData = {
        authData: JSON.stringify({
          method: 'passkey',
          status: 'authenticated',
        }),
        hasData: true,
      };

      mockAuthStorageService.getDebugData.mockReturnValue(mockDebugData);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger visibility change by dispatching the event
      await act(async () => {
        const visibilityEvent = new Event('visibilitychange');
        Object.defineProperty(document, 'hidden', {
          value: true,
          writable: true,
        });
        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          writable: true,
        });
        document.dispatchEvent(visibilityEvent);
      });

      expect(mockAuthStorageService.getDebugData).toHaveBeenCalled();
      expect(mockAuthLogger.debug).toHaveBeenCalledWith(
        'localStorage state on visibility change',
        {
          hasData: true,
          dataLength: mockDebugData.authData?.length,
        }
      );
    });
  });

  describe('PIN authentication integration', () => {
    test('saves PIN auth state when setPinCode succeeds', async () => {
      mockPinService.validatePinAuth.mockReturnValue({
        isValid: true,
        errors: [],
      });

      let capturedAuthState: AuthState | null = null;
      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent
            onAuthStateChange={(state) => (capturedAuthState = state)}
          />
        </AuthProvider>
      );

      const setPinButton = getByTestId('set-pin');
      await act(async () => {
        setPinButton.click();
      });

      await waitFor(() => {
        expect(capturedAuthState?.status).toBe('authenticated');
        expect(capturedAuthState?.method).toBe('pin');
      });

      expect(mockAuthStorageService.saveAuthState).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'pin',
          status: 'authenticated',
        })
      );
      expect(mockPinService.savePinAuth).toHaveBeenCalledWith({
        pin: '1234',
        confirmPin: '1234',
      });
    });
  });

  describe('Passkey verification integration', () => {
    test('clears storage when passkey verification fails with InvalidStateError', async () => {
      const mockAuthState: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: false,
        isPWA: false,
        credentialId: 'test-credential-id',
      };

      mockAuthStorageService.loadAuthState.mockReturnValue(mockAuthState);
      mockPasskeyService.verifyCredential.mockRejectedValue(
        new Error('credential not found')
      );

      let capturedAuthState: AuthState | null = null;
      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent
            onAuthStateChange={(state) => (capturedAuthState = state)}
          />
        </AuthProvider>
      );

      // Wait for initial state
      await waitFor(() => {
        expect(capturedAuthState?.status).toBe('authenticated');
      });

      const verifyButton = getByTestId('verify-passkey');
      await act(async () => {
        verifyButton.click();
      });

      await waitFor(() => {
        expect(capturedAuthState?.status).toBe('unauthenticated');
        expect(capturedAuthState?.method).toBeNull();
        expect(capturedAuthState?.credentialId).toBeUndefined();
      });

      expect(mockAuthStorageService.forceClearAuthData).toHaveBeenCalled();
    });
  });
});
