import { authLogger } from '../../../utils/auth/authLogger';
import type { AuthState } from '../../types/auth';

/**
 * AuthStorageService - Centralized localStorage operations for authentication
 *
 * Provides safe, error-handled localStorage operations with validation and logging.
 * All operations include comprehensive error handling and environment checks.
 */
export class AuthStorageService {
  private static readonly KEYS = {
    AUTH_STATE: 'ltc-signer-auth',
  } as const;

  /**
   * Load authentication state from localStorage
   * Returns null if no data exists or if loading fails
   */
  static loadAuthState(): AuthState | null {
    const startTime = performance.now();

    authLogger.debug('AuthStorageService.loadAuthState called');

    // Environment check
    if (typeof window === 'undefined' || !window.localStorage) {
      authLogger.debug(
        'localStorage not available (server-side or unsupported)'
      );
      return null;
    }

    try {
      const saved = localStorage.getItem(this.KEYS.AUTH_STATE);
      authLogger.debug('AuthStorageService.loadAuthState - localStorage data', {
        hasData: !!saved,
        dataLength: saved?.length || 0,
      });

      if (!saved) {
        authLogger.debug(
          'AuthStorageService.loadAuthState - no saved data found'
        );
        return null;
      }

      const parsed = JSON.parse(saved);
      authLogger.debug('AuthStorageService.loadAuthState - parsed data', {
        method: parsed.method,
        status: parsed.status,
        hasCredentialId: !!parsed.credentialId,
      });

      // Validate parsed data structure
      if (typeof parsed !== 'object' || parsed === null) {
        authLogger.error(
          'AuthStorageService.loadAuthState - invalid data structure',
          new Error('Parsed data is not an object')
        );
        return null;
      }

      const restored: AuthState = {
        method: parsed.method || null,
        status: parsed.status || 'unauthenticated',
        isPasskeySupported: false, // Will be updated by useEffect
        isPWA: false, // Will be updated by useEffect
        credentialId: parsed.credentialId,
      };

      const duration = performance.now() - startTime;
      authLogger.performance('AuthStorageService.loadAuthState', duration);

      authLogger.debug(
        'AuthStorageService.loadAuthState - successfully loaded',
        restored
      );
      return restored;
    } catch (error) {
      const duration = performance.now() - startTime;
      authLogger.performance(
        'AuthStorageService.loadAuthState (failed)',
        duration
      );

      authLogger.error(
        'AuthStorageService.loadAuthState - failed to load auth state',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  }

  /**
   * Save authentication state to localStorage
   * Only saves if method is selected and status is not unauthenticated
   */
  static saveAuthState(state: AuthState): void {
    const startTime = performance.now();

    authLogger.debug('AuthStorageService.saveAuthState called', {
      method: state.method,
      status: state.status,
      hasCredentialId: !!state.credentialId,
    });

    // Environment check
    if (typeof window === 'undefined' || !window.localStorage) {
      authLogger.debug('localStorage not available for saving');
      return;
    }

    // Only save if method is selected and status is not unauthenticated
    if (state.status === 'unauthenticated' || state.method === null) {
      authLogger.debug('AuthStorageService.saveAuthState - skipping save', {
        reason:
          state.status === 'unauthenticated'
            ? 'status is unauthenticated'
            : 'method is null',
      });
      return;
    }

    try {
      const dataToSave = {
        method: state.method,
        status: state.status,
        credentialId: state.credentialId,
      };

      authLogger.debug('AuthStorageService.saveAuthState - saving data', {
        method: dataToSave.method,
        status: dataToSave.status,
        hasCredentialId: !!dataToSave.credentialId,
      });

      localStorage.setItem(this.KEYS.AUTH_STATE, JSON.stringify(dataToSave));

      const duration = performance.now() - startTime;
      authLogger.performance('AuthStorageService.saveAuthState', duration);

      authLogger.debug('AuthStorageService.saveAuthState - successfully saved');
    } catch (error) {
      const duration = performance.now() - startTime;
      authLogger.performance(
        'AuthStorageService.saveAuthState (failed)',
        duration
      );

      authLogger.error(
        'AuthStorageService.saveAuthState - failed to save auth state',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Clear authentication state from localStorage
   * Only clears if both status is unauthenticated AND method is null
   */
  static clearAuthState(state: AuthState): void {
    const startTime = performance.now();

    authLogger.debug('AuthStorageService.clearAuthState called', {
      method: state.method,
      status: state.status,
    });

    // Environment check
    if (typeof window === 'undefined' || !window.localStorage) {
      authLogger.debug('localStorage not available for clearing');
      return;
    }

    // Only clear if BOTH status is unauthenticated AND method is null
    if (state.status === 'unauthenticated' && state.method === null) {
      try {
        authLogger.debug(
          'AuthStorageService.clearAuthState - clearing localStorage'
        );

        localStorage.removeItem(this.KEYS.AUTH_STATE);

        const duration = performance.now() - startTime;
        authLogger.performance('AuthStorageService.clearAuthState', duration);

        authLogger.debug(
          'AuthStorageService.clearAuthState - successfully cleared'
        );
      } catch (error) {
        const duration = performance.now() - startTime;
        authLogger.performance(
          'AuthStorageService.clearAuthState (failed)',
          duration
        );

        authLogger.error(
          'AuthStorageService.clearAuthState - failed to clear auth state',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    } else {
      authLogger.debug('AuthStorageService.clearAuthState - skipping clear', {
        reason:
          state.status !== 'unauthenticated'
            ? `status is ${state.status}, not unauthenticated`
            : `method is ${state.method}, not null`,
      });
    }
  }

  /**
   * Check if authentication data exists in localStorage
   * Returns true if valid auth data is found
   */
  static hasAuthData(): boolean {
    authLogger.debug('AuthStorageService.hasAuthData called');

    // Environment check
    if (typeof window === 'undefined' || !window.localStorage) {
      authLogger.debug('localStorage not available for checking');
      return false;
    }

    try {
      const saved = localStorage.getItem(this.KEYS.AUTH_STATE);

      if (!saved) {
        authLogger.debug('AuthStorageService.hasAuthData - no data found');
        return false;
      }

      const parsed = JSON.parse(saved);

      // Check if data has required authentication properties
      const hasValidData =
        parsed &&
        typeof parsed === 'object' &&
        parsed.method &&
        (parsed.status === 'authenticated' || parsed.credentialId);

      authLogger.debug('AuthStorageService.hasAuthData - result', {
        hasValidData,
        method: parsed?.method,
        status: parsed?.status,
        hasCredentialId: !!parsed?.credentialId,
      });

      return hasValidData;
    } catch (error) {
      authLogger.error(
        'AuthStorageService.hasAuthData - failed to check auth data',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  /**
   * Get raw authentication data for debugging purposes
   * Only use in development/testing environments
   */
  static getDebugData(): { authData: string | null; hasData: boolean } {
    authLogger.debug('AuthStorageService.getDebugData called');

    // Environment check
    if (typeof window === 'undefined' || !window.localStorage) {
      authLogger.debug('localStorage not available for debug data');
      return { authData: null, hasData: false };
    }

    try {
      const authData = localStorage.getItem(this.KEYS.AUTH_STATE);
      const hasData = !!authData;

      authLogger.debug('AuthStorageService.getDebugData - retrieved', {
        hasData,
        dataLength: authData?.length || 0,
      });

      return { authData, hasData };
    } catch (error) {
      authLogger.error(
        'AuthStorageService.getDebugData - failed to get debug data',
        error instanceof Error ? error : new Error(String(error))
      );
      return { authData: null, hasData: false };
    }
  }

  /**
   * Force clear authentication data (for emergency situations)
   * Use with caution - this bypasses normal validation
   */
  static forceClearAuthData(): void {
    const startTime = performance.now();

    authLogger.debug('AuthStorageService.forceClearAuthData called');

    // Environment check
    if (typeof window === 'undefined' || !window.localStorage) {
      authLogger.debug('localStorage not available for force clearing');
      return;
    }

    try {
      localStorage.removeItem(this.KEYS.AUTH_STATE);

      const duration = performance.now() - startTime;
      authLogger.performance('AuthStorageService.forceClearAuthData', duration);

      authLogger.debug(
        'AuthStorageService.forceClearAuthData - successfully cleared'
      );
    } catch (error) {
      const duration = performance.now() - startTime;
      authLogger.performance(
        'AuthStorageService.forceClearAuthData (failed)',
        duration
      );

      authLogger.error(
        'AuthStorageService.forceClearAuthData - failed to force clear auth data',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}
