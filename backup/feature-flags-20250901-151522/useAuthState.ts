'use client';

import { useState, useCallback } from 'react';
import { AuthStorageService } from '../services/storage/AuthStorageService';
import { AuthValidationService } from '../services/validation/AuthValidationService';
import { authLogger } from '../../utils/auth/authLogger';
import type { AuthState } from '../types/auth';

/**
 * Custom hook for managing authentication state
 *
 * This hook provides offline-compatible state management for the air-gapped wallet.
 * All operations work completely offline without any external dependencies.
 *
 * Features:
 * - State initialization from localStorage via AuthStorageService
 * - Validated state updates using AuthValidationService
 * - Performance monitoring for all operations
 * - Session authentication tracking
 * - Error handling and recovery
 */
export const useAuthState = () => {
  const [sessionAuthenticated, setSessionAuthenticated] = useState(false);

  // Initialize auth state from localStorage (completely offline)
  const [authState, setAuthStateInternal] = useState<AuthState>(() => {
    authLogger.debug('useAuthState: Initializing auth state');

    try {
      // Use AuthStorageService for offline state restoration
      const restored = AuthStorageService.loadAuthState();

      if (restored) {
        authLogger.debug(
          'useAuthState: Restored auth state from storage',
          restored
        );

        // Validate restored state using AuthValidationService
        const validated =
          AuthValidationService.validateAndCorrectAuthState(restored);
        authLogger.debug('useAuthState: Validated restored state', validated);

        return validated.corrected || restored;
      } else {
        authLogger.debug(
          'useAuthState: No saved auth state found, using default state'
        );
      }
    } catch (error) {
      authLogger.error(
        'useAuthState: Error during state initialization',
        error instanceof Error ? error : new Error(String(error))
      );

      // Fallback to default state on initialization errors
      authLogger.debug(
        'useAuthState: Using fallback default state due to initialization error'
      );
    }

    // Default state for air-gapped wallet
    const defaultState: AuthState = {
      method: null,
      status: 'unauthenticated',
      isPasskeySupported: false,
      isPWA: false,
    };

    authLogger.debug('useAuthState: Using default auth state', defaultState);
    return defaultState;
  });

  /**
   * Validated wrapper for setting auth state
   *
   * This function provides offline-compatible state updates with validation.
   * All operations work without external dependencies.
   */
  const setAuthState = useCallback(
    (newState: AuthState | ((prev: AuthState) => AuthState)) => {
      const startTime = performance.now();

      authLogger.debug('useAuthState: setAuthState called', {
        hasFunction: typeof newState === 'function',
      });

      try {
        if (typeof newState === 'function') {
          setAuthStateInternal((prev) => {
            const computed = newState(prev);
            const validated =
              AuthValidationService.validateAndCorrectAuthState(computed);

            // Reset session authentication if auth state becomes invalid
            if (
              validated.corrected &&
              (validated.corrected.status === 'unauthenticated' ||
                validated.corrected.method === null)
            ) {
              setSessionAuthenticated(false);
            }

            authLogger.debug(
              'useAuthState: Auth state updated via function',
              validated
            );

            // Log performance
            const duration = performance.now() - startTime;
            authLogger.performance(
              'useAuthState.setAuthState.function',
              duration
            );

            return validated.corrected || computed;
          });
        } else {
          const validated =
            AuthValidationService.validateAndCorrectAuthState(newState);

          // Reset session authentication if auth state becomes invalid
          if (
            validated.corrected &&
            (validated.corrected.status === 'unauthenticated' ||
              validated.corrected.method === null)
          ) {
            setSessionAuthenticated(false);
          }

          setAuthStateInternal(validated.corrected || newState);
          authLogger.debug(
            'useAuthState: Auth state updated directly',
            validated
          );

          // Log performance
          const duration = performance.now() - startTime;
          authLogger.performance('useAuthState.setAuthState.direct', duration);
        }
      } catch (error) {
        authLogger.error(
          'useAuthState: Error in setAuthState',
          error instanceof Error ? error : new Error(String(error))
        );

        // Log performance even on error
        const duration = performance.now() - startTime;
        authLogger.performance('useAuthState.setAuthState.error', duration);

        // Re-throw to let caller handle the error
        throw error;
      }
    },
    [setSessionAuthenticated]
  );

  /**
   * Get debug information for the current auth state
   * Useful for debugging offline wallet state
   */
  const getDebugInfo = useCallback(() => {
    return {
      authState,
      sessionAuthenticated,
      storageData: AuthStorageService.getDebugData(),
      timestamp: new Date().toISOString(),
    };
  }, [authState, sessionAuthenticated]);

  return {
    authState,
    sessionAuthenticated,
    setAuthState,
    setSessionAuthenticated,
    getDebugInfo,
  };
};

/**
 * Legacy auth state hook for backward compatibility during migration
 * This will be removed once Phase 3 is complete
 */
export const useLegacyAuthState = () => {
  // This would contain the old inline state management logic
  // For now, just delegate to the new hook
  return useAuthState();
};

/**
 * Feature-flag-aware auth state hook
 *
 * This hook automatically chooses between legacy and new implementations
 * based on feature flags, enabling gradual migration for air-gapped wallet.
 *
 * Usage:
 * ```tsx
 * import { useAuthStateWithFeatureFlag } from '../hooks/useAuthState';
 *
 * const MyComponent = () => {
 *   const { authState, setAuthState } = useAuthStateWithFeatureFlag();
 *   // Works with both legacy and new implementations
 * };
 * ```
 */
export const useAuthStateWithFeatureFlag = () => {
  // Always call both hooks to follow Rules of Hooks
  const newHookResult = useAuthState();
  const legacyHookResult = useLegacyAuthState();

  // Import FEATURES here to avoid circular dependencies
  const FEATURES = {
    USE_AUTH_STATE_HOOK: process.env.NEXT_PUBLIC_USE_AUTH_STATE_HOOK === 'true',
  };

  // Return appropriate result based on feature flag
  return FEATURES.USE_AUTH_STATE_HOOK ? newHookResult : legacyHookResult;
};
