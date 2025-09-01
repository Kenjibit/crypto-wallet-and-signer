import { AuthStorageService } from '../AuthStorageService';
import { authLogger } from '../../../../utils/auth/authLogger';
import type { AuthState } from '../../../types/auth';

// Mock authLogger
jest.mock('../../../../utils/auth/authLogger', () => ({
  authLogger: {
    debug: jest.fn(),
    error: jest.fn(),
    performance: jest.fn(),
  },
}));

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

describe('AuthStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
  });

  describe('loadAuthState', () => {
    test('loads and parses valid auth state correctly', () => {
      const mockAuthState = {
        method: 'passkey' as const,
        status: 'authenticated' as const,
        credentialId: 'test-credential-id',
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockAuthState));

      const result = AuthStorageService.loadAuthState();

      expect(result).toEqual({
        method: 'passkey',
        status: 'authenticated',
        credentialId: 'test-credential-id',
        isPasskeySupported: false,
        isPWA: false,
      });
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('ltc-signer-auth');
      expect(authLogger.debug).toHaveBeenCalledWith(
        'AuthStorageService.loadAuthState - successfully loaded',
        expect.any(Object)
      );
      expect(authLogger.performance).toHaveBeenCalledWith(
        'AuthStorageService.loadAuthState',
        expect.any(Number)
      );
    });

    test('returns null when no saved data exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = AuthStorageService.loadAuthState();

      expect(result).toBeNull();
      expect(authLogger.debug).toHaveBeenCalledWith(
        'AuthStorageService.loadAuthState - no saved data found'
      );
    });

    test('handles invalid JSON gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      const result = AuthStorageService.loadAuthState();

      expect(result).toBeNull();
      expect(authLogger.error).toHaveBeenCalled();
    });

    test('handles localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const result = AuthStorageService.loadAuthState();

      expect(result).toBeNull();
      expect(authLogger.error).toHaveBeenCalledWith(
        'AuthStorageService.loadAuthState - failed to load auth state',
        expect.any(Error)
      );
    });

    test('handles server-side environment gracefully', () => {
      // Temporarily remove window.localStorage
      const originalLocalStorage = window.localStorage;
      delete (window as Window & Record<string, unknown>).localStorage;

      const result = AuthStorageService.loadAuthState();

      expect(result).toBeNull();
      expect(authLogger.debug).toHaveBeenCalledWith(
        'localStorage not available (server-side or unsupported)'
      );

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });

    test('validates parsed data structure', () => {
      mockLocalStorage.getItem.mockReturnValue('null');

      const result = AuthStorageService.loadAuthState();

      expect(result).toBeNull();
      expect(authLogger.error).toHaveBeenCalledWith(
        'AuthStorageService.loadAuthState - invalid data structure',
        expect.any(Error)
      );
    });
  });

  describe('saveAuthState', () => {
    test('saves valid auth state correctly', () => {
      const authState: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'test-credential-id',
      };

      AuthStorageService.saveAuthState(authState);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ltc-signer-auth',
        JSON.stringify({
          method: 'passkey',
          status: 'authenticated',
          credentialId: 'test-credential-id',
        })
      );
      expect(authLogger.debug).toHaveBeenCalledWith(
        'AuthStorageService.saveAuthState - successfully saved'
      );
      expect(authLogger.performance).toHaveBeenCalledWith(
        'AuthStorageService.saveAuthState',
        expect.any(Number)
      );
    });

    test('skips saving when status is unauthenticated', () => {
      const authState: AuthState = {
        method: null,
        status: 'unauthenticated',
        isPasskeySupported: false,
        isPWA: false,
      };

      AuthStorageService.saveAuthState(authState);

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      expect(authLogger.debug).toHaveBeenCalledWith(
        'AuthStorageService.saveAuthState - skipping save',
        {
          reason: 'status is unauthenticated',
        }
      );
    });

    test('skips saving when method is null', () => {
      const authState: AuthState = {
        method: null,
        status: 'authenticated',
        isPasskeySupported: false,
        isPWA: false,
        credentialId: 'test-credential-id',
      };

      AuthStorageService.saveAuthState(authState);

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      expect(authLogger.debug).toHaveBeenCalledWith(
        'AuthStorageService.saveAuthState - skipping save',
        {
          reason: 'method is null',
        }
      );
    });

    test('handles localStorage errors gracefully', () => {
      const authState: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'test-credential-id',
      };

      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      AuthStorageService.saveAuthState(authState);

      expect(authLogger.error).toHaveBeenCalledWith(
        'AuthStorageService.saveAuthState - failed to save auth state',
        expect.any(Error)
      );
    });

    test('handles server-side environment gracefully', () => {
      const authState: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'test-credential-id',
      };

      // Temporarily remove window.localStorage
      const originalLocalStorage = window.localStorage;
      delete (window as Window & Record<string, unknown>).localStorage;

      AuthStorageService.saveAuthState(authState);

      expect(authLogger.debug).toHaveBeenCalledWith(
        'localStorage not available for saving'
      );

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });
  });

  describe('clearAuthState', () => {
    test('clears auth state when both conditions are met', () => {
      const authState: AuthState = {
        method: null,
        status: 'unauthenticated',
        isPasskeySupported: false,
        isPWA: false,
      };

      AuthStorageService.clearAuthState(authState);

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        'ltc-signer-auth'
      );
      expect(authLogger.debug).toHaveBeenCalledWith(
        'AuthStorageService.clearAuthState - successfully cleared'
      );
      expect(authLogger.performance).toHaveBeenCalledWith(
        'AuthStorageService.clearAuthState',
        expect.any(Number)
      );
    });

    test('skips clearing when status is not unauthenticated', () => {
      const authState: AuthState = {
        method: null,
        status: 'authenticated',
        isPasskeySupported: false,
        isPWA: false,
      };

      AuthStorageService.clearAuthState(authState);

      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
      expect(authLogger.debug).toHaveBeenCalledWith(
        'AuthStorageService.clearAuthState - skipping clear',
        {
          reason: 'status is authenticated, not unauthenticated',
        }
      );
    });

    test('skips clearing when method is not null', () => {
      const authState: AuthState = {
        method: 'passkey',
        status: 'unauthenticated',
        isPasskeySupported: false,
        isPWA: false,
      };

      AuthStorageService.clearAuthState(authState);

      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
      expect(authLogger.debug).toHaveBeenCalledWith(
        'AuthStorageService.clearAuthState - skipping clear',
        {
          reason: 'method is passkey, not null',
        }
      );
    });

    test('handles localStorage errors gracefully', () => {
      const authState: AuthState = {
        method: null,
        status: 'unauthenticated',
        isPasskeySupported: false,
        isPWA: false,
      };

      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage operation failed');
      });

      AuthStorageService.clearAuthState(authState);

      expect(authLogger.error).toHaveBeenCalledWith(
        'AuthStorageService.clearAuthState - failed to clear auth state',
        expect.any(Error)
      );
    });
  });

  describe('hasAuthData', () => {
    test('returns true when valid auth data exists', () => {
      const mockAuthState = {
        method: 'passkey',
        status: 'authenticated',
        credentialId: 'test-credential-id',
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockAuthState));

      const result = AuthStorageService.hasAuthData();

      expect(result).toBe(true);
      expect(authLogger.debug).toHaveBeenCalledWith(
        'AuthStorageService.hasAuthData - result',
        {
          hasValidData: true,
          method: 'passkey',
          status: 'authenticated',
          hasCredentialId: true,
        }
      );
    });

    test('returns false when no data exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = AuthStorageService.hasAuthData();

      expect(result).toBe(false);
      expect(authLogger.debug).toHaveBeenCalledWith(
        'AuthStorageService.hasAuthData - no data found'
      );
    });

    test('returns false when data is invalid', () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({ invalid: 'data' })
      );

      const result = AuthStorageService.hasAuthData();

      expect(result).toBe(false);
      expect(authLogger.debug).toHaveBeenCalledWith(
        'AuthStorageService.hasAuthData - result',
        {
          hasValidData: false,
          method: undefined,
          status: undefined,
          hasCredentialId: false,
        }
      );
    });

    test('handles JSON parsing errors gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      const result = AuthStorageService.hasAuthData();

      expect(result).toBe(false);
      expect(authLogger.error).toHaveBeenCalled();
    });
  });

  describe('getDebugData', () => {
    test('returns debug data when available', () => {
      const mockData = JSON.stringify({
        method: 'passkey',
        status: 'authenticated',
      });
      mockLocalStorage.getItem.mockReturnValue(mockData);

      const result = AuthStorageService.getDebugData();

      expect(result).toEqual({
        authData: mockData,
        hasData: true,
      });
      expect(authLogger.debug).toHaveBeenCalledWith(
        'AuthStorageService.getDebugData - retrieved',
        {
          hasData: true,
          dataLength: mockData.length,
        }
      );
    });

    test('returns null data when no data exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = AuthStorageService.getDebugData();

      expect(result).toEqual({
        authData: null,
        hasData: false,
      });
    });

    test('handles server-side environment gracefully', () => {
      // Temporarily remove window.localStorage
      const originalLocalStorage = window.localStorage;
      delete (window as Window & Record<string, unknown>).localStorage;

      const result = AuthStorageService.getDebugData();

      expect(result).toEqual({
        authData: null,
        hasData: false,
      });

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });
  });

  describe('forceClearAuthData', () => {
    test('forces clearing of auth data', () => {
      AuthStorageService.forceClearAuthData();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        'ltc-signer-auth'
      );
      expect(authLogger.debug).toHaveBeenCalledWith(
        'AuthStorageService.forceClearAuthData - successfully cleared'
      );
      expect(authLogger.performance).toHaveBeenCalledWith(
        'AuthStorageService.forceClearAuthData',
        expect.any(Number)
      );
    });

    test('handles localStorage errors gracefully', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage operation failed');
      });

      AuthStorageService.forceClearAuthData();

      expect(authLogger.error).toHaveBeenCalledWith(
        'AuthStorageService.forceClearAuthData - failed to force clear auth data',
        expect.any(Error)
      );
    });
  });
});
