'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import {
  validateAuthState,
  validatePasskeyCreation,
} from '../utils/auth-validation';
// STEP 4.1.6: Removed AuthValidationService import - validation now handled in useAuthState hook
import { PasskeyService } from '../services/auth/PasskeyService';
import { PasskeyEncryptionService } from '../services/encryption/PasskeyEncryptionService';
import { PinService } from '../services/auth/PinService';
import { PinEncryptionService } from '../services/encryption/PinEncryptionService';
import { AuthStorageService } from '../services/storage/AuthStorageService';
import { authLogger } from '../../utils/auth/authLogger';
import { FEATURES } from '../config/features';
import { useAuthState } from '../hooks/useAuthState';
import { usePasskeyAuth } from '../hooks/usePasskeyAuth';
import { usePinAuth } from '../hooks/usePinAuth';
import { useConditionalEncryption } from '../hooks/useEncryption';
import type {
  AuthMethod,
  AuthStatus,
  AuthState,
  PinAuth,
  AuthContextType,
} from '../types/auth';

// AuthContextType is now imported from types/auth.ts

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Initialize new hooks (always call hooks, but conditionally use them)
  const authStateHook = useAuthState();
  const passkeyAuth = usePasskeyAuth();
  const pinAuth = usePinAuth();
  const encryption = useConditionalEncryption();

  // STEP 4.1.6: Removed validateAndCorrectAuthState function
  // Validation is now handled inside the useAuthState hook

  // Use new auth state hook (migration completed in Step 4.1.4)
  const {
    authState: newAuthState,
    setAuthState: newSetAuthState,
    sessionAuthenticated: newSessionAuthenticated,
    setSessionAuthenticated: newSetSessionAuthenticated,
  } = authStateHook;

  // STEP 4.1.4: Using useAuthState hook exclusively (AUTH_STATE_HOOK_MIGRATION enabled)
  const currentAuthState = newAuthState;
  const currentSessionAuthenticated = newSessionAuthenticated;
  const currentSetSessionAuthenticated = newSetSessionAuthenticated;

  // STEP 4.1.4: Using newSetAuthState exclusively (validation handled by useAuthState hook)
  const setAuthState = newSetAuthState;

  // Track page visibility changes
  useEffect(() => {
    authLogger.debug('Setting up page visibility tracking');

    const handleVisibilityChange = () => {
      authLogger.debug('Page visibility changed', {
        hidden: document.hidden,
        visibilityState: document.visibilityState,
        timestamp: new Date().toISOString(),
      });

      // Log current auth state when visibility changes
      authLogger.debug('Current auth state on visibility change', {
        status: currentAuthState?.status || 'null',
        method: currentAuthState?.method || 'null',
        sessionAuthenticated: currentSessionAuthenticated,
      });

      // Check localStorage state using AuthStorageService
      const debugData = AuthStorageService.getDebugData();
      authLogger.debug('localStorage state on visibility change', {
        hasData: debugData.hasData,
        dataLength: debugData.authData?.length || 0,
      });
    };

    const handlePageShow = () => {
      authLogger.debug('Page show event fired');
    };

    const handlePageHide = () => {
      authLogger.debug('Page hide event fired');
    };

    const handleBeforeUnload = () => {
      authLogger.debug('Before unload event fired');
      authLogger.debug('Final auth state before unload', {
        status: currentAuthState?.status || 'null',
        method: currentAuthState?.method || 'null',
        sessionAuthenticated: currentSessionAuthenticated,
      });
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    authLogger.debug('Page visibility tracking set up');

    // Cleanup
    return () => {
      authLogger.debug('Cleaning up page visibility tracking');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentAuthState, currentSessionAuthenticated]);

  const [localPinAuth, setLocalPinAuth] = useState<PinAuth>(() => {
    // Use PinService to load PIN auth from localStorage
    const loadedPinAuth = PinService.loadPinAuth();
    authLogger.debug('Loaded PIN auth using PinService', {
      hasPin: !!loadedPinAuth.pin,
    });
    return loadedPinAuth;
  });

  // Check if device supports passkeys and if we have existing credentials
  useEffect(() => {
    authLogger.debug('useEffect: checkPasskeySupport running');

    const checkPasskeySupport = async () => {
      authLogger.debug('Starting passkey support check using PasskeyService');

      try {
        // Use PasskeyService for comprehensive support detection
        const supportInfo = await PasskeyService.isSupported();

        const isPWA =
          (typeof window !== 'undefined' &&
            window.matchMedia('(display-mode: standalone)').matches) ||
          (
            window.navigator as typeof window.navigator & {
              standalone?: boolean;
            }
          ).standalone === true;
        authLogger.debug('PWA detection', { isPWA });

        authLogger.debug(
          'Setting auth state with passkey support from PasskeyService'
        );
        setAuthState((prev) => ({
          ...prev,
          isPasskeySupported: supportInfo.isSupported,
          isPWA,
        }));
        authLogger.debug('Auth state updated with passkey support');

        // Note: We don't check for existing credentials during initialization
        // to avoid NotAllowedError. Credentials will be verified when user
        // actually tries to authenticate.
        authLogger.debug(
          'Skipping credential verification during initialization'
        );
      } catch (error) {
        authLogger.error(
          'Failed to check passkey support',
          error instanceof Error ? error : new Error(String(error))
        );
        // Fallback to unsupported state
        setAuthState((prev) => ({
          ...prev,
          isPasskeySupported: false,
          isPWA: false,
        }));
      }
    };

    checkPasskeySupport();
  }, [setAuthState]); // Only depend on setAuthState to avoid infinite loops

  // Save authentication state using AuthStorageService whenever it changes
  useEffect(() => {
    if (!currentAuthState) {
      authLogger.debug(
        'AuthStorageService effect: currentAuthState is null, skipping'
      );
      return;
    }

    authLogger.debug('AuthStorageService effect triggered', {
      status: currentAuthState.status,
      method: currentAuthState.method,
      credentialId: currentAuthState.credentialId ? 'exists' : 'null',
    });

    if (
      currentAuthState.status !== 'unauthenticated' &&
      currentAuthState.method !== null
    ) {
      // Only save if method is selected
      AuthStorageService.saveAuthState(currentAuthState);
    } else if (
      currentAuthState.status === 'unauthenticated' &&
      currentAuthState.method === null
    ) {
      // Only clear when BOTH status is unauthenticated AND method is null
      // This prevents clearing when status is 'failed' but we still have credentials
      AuthStorageService.clearAuthState(currentAuthState);
    } else {
      authLogger.debug('Skipping AuthStorageService operation', {
        status: currentAuthState.status,
        method: currentAuthState.method,
        reason:
          currentAuthState.status === 'unauthenticated'
            ? 'status is unauthenticated'
            : currentAuthState.method === null
            ? 'method is null'
            : 'unknown',
      });
    }
  }, [currentAuthState]);

  // Create passkey - conditionally use new hook or legacy implementation
  // Memoize stable auth state properties to reduce unnecessary re-renders
  const stableAuthStateProps = useMemo(
    () => ({
      isPasskeySupported: currentAuthState?.isPasskeySupported ?? false,
      isPWA: currentAuthState?.isPWA ?? false,
    }),
    [currentAuthState?.isPasskeySupported, currentAuthState?.isPWA]
  );

  const createPasskey = useCallback(
    async (username: string, displayName: string) => {
      // Use new hook if available (more stable than checking current state)
      if (passkeyAuth) {
        authLogger.debug('Using usePasskeyAuth hook for passkey creation');

        // First set status to authenticating
        setAuthState((prev) => ({ ...prev, status: 'authenticating' }));

        const success = await passkeyAuth.createPasskey(username, displayName);

        if (success) {
          // Update auth state with authenticated status
          setAuthState((prev) => ({
            ...prev,
            method: 'passkey' as AuthMethod,
            status: 'authenticated' as AuthStatus,
            credentialId: 'credential-created', // This would come from the hook result
          }));
          currentSetSessionAuthenticated(true);
          return true;
        } else {
          setAuthState((prev) => ({ ...prev, status: 'failed' }));
          return false;
        }
      }

      // Legacy implementation - only depends on stable properties
      authLogger.debug('createPasskey called (legacy)', {
        username,
        displayName,
      });

      try {
        authLogger.debug('Setting status to authenticating');
        setAuthState((prev) => ({ ...prev, status: 'authenticating' }));

        // Use PasskeyService to create the credential
        const result = await PasskeyService.createCredential(
          username,
          displayName
        );

        authLogger.debug('PasskeyService.createCredential completed', {
          hasCredential: !!result.credential,
          hasCredentialId: !!result.credentialId,
          credentialIdLength: result.credentialId.length,
        });

        // Validate that the credential is properly formed
        if (!result.credentialId || result.credentialId.length === 0) {
          authLogger.error('Invalid credential ID generated');
          setAuthState((prev) => ({ ...prev, status: 'failed' }));
          return false;
        }

        const newState: AuthState = {
          method: 'passkey' as AuthMethod,
          status: 'authenticated' as AuthStatus,
          credentialId: result.credentialId,
          ...stableAuthStateProps, // Use memoized stable properties
        };

        authLogger.debug('New state to be set', newState);

        // Validate the new state before setting it
        const validation = validateAuthState(newState);
        if (!validation.isValid) {
          authLogger.error(
            'Auth state validation failed before setting',
            new Error(`Validation errors: ${validation.errors.join(', ')}`)
          );
          setAuthState((prev) => ({ ...prev, status: 'failed' }));
          return false;
        }

        authLogger.debug('Setting authenticated state');
        setAuthState(newState);
        authLogger.debug('Authenticated state set successfully');

        // Additional validation: Ensure state was actually set correctly
        setTimeout(() => {
          const postValidation = validatePasskeyCreation(newState);
          if (!postValidation) {
            authLogger.error('Post-creation validation failed');
          } else {
            authLogger.debug('Post-creation validation passed');
          }
        }, 50);

        return true;
      } catch (error) {
        authLogger.error(
          'Passkey creation failed',
          error instanceof Error ? error : new Error(String(error))
        );

        // Simplified error handling - reduce complexity
        if (error instanceof Error) {
          if (
            error.name === 'NotAllowedError' ||
            error.message.includes('User cancelled') ||
            error.message.includes('aborted')
          ) {
            // Check if there's existing authentication
            const hasExistingAuth = AuthStorageService.hasAuthData();

            if (hasExistingAuth) {
              setAuthState((prev) => ({
                ...prev,
                status: 'failed',
              }));
            } else {
              setAuthState((prev) => ({
                ...prev,
                method: null,
                status: 'unauthenticated',
                credentialId: undefined,
              }));
            }
          } else {
            setAuthState((prev) => ({ ...prev, status: 'failed' }));
          }
        } else {
          setAuthState((prev) => ({ ...prev, status: 'failed' }));
        }
      }
      return false;
    },
    [
      // Reduced dependencies - removed currentAuthState to prevent unnecessary re-renders
      setAuthState,
      passkeyAuth,
      currentSetSessionAuthenticated,
      stableAuthStateProps, // Use memoized stable properties
    ]
  );

  // Memoize credential ID to reduce dependency on full auth state
  const currentCredentialId = useMemo(
    () => currentAuthState?.credentialId,
    [currentAuthState?.credentialId]
  );

  // Memoize auth method for encryption functions
  const currentAuthMethod = useMemo(
    () => currentAuthState?.method,
    [currentAuthState?.method]
  );

  // Verify passkey - conditionally use new hook or legacy implementation
  const verifyPasskey = useCallback(async () => {
    // Use new hook (migration completed in Step 4.1.8)
    if (passkeyAuth) {
      authLogger.debug('Using usePasskeyAuth hook for passkey verification');

      // Set status to authenticating
      setAuthState((prev) => ({ ...prev, status: 'authenticating' }));

      const success = await passkeyAuth.verifyPasskey(currentCredentialId);

      if (success) {
        setAuthState((prev) => ({ ...prev, status: 'authenticated' }));
        currentSetSessionAuthenticated(true);
        return true;
      } else {
        setAuthState((prev) => ({ ...prev, status: 'failed' }));
        return false;
      }
    }

    // Legacy implementation
    authLogger.debug('verifyPasskey called (legacy)');
    authLogger.debug('Current credential ID for verification', currentCredentialId);

    if (!currentCredentialId) {
      authLogger.debug('No credential ID available for verification');
      setAuthState((prev) => ({ ...prev, status: 'failed' }));
      return false;
    }

    try {
      authLogger.debug('Setting status to authenticating');
      setAuthState((prev) => ({ ...prev, status: 'authenticating' }));

      // Use PasskeyService to verify the credential
      const result = await PasskeyService.verifyCredential(currentCredentialId);

      authLogger.debug('PasskeyService.verifyCredential completed', {
        success: result.success,
        authenticated: result.authenticated,
      });

      if (result.success && result.authenticated) {
        authLogger.debug(
          'Passkey verification successful, setting authenticated state'
        );
        setAuthState((prev) => ({ ...prev, status: 'authenticated' }));
        currentSetSessionAuthenticated(true); // Mark as authenticated in this session
        authLogger.debug('Passkey verification completed successfully');
        return true;
      } else {
        authLogger.debug('Passkey verification failed');
        setAuthState((prev) => ({ ...prev, status: 'failed' }));
        return false;
      }
    } catch (error) {
      authLogger.error(
        'Passkey verification failed',
        error instanceof Error ? error : new Error(String(error))
      );
      authLogger.debug('Verification error details', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack',
      });

      // Handle specific error types
      if (error instanceof Error) {
        authLogger.debug('Error type analysis', {
          name: error.name,
          message: error.message,
          isNotAllowed: error.name === 'NotAllowedError',
          isInvalidState: error.name === 'InvalidStateError',
          isAbortError: error.name === 'AbortError',
          includesNotAllowed: error.message.includes('not allowed'),
          includesTimedOut: error.message.includes('timed out'),
          includesCancelled:
            error.message.includes('cancelled') ||
            error.message.includes('canceled'),
          includesAborted: error.message.includes('aborted'),
          includesUserCancelled:
            error.message.includes('user cancelled') ||
            error.message.includes('user canceled'),
        });

        // Simplified error handling for performance
        if (
          error.name === 'NotAllowedError' ||
          error.name === 'AbortError' ||
          error.message.includes('not allowed') ||
          error.message.includes('timed out') ||
          error.message.includes('cancelled') ||
          error.message.includes('canceled') ||
          error.message.includes('aborted')
        ) {
          // User cancellation - preserve stored credential
          setAuthState((prev) => ({ ...prev, status: 'failed' }));
        } else if (
          error.name === 'InvalidStateError' ||
          error.message.includes('credential not found')
        ) {
          // Credential doesn't exist - clear it
          setAuthState((prev) => ({
            ...prev,
            status: 'unauthenticated',
            method: null,
            credentialId: undefined,
          }));
          AuthStorageService.forceClearAuthData();
        } else {
          // Other errors - preserve stored credential
          setAuthState((prev) => ({ ...prev, status: 'failed' }));
        }
      } else {
        setAuthState((prev) => ({ ...prev, status: 'failed' }));
      }
    }
    return false;
  }, [
    // Optimized dependencies - only what's actually needed
    setAuthState,
    passkeyAuth,
    currentSetSessionAuthenticated,
    currentCredentialId, // Memoized credential ID instead of full auth state
  ]);

  // Set PIN code - conditionally use new hook or legacy implementation
  const setPinCode = useCallback(
    (pin: string, confirmPin: string) => {
      // Use new hook if feature flag is enabled
      if (pinAuth) {
        authLogger.debug('Using usePinAuth hook for PIN setup');

        const success = pinAuth.setPinCode(pin, confirmPin);

        if (success) {
          // Update auth state with authenticated status
          setAuthState((prev) => ({
            ...prev,
            method: 'pin',
            status: 'authenticated',
          }));
          // Update local PIN auth state
          setLocalPinAuth({ pin, confirmPin });
          currentSetSessionAuthenticated(true);
          return true;
        } else {
          setAuthState((prev) => ({ ...prev, status: 'failed' }));
          return false;
        }
      }

      // Legacy implementation
      authLogger.debug('setPinCode called (legacy)', {
        pinLength: pin.length,
        confirmPinLength: confirmPin.length,
      });

      // Use PinService for PIN validation
      const pinValidationStart = performance.now();
      const validationResult = PinService.validatePinAuth(pin, confirmPin);
      const pinValidationDuration = performance.now() - pinValidationStart;
      authLogger.performance('validatePinAuth', pinValidationDuration);

      if (validationResult.isValid) {
        authLogger.debug('PIN validation passed, setting authenticated state');
        setAuthState((prev) => ({
          ...prev,
          method: 'pin',
          status: 'authenticated',
        }));
        const newPinAuth = { pin, confirmPin };
        setLocalPinAuth(newPinAuth);
        authLogger.debug('PIN auth state updated');

        // Use PinService to save PIN to localStorage
        try {
          PinService.savePinAuth(newPinAuth);
          authLogger.debug('PIN saved to localStorage via PinService');
        } catch (error) {
          authLogger.error(
            'Failed to save PIN via PinService',
            error instanceof Error ? error : new Error(String(error))
          );
          // Continue with authentication even if storage fails
        }

        return true;
      } else {
        authLogger.debug('PIN validation failed', {
          errorCount: validationResult.errors.length,
          errors: validationResult.errors,
        });
        return false;
      }
    },
    [setAuthState, setLocalPinAuth, currentSetSessionAuthenticated, pinAuth]
  );

  // Verify PIN code - conditionally use new hook or legacy implementation
  const verifyPinCode = useCallback(
    (pin: string) => {
      // Use new hook if feature flag is enabled
      if (pinAuth) {
        authLogger.debug('Using usePinAuth hook for PIN verification');

        const success = pinAuth.verifyPinCode(pin);

        if (success) {
          setAuthState((prev) => ({ ...prev, status: 'authenticated' }));
          currentSetSessionAuthenticated(true);
          return true;
        } else {
          setAuthState((prev) => ({ ...prev, status: 'failed' }));
          return false;
        }
      }

      // Legacy implementation
      authLogger.debug('verifyPinCode called (legacy)', {
        pinLength: pin.length,
      });

      // Use PinService for PIN verification
      const pinsMatch = PinService.verifyPinMatch(pin, localPinAuth.pin);
      authLogger.debug('PIN verification result', {
        inputPinLength: pin.length,
        storedPinLength: localPinAuth.pin.length,
        pinsMatch,
      });

      if (pinsMatch) {
        authLogger.debug(
          'PIN verification successful, setting authenticated state'
        );
        setAuthState((prev) => ({ ...prev, status: 'authenticated' }));
        currentSetSessionAuthenticated(true); // Mark as authenticated in this session
        authLogger.debug('PIN verification completed successfully');
        return true;
      } else {
        authLogger.debug('PIN verification failed, setting failed state');
        setAuthState((prev) => ({ ...prev, status: 'failed' }));
        return false;
      }
    },
    [pinAuth, setAuthState, currentSetSessionAuthenticated, localPinAuth]
  );

  // Reset authentication
  const resetAuth = useCallback(() => {
    authLogger.debug('resetAuth called');
    authLogger.debug('Current auth state before reset', currentAuthState);
    authLogger.debug('Current session authentication before reset', {
      sessionAuthenticated: currentSessionAuthenticated,
    });

    setAuthState((prev) => ({
      ...prev,
      method: null,
      status: 'unauthenticated',
      credentialId: undefined,
    }));
    setLocalPinAuth({ pin: '', confirmPin: '' });
    currentSetSessionAuthenticated(false); // Reset session authentication

    authLogger.debug('Auth state reset to unauthenticated');
    authLogger.debug('Session authentication reset to false');

    // Use PinService to clear PIN data and AuthStorageService for auth state
    try {
      PinService.clearPinAuth();
      AuthStorageService.forceClearAuthData();
      authLogger.debug('Authentication data cleared via services');
    } catch (error) {
      authLogger.error(
        'Failed to clear auth state',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }, [
    // Optimized dependencies - only the setters that are actually used
    setAuthState,
    setLocalPinAuth,
    currentSetSessionAuthenticated,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    currentAuthState, // Only used for logging, not for function behavior
    currentSessionAuthenticated, // Only used for logging, not for function behavior
  ]);

  // Logout
  const logout = useCallback(() => {
    authLogger.debug('logout called');
    authLogger.debug('Current auth state before logout', currentAuthState);
    authLogger.debug('Current session authentication before logout', {
      sessionAuthenticated: currentSessionAuthenticated,
    });

    setAuthState((prev) => ({
      ...prev,
      status: 'unauthenticated',
      method: null,
      credentialId: undefined,
    }));
    setLocalPinAuth({ pin: '', confirmPin: '' });
    currentSetSessionAuthenticated(false); // Reset session authentication

    authLogger.debug('Auth state set to unauthenticated');
    authLogger.debug('Session authentication reset to false');

    // Use PinService to clear PIN data and AuthStorageService for auth state
    try {
      PinService.clearPinAuth();
      AuthStorageService.forceClearAuthData();
      authLogger.debug('Authentication data cleared via services');
    } catch (error) {
      authLogger.error(
        'Failed to clear auth state',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }, [
    // Optimized dependencies - only the setters that are actually used
    setAuthState,
    setLocalPinAuth,
    currentSetSessionAuthenticated,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    currentAuthState, // Only used for logging, not for function behavior
    currentSessionAuthenticated, // Only used for logging, not for function behavior
  ]);

  // Stress test utilities (development only) - temporarily disabled for build
  const stressTestUtils = null; // process.env.NODE_ENV === 'development'
  /* ? {
          // Reset to clean state before testing
          resetToCleanState: () => {
            authLogger.warn('STRESS TEST: Resetting to clean state');
            setAuthState({
              method: null,
              status: 'unauthenticated',
              isPasskeySupported: currentAuthState?.isPasskeySupported || false,
              isPWA: currentAuthState?.isPWA || false,
            });
            setLocalPinAuth({ pin: '', confirmPin: '' });
            currentSetSessionAuthenticated(false);
            AuthStorageService.forceClearAuthData();
            PinService.clearPinAuth();
          },

          // Corrupt auth state for testing (bypasses validation)
          corruptAuthState: () => {
            authLogger.warn('STRESS TEST: Corrupting auth state (bypassing validation)');
            setAuthState({
              method: 'pin' as AuthMethod,
              status: 'authenticated' as AuthStatus,
              isPasskeySupported: false,
              isPWA: false,
              credentialId: 'corrupted-credential',
            });
          },

          // Corrupt PIN data for testing
          corruptPinData: () => {
            authLogger.warn('STRESS TEST: Corrupting PIN data');
            setLocalPinAuth({ pin: 'corrupted', confirmPin: 'corrupted' });
          },

          // Simulate network failure
          simulateNetworkFailure: () => {
            authLogger.warn('STRESS TEST: Simulating network failure');
            setAuthState((prev) => ({ ...prev, status: 'failed' }));
          },

          // Test validation by setting invalid state through normal setter
          testValidation: () => {
            authLogger.warn('STRESS TEST: Testing validation with invalid state');
            setAuthState({
              method: 'pin' as AuthMethod,
              status: 'authenticated' as AuthStatus,
              isPasskeySupported: false,
              isPWA: false,
              credentialId: 'should-be-removed',
            });
          },

          // Get current auth state for debugging
          getDebugInfo: () => {
            return {
              authState: currentAuthState,
              pinAuth,
              sessionAuthenticated: currentSessionAuthenticated,
              localStorage: AuthStorageService.getDebugData(),
              validationRules: {
                'PIN method with credentialId':
                  currentAuthState?.method === 'pin' && currentAuthState?.credentialId
                    ? 'INVALID'
                    : 'OK',
                'Authenticated passkey without credentialId':
                  currentAuthState?.method === 'passkey' &&
                  currentAuthState?.status === 'authenticated' &&
                  !currentAuthState?.credentialId
                    ? 'INVALID'
                    : 'OK',
                'Failed status':
                  currentAuthState?.status === 'failed' ? 'INVALID' : 'OK',
                'Session authentication': currentSessionAuthenticated
                  ? 'AUTHENTICATED'
                  : 'NOT AUTHENTICATED',
              },
            };
          },

          // Test credential verification
          testCredentialVerification: async () => {
            authLogger.warn('STRESS TEST: Testing credential verification');
            if (currentAuthState?.method === 'passkey' && currentAuthState?.credentialId) {
              try {
                const challenge = new Uint8Array(32);
                crypto.getRandomValues(challenge);

                const assertion = await navigator.credentials.get({
                  publicKey: {
                    challenge,
                    rpId: window.location.hostname,
                    userVerification: 'discouraged',
                    timeout: 10000,
                    allowCredentials: [
                      {
                        id: Uint8Array.from(atob(currentAuthState.credentialId), (c) =>
                          c.charCodeAt(0)
                        ),
                        type: 'public-key',
                      },
                    ],
                  },
                  // Use silent mediation for testing
                  mediation: 'silent',
                });

                authLogger.debug('Credential verification test result', {
                  success: !!assertion,
                  hasAssertion: !!assertion,
                });

                return !!assertion;
              } catch (error) {
                authLogger.debug('Credential verification test failed', error instanceof Error ? error : new Error(String(error)));
                return false;
              }
            } else {
              authLogger.debug('No passkey credential to test');
              return false;
            }
          },
        }
      : null;
  */

  // Passkey-based encryption and decryption functions - conditionally use new hook
  const encryptWithPasskey = useCallback(
    async (data: string): Promise<string> => {
      // Use new encryption hook if feature flag is enabled
      if (FEATURES.USE_ENCRYPTION_HOOK && encryption) {
        authLogger.debug('Using useEncryption hook for passkey encryption');
        return await encryption.encryptWithPasskey(data);
      }

      // Use new passkey auth hook if feature flag is enabled
      if (passkeyAuth) {
        authLogger.debug('Using usePasskeyAuth hook for encryption');
        return await passkeyAuth.encryptWithPasskey(
          data,
          currentAuthState?.credentialId || ''
        );
      }

      // Legacy implementation
      authLogger.debug('encryptWithPasskey called (legacy)');

      if (!currentAuthState?.credentialId) {
        throw new Error('No passkey available for encryption');
      }

      // Use PasskeyEncryptionService to encrypt the data
      return await PasskeyEncryptionService.encrypt(
        data,
        currentAuthState.credentialId
      );
    },
    [currentAuthState, passkeyAuth, encryption]
  );

  const decryptWithPasskey = useCallback(
    async (encryptedData: string): Promise<string> => {
      // Use new encryption hook if feature flag is enabled
      if (FEATURES.USE_ENCRYPTION_HOOK && encryption) {
        authLogger.debug('Using useEncryption hook for passkey decryption');
        return await encryption.decryptWithPasskey(encryptedData);
      }

      // Use new passkey auth hook if feature flag is enabled
      if (passkeyAuth) {
        authLogger.debug('Using usePasskeyAuth hook for decryption');
        return await passkeyAuth.decryptWithPasskey(
          encryptedData,
          currentAuthState?.credentialId || ''
        );
      }

      // Legacy implementation
      authLogger.debug('decryptWithPasskey called (legacy)');

      if (!currentAuthState?.credentialId) {
        throw new Error('No passkey available for decryption');
      }

      // Use PasskeyEncryptionService to decrypt the data
      return await PasskeyEncryptionService.decrypt(
        encryptedData,
        currentAuthState.credentialId
      );
    },
    [currentAuthState, passkeyAuth, encryption]
  );

  // PIN-based encryption function - conditionally use new hook
  const encryptWithPin = useCallback(
    async (data: string, pin: string): Promise<string> => {
      // Use new encryption hook if feature flag is enabled
      if (encryption) {
        authLogger.debug('Using useEncryption hook for PIN encryption');
        return await encryption.encryptWithPin(data, pin);
      }

      // Use new PIN auth hook if feature flag is enabled
      if (pinAuth) {
        authLogger.debug('Using usePinAuth hook for PIN encryption');
        return await pinAuth.encryptWithPin(data, pin);
      }

      // Legacy implementation
      authLogger.debug('encryptWithPin called (legacy)');

      // Use PinEncryptionService for encryption
      return await PinEncryptionService.encrypt(data, pin);
    },
    [pinAuth, encryption]
  );

  // PIN-based decryption function - conditionally use new hook
  const decryptWithPin = useCallback(
    async (encryptedData: string, pin: string): Promise<string> => {
      // Use new encryption hook if feature flag is enabled
      if (encryption) {
        authLogger.debug('Using useEncryption hook for PIN decryption');
        return await encryption.decryptWithPin(encryptedData, pin);
      }

      // Use new PIN auth hook if feature flag is enabled
      if (pinAuth) {
        authLogger.debug('Using usePinAuth hook for PIN decryption');
        return await pinAuth.decryptWithPin(encryptedData, pin);
      }

      // Legacy implementation
      authLogger.debug('decryptWithPin called (legacy)');

      // Use PinEncryptionService for decryption
      return await PinEncryptionService.decrypt(encryptedData, pin);
    },
    [pinAuth, encryption]
  );

  // Test passkey encryption/decryption - conditionally use new hook
  const testPasskeyEncryption = useCallback(async (): Promise<boolean> => {
    // Use new encryption hook if feature flag is enabled
    if (FEATURES.USE_ENCRYPTION_HOOK && encryption) {
      authLogger.debug('Using useEncryption hook for encryption test');
      return await encryption.testPasskeyEncryption();
    }

    // Use new passkey auth hook if feature flag is enabled
    if (passkeyAuth) {
      authLogger.debug('Using usePasskeyAuth hook for encryption test');
      return await passkeyAuth.testPasskeyEncryption(
        currentAuthState?.credentialId || ''
      );
    }

    // Legacy implementation
    if (!currentAuthState?.credentialId) {
      authLogger.debug('No credential ID available for testing');
      return false;
    }

    // Use PasskeyEncryptionService to test encryption
    return await PasskeyEncryptionService.testEncryption(
      currentAuthState.credentialId
    );
  }, [currentAuthState, passkeyAuth, encryption]);

  // Unified encryption function - automatically detects auth method
  const encryptData = useCallback(
    async (data: string, pin?: string): Promise<string> => {
      const startTime = performance.now();

      try {
        authLogger.debug('encryptData called - unified encryption interface', {
          dataLength: data.length,
          hasPin: !!pin,
          authMethod: currentAuthMethod,
          hasCredential: !!currentCredentialId,
        });

        if (!data) {
          throw new Error('No data provided for encryption');
        }

        let result: string;

        // Auto-detect encryption method based on current auth state
        if (currentAuthMethod === 'passkey' && currentCredentialId) {
          authLogger.debug('Auto-detected passkey encryption');
          // Use new encryption hook if feature flag is enabled
          if (FEATURES.USE_ENCRYPTION_HOOK && encryption) {
            result = await encryption.encryptWithPasskey(data);
          } else if (passkeyAuth) {
            // Use new passkey auth hook if feature flag is enabled
            result = await passkeyAuth.encryptWithPasskey(
              data,
              currentCredentialId!
            );
          } else {
            // Legacy implementation
            result = await PasskeyEncryptionService.encrypt(
              data,
              currentCredentialId!
            );
          }
        } else if (currentAuthMethod === 'pin' && pin) {
          authLogger.debug('Auto-detected PIN encryption');
          // Use new encryption hook if feature flag is enabled
          if (FEATURES.USE_ENCRYPTION_HOOK && encryption) {
            result = await encryption.encryptWithPin(data, pin);
          } else if (pinAuth) {
            // Use new PIN auth hook if feature flag is enabled
            result = await pinAuth.encryptWithPin(data, pin);
          } else {
            // Legacy implementation
            result = await PinEncryptionService.encrypt(data, pin);
          }
        } else if (pin) {
          // Fallback: use PIN encryption if PIN is provided
          authLogger.debug('Fallback to PIN encryption with provided PIN');
          // Use new encryption hook if feature flag is enabled
          if (FEATURES.USE_ENCRYPTION_HOOK && encryption) {
            result = await encryption.encryptWithPin(data, pin);
          } else if (pinAuth) {
            // Use new PIN auth hook if feature flag is enabled
            result = await pinAuth.encryptWithPin(data, pin);
          } else {
            // Legacy implementation
            result = await PinEncryptionService.encrypt(data, pin);
          }
        } else {
          throw new Error(
            `No valid encryption method available. Auth method: ${
              currentAuthState?.method
            }, hasCredential: ${!!currentAuthState?.credentialId}, hasPin: ${!!pin}`
          );
        }

        const duration = performance.now() - startTime;
        authLogger.performance('encryptData (unified)', duration);
        authLogger.debug('Unified encryption completed successfully', {
          duration: `${duration.toFixed(2)}ms`,
          resultLength: result.length,
          method: currentAuthState?.method,
        });

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        authLogger.error(
          `encryptData (unified) failed: ${
            error instanceof Error ? error.message : String(error)
          } (${duration.toFixed(2)}ms, method: ${
            currentAuthState?.method
          }, credential: ${!!currentAuthState?.credentialId})`,
          error instanceof Error ? error : undefined
        );

        throw error;
      }
    },
    [
      // Optimized dependencies - use memoized values instead of full auth state
      currentAuthMethod,
      currentCredentialId,
      encryption,
      passkeyAuth,
      pinAuth,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      currentAuthState, // Only used in error messages, not for function behavior
    ]
  );

  // Unified decryption function - automatically detects auth method
  const decryptData = useCallback(
    async (encryptedData: string, pin?: string): Promise<string> => {
      const startTime = performance.now();

      try {
        authLogger.debug('decryptData called - unified decryption interface', {
          encryptedDataLength: encryptedData.length,
          hasPin: !!pin,
          authMethod: currentAuthMethod,
          hasCredential: !!currentCredentialId,
        });

        if (!encryptedData) {
          throw new Error('No encrypted data provided for decryption');
        }

        let result: string;

        // Auto-detect decryption method based on current auth state
        if (currentAuthMethod === 'passkey' && currentCredentialId) {
          authLogger.debug('Auto-detected passkey decryption');
          // Use new encryption hook if feature flag is enabled
          if (FEATURES.USE_ENCRYPTION_HOOK && encryption) {
            result = await encryption.decryptWithPasskey(encryptedData);
          } else if (passkeyAuth) {
            // Use new passkey auth hook if feature flag is enabled
            result = await passkeyAuth.decryptWithPasskey(
              encryptedData,
              currentCredentialId!
            );
          } else {
            // Legacy implementation
            result = await PasskeyEncryptionService.decrypt(
              encryptedData,
              currentCredentialId!
            );
          }
        } else if (currentAuthMethod === 'pin' && pin) {
          authLogger.debug('Auto-detected PIN decryption');
          // Use new encryption hook if feature flag is enabled
          if (FEATURES.USE_ENCRYPTION_HOOK && encryption) {
            result = await encryption.decryptWithPin(encryptedData, pin);
          } else if (pinAuth) {
            // Use new PIN auth hook if feature flag is enabled
            result = await pinAuth.decryptWithPin(encryptedData, pin);
          } else {
            // Legacy implementation
            result = await PinEncryptionService.decrypt(encryptedData, pin);
          }
        } else if (pin) {
          // Fallback: use PIN decryption if PIN is provided
          authLogger.debug('Fallback to PIN decryption with provided PIN');
          // Use new encryption hook if feature flag is enabled
          if (FEATURES.USE_ENCRYPTION_HOOK && encryption) {
            result = await encryption.decryptWithPin(encryptedData, pin);
          } else if (pinAuth) {
            // Use new PIN auth hook if feature flag is enabled
            result = await pinAuth.decryptWithPin(encryptedData, pin);
          } else {
            // Legacy implementation
            result = await PinEncryptionService.decrypt(encryptedData, pin);
          }
        } else {
          throw new Error(
            `No valid decryption method available. Auth method: ${
              currentAuthState?.method
            }, hasCredential: ${!!currentAuthState?.credentialId}, hasPin: ${!!pin}`
          );
        }

        const duration = performance.now() - startTime;
        authLogger.performance('decryptData (unified)', duration);
        authLogger.debug('Unified decryption completed successfully', {
          duration: `${duration.toFixed(2)}ms`,
          resultLength: result.length,
          method: currentAuthState?.method,
        });

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        authLogger.error(
          `decryptData (unified) failed: ${
            error instanceof Error ? error.message : String(error)
          } (${duration.toFixed(2)}ms, method: ${
            currentAuthState?.method
          }, credential: ${!!currentAuthState?.credentialId})`,
          error instanceof Error ? error : undefined
        );

        throw error;
      }
    },
    [
      // Optimized dependencies - use memoized values instead of full auth state
      currentAuthMethod,
      currentCredentialId,
      encryption,
      passkeyAuth,
      pinAuth,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      currentAuthState, // Only used in error messages, not for function behavior
    ]
  );

  const value: AuthContextType = {
    authState: currentAuthState || {
      method: null,
      status: 'unauthenticated',
      isPasskeySupported: false,
      isPWA: false,
    },
    pinAuth: localPinAuth,
    sessionAuthenticated: currentSessionAuthenticated,
    createPasskey,
    verifyPasskey,
    setPinCode,
    verifyPinCode,
    resetAuth,
    logout,
    // Passkey encryption functions
    encryptWithPasskey,
    decryptWithPasskey,
    // PIN encryption functions
    encryptWithPin,
    decryptWithPin,
    // Unified encryption functions - auto-detect auth method
    encryptData,
    decryptData,
    // Test function
    testPasskeyEncryption,
    verifyCredentialExists: async () => {
      // Use new hook if feature flag is enabled
      if (passkeyAuth) {
        authLogger.debug(
          'Using usePasskeyAuth hook for credential existence check'
        );
        return await passkeyAuth.verifyCredentialExists(
          currentAuthState?.credentialId || ''
        );
      }

      // Legacy implementation
      authLogger.debug('verifyCredentialExists called (legacy)');
      authLogger.debug('Current auth state for verification', {
        method: currentAuthState?.method || 'null',
        credentialId: currentAuthState?.credentialId ? 'exists' : 'null',
      });

      if (!currentAuthState?.credentialId) {
        authLogger.debug('No credential ID to verify');
        return false;
      }

      // Use PasskeyService to verify credential exists
      const exists = await PasskeyService.verifyCredentialExists(
        currentAuthState.credentialId
      );

      authLogger.debug('PasskeyService.verifyCredentialExists result', {
        exists,
      });
      return exists;
    },
    ...(stressTestUtils ? { stressTestUtils } : {}),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
