'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  validateAuthState,
  validatePasskeyCreation,
} from '../utils/auth-validation';
import { AuthValidationService } from '../services/validation/AuthValidationService';
import { PasskeyEncryptionService } from '../services/encryption/PasskeyEncryptionService';
import { PinEncryptionService } from '../services/encryption/PinEncryptionService';
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
  // Validation function now uses AuthValidationService
  const validateAndCorrectAuthState = (state: AuthState): AuthState => {
    const result = AuthValidationService.validateAndCorrectAuthState(state);
    return result.corrected || state;
  };

  // Add session authentication tracking
  const [sessionAuthenticated, setSessionAuthenticated] = useState(false);

  const [authState, setAuthStateInternal] = useState<AuthState>(() => {
    console.log('🚀 AuthContext initializing...');

    // Try to restore authentication state from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ltc-signer-auth');
        console.log('🔍 Found saved auth state in localStorage:', saved);

        if (saved) {
          const parsed = JSON.parse(saved);
          console.log('🔍 Parsed saved auth state:', parsed);

          const restored = {
            method: parsed.method || null,
            status: parsed.status || 'unauthenticated',
            isPasskeySupported: false, // Will be updated by useEffect
            isPWA: false, // Will be updated by useEffect
            credentialId: parsed.credentialId,
          };

          console.log('🔍 Restored auth state:', restored);

          // Validate restored state
          const validated = validateAndCorrectAuthState(restored);
          console.log('🔍 Validated restored state:', validated);

          return validated;
        } else {
          console.log('🔍 No saved auth state found in localStorage');
        }
      } catch (error) {
        console.error('❌ Failed to restore auth state:', error);
      }
    } else {
      console.log('🔍 Window not available, using default state');
    }

    const defaultState: AuthState = {
      method: null,
      status: 'unauthenticated',
      isPasskeySupported: false,
      isPWA: false,
    };

    console.log('🔍 Using default auth state:', defaultState);
    return defaultState;
  });

  // Validated wrapper for setAuthState
  const setAuthState = useCallback(
    (newState: AuthState | ((prev: AuthState) => AuthState)) => {
      console.log('🔄 setAuthState called with:', newState);
      if (typeof newState === 'function') {
        setAuthStateInternal((prev) => {
          const computed = newState(prev);
          const validated = validateAndCorrectAuthState(computed);

          // Reset session authentication if auth state becomes invalid
          if (
            validated.status === 'unauthenticated' ||
            validated.method === null
          ) {
            setSessionAuthenticated(false);
          }

          console.log('🛠️ Auth state after setAuthState:', validated);
          return validated;
        });
      } else {
        const validated = validateAndCorrectAuthState(newState);

        // Reset session authentication if auth state becomes invalid
        if (
          validated.status === 'unauthenticated' ||
          validated.method === null
        ) {
          setSessionAuthenticated(false);
        }

        setAuthStateInternal(validated);
        console.log('🛠️ Auth state after setAuthState:', validated);
      }
    },
    [setAuthStateInternal, setSessionAuthenticated]
  );

  // Track page visibility changes
  useEffect(() => {
    console.log('👁️ Setting up page visibility tracking...');

    const handleVisibilityChange = () => {
      console.log('👁️ Page visibility changed:', {
        hidden: document.hidden,
        visibilityState: document.visibilityState,
        timestamp: new Date().toISOString(),
      });

      // Log current auth state when visibility changes
      console.log('👁️ Current auth state on visibility change:', authState);
      console.log('👁️ Current session authentication:', sessionAuthenticated);

      // Check localStorage state
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('ltc-signer-auth');
          console.log('👁️ localStorage state on visibility change:', saved);
        } catch (error) {
          console.error(
            '👁️ Failed to read localStorage on visibility change:',
            error
          );
        }
      }
    };

    const handlePageShow = () => {
      console.log('👁️ Page show event fired');
    };

    const handlePageHide = () => {
      console.log('👁️ Page hide event fired');
    };

    const handleBeforeUnload = () => {
      console.log('👁️ Before unload event fired');
      console.log('👁️ Final auth state before unload:', authState);
      console.log(
        '👁️ Final session authentication before unload:',
        sessionAuthenticated
      );
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    console.log('👁️ Page visibility tracking set up');

    // Cleanup
    return () => {
      console.log('👁️ Cleaning up page visibility tracking...');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [authState, sessionAuthenticated]);

  const [pinAuth, setPinAuth] = useState<PinAuth>(() => {
    // Try to restore PIN auth from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ltc-signer-pin');
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            pin: parsed.pin || '',
            confirmPin: parsed.confirmPin || '',
          };
        }
      } catch (error) {
        console.error('Failed to restore PIN auth:', error);
      }
    }
    return { pin: '', confirmPin: '' };
  });

  // Check if device supports passkeys and if we have existing credentials
  useEffect(() => {
    console.log('🔍 useEffect: checkPasskeySupport running...');

    const checkPasskeySupport = async () => {
      console.log('🔍 Starting passkey support check...');

      // Check basic WebAuthn support
      const hasWebAuthn =
        typeof window !== 'undefined' && window.PublicKeyCredential;
      console.log('🔍 WebAuthn support:', hasWebAuthn);

      // Check platform authenticator support (this is what iOS 16+ provides)
      const hasPlatformAuthenticator =
        hasWebAuthn &&
        typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
          'function';
      console.log('🔍 Platform authenticator API:', hasPlatformAuthenticator);

      // Check conditional mediation (iOS 16.1+ feature)
      const hasConditionalMediation =
        hasWebAuthn &&
        typeof PublicKeyCredential.isConditionalMediationAvailable ===
          'function';
      console.log('🔍 Conditional mediation API:', hasConditionalMediation);

      // Detect iOS specifically with more comprehensive patterns
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isIOS16Plus =
        isIOS && /OS 1[6-9]|OS [2-9][0-9]/.test(navigator.userAgent);
      const isIOS18Plus =
        isIOS && /OS 1[8-9]|OS [2-9][0-9]/.test(navigator.userAgent);
      console.log('🔍 iOS detection:', { isIOS, isIOS16Plus, isIOS18Plus });

      // Check if actually available (not just API presence)
      let platformAuthenticatorAvailable = false;
      if (hasPlatformAuthenticator) {
        try {
          console.log('🔍 Checking platform authenticator availability...');
          platformAuthenticatorAvailable =
            await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          console.log(
            '🔍 Platform authenticator available:',
            platformAuthenticatorAvailable
          );
        } catch (error) {
          console.warn(
            '❌ Failed to check platform authenticator availability:',
            error
          );
          platformAuthenticatorAvailable = false;
        }
      }

      // iOS 16+ supports passkeys with platform authenticator
      // Also check actual availability, not just API presence
      const isSupported =
        hasPlatformAuthenticator && platformAuthenticatorAvailable;
      console.log('🔍 Final passkey support:', isSupported);

      // Log detection results for debugging
      if (typeof window !== 'undefined') {
        console.log('🔍 Passkey Support Detection:', {
          hasWebAuthn,
          hasPlatformAuthenticator,
          hasConditionalMediation,
          platformAuthenticatorAvailable,
          isIOS,
          isIOS16Plus,
          isIOS18Plus,
          userAgent: navigator.userAgent,
          isSupported,
          // Additional debugging info
          location: {
            hostname: window.location.hostname,
            protocol: window.location.protocol,
            origin: window.location.origin,
          },
          // Check if credentials API is available
          credentialsAPI: {
            available: !!navigator.credentials,
            create: !!(navigator.credentials && navigator.credentials.create),
            get: !!(navigator.credentials && navigator.credentials.get),
          },
        });
      }

      const isPWA =
        (typeof window !== 'undefined' &&
          window.matchMedia('(display-mode: standalone)').matches) ||
        (window.navigator as typeof window.navigator & { standalone?: boolean })
          .standalone === true;
      console.log('🔍 PWA detection:', isPWA);

      // Additional iOS-specific checks
      const finalSupported = isSupported;
      console.log('🔍 Final supported value:', finalSupported);

      console.log('🔍 Setting auth state with passkey support...');
      setAuthState((prev) => ({
        ...prev,
        isPasskeySupported: finalSupported || false,
        isPWA,
      }));
      console.log('🔍 Auth state updated with passkey support');

      // Note: We don't check for existing credentials during initialization
      // to avoid NotAllowedError. Credentials will be verified when user
      // actually tries to authenticate.
      console.log('🔍 Skipping credential verification during initialization');
    };

    checkPasskeySupport();
  }, [setAuthState]); // Only depend on setAuthState to avoid infinite loops

  // Save authentication state to localStorage whenever it changes
  useEffect(() => {
    console.log('🔄 localStorage effect triggered:', {
      window: typeof window !== 'undefined',
      status: authState.status,
      method: authState.method,
      credentialId: authState.credentialId ? 'exists' : 'null',
    });

    if (
      typeof window !== 'undefined' &&
      authState.status !== 'unauthenticated' &&
      authState.method !== null // Only save if method is selected
    ) {
      try {
        const dataToSave = {
          method: authState.method,
          status: authState.status,
          credentialId: authState.credentialId,
        };
        console.log('💾 Saving to localStorage:', dataToSave);
        localStorage.setItem('ltc-signer-auth', JSON.stringify(dataToSave));
        console.log('✅ Successfully saved to localStorage');
      } catch (error) {
        console.error('❌ Failed to save auth state:', error);
      }
    } else if (
      typeof window !== 'undefined' &&
      authState.status === 'unauthenticated' &&
      authState.method === null
    ) {
      // Only clear localStorage when BOTH status is unauthenticated AND method is null
      // This prevents clearing localStorage when status is 'failed' but we still have credentials
      try {
        console.log(
          '🗑️ Clearing localStorage due to completely unauthenticated state:',
          {
            status: authState.status,
            method: authState.method,
          }
        );
        localStorage.removeItem('ltc-signer-auth');
        console.log('✅ Successfully cleared localStorage');
      } catch (error) {
        console.error('❌ Failed to clear auth state:', error);
      }
    } else {
      console.log('⏭️ Skipping localStorage operation:', {
        window: typeof window !== 'undefined',
        status: authState.status,
        method: authState.method,
        reason:
          authState.status === 'unauthenticated'
            ? 'status is unauthenticated'
            : authState.method === null
            ? 'method is null'
            : 'unknown',
      });
    }
  }, [authState.method, authState.status, authState.credentialId]);

  // Create passkey
  const createPasskey = useCallback(
    async (username: string, displayName: string) => {
      console.log('🔐 createPasskey called:', { username, displayName });
      console.log('🔐 Current auth state before passkey creation:', authState);

      try {
        console.log('🔐 Setting status to authenticating...');
        setAuthState((prev) => ({ ...prev, status: 'authenticating' }));
        console.log('🔐 Status set to authenticating');

        // Generate a random challenge
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);
        console.log(
          '🔐 Generated challenge, calling navigator.credentials.create...'
        );

        // Create passkey with both ES256 and RS256 to avoid warnings
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: {
              name: 'LTC Signer',
              id: window.location.hostname,
            },
            user: {
              id: new Uint8Array(16),
              name: username,
              displayName,
            },
            pubKeyCredParams: [
              {
                type: 'public-key',
                alg: -7, // ES256
              },
              {
                type: 'public-key',
                alg: -257, // RS256
              },
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
            },
            timeout: 60000,
          },
        });

        console.log('🔐 navigator.credentials.create completed:', {
          hasCredential: !!credential,
          hasRawId: credential && 'rawId' in credential,
          credentialType: credential?.type,
        });

        if (credential && 'rawId' in credential) {
          // Store the credential ID for future reference
          const publicKeyCredential = credential as PublicKeyCredential;
          const credentialId = btoa(
            String.fromCharCode(...new Uint8Array(publicKeyCredential.rawId))
          );

          console.log('🔐 Credential ID generated:', {
            length: credentialId.length,
            preview: credentialId.substring(0, 10) + '...',
          });

          // Validate that the credential is properly formed
          if (!credentialId || credentialId.length === 0) {
            console.error('❌ Invalid credential ID generated');
            setAuthState((prev) => ({ ...prev, status: 'failed' }));
            return false;
          }

          const newState = {
            ...authState,
            method: 'passkey' as AuthMethod,
            status: 'authenticated' as AuthStatus,
            credentialId,
          };

          console.log('🔐 New state to be set:', newState);

          // Validate the new state before setting it
          const validation = validateAuthState(newState);
          if (!validation.isValid) {
            console.error(
              '❌ Auth state validation failed before setting:',
              validation.errors
            );
            setAuthState((prev) => ({ ...prev, status: 'failed' }));
            return false;
          }

          console.log('🔐 Setting authenticated state...');
          setAuthState(newState);
          console.log('🔐 Authenticated state set successfully');

          // Additional validation: Ensure state was actually set correctly
          setTimeout(() => {
            const postValidation = validatePasskeyCreation(newState);
            if (!postValidation) {
              console.error('🔐 Post-creation validation failed');
            } else {
              console.log('🔐 Post-creation validation passed');
            }
          }, 50);

          return true;
        } else {
          console.log('🔐 No credential or rawId, passkey creation failed');
        }
      } catch (error) {
        console.error('🔐 Passkey creation failed:', error);
        console.log('🔐 Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : 'No stack',
        });

        // Handle different types of errors properly
        if (error instanceof Error) {
          // Check if this is a user cancellation
          if (
            error.name === 'NotAllowedError' ||
            error.message.includes('User cancelled') ||
            error.message.includes('aborted')
          ) {
            console.log('🔐 Passkey creation cancelled by user');
            console.log('🔐 Checking for existing authentication...');

            // Check if there's existing authentication in localStorage
            let hasExistingAuth = false;
            if (typeof window !== 'undefined') {
              try {
                const savedAuth = localStorage.getItem('ltc-signer-auth');
                if (savedAuth) {
                  const parsedAuth = JSON.parse(savedAuth);
                  hasExistingAuth =
                    parsedAuth &&
                    parsedAuth.method &&
                    (parsedAuth.status === 'authenticated' ||
                      parsedAuth.credentialId);
                }
              } catch (localError) {
                console.error(
                  '🔐 Failed to check localStorage auth state:',
                  localError
                );
              }
            }

            if (hasExistingAuth) {
              console.log(
                '🔐 Found existing authentication, preserving state and setting to failed'
              );
              // Preserve existing authentication state but set status to failed
              // This will require re-verification instead of showing auth setup
              setAuthState((prev) => ({
                ...prev,
                status: 'failed',
                // Keep the existing method and credentialId
              }));
            } else {
              console.log(
                '🔐 No existing authentication, resetting to clean state'
              );
              // No existing auth, reset to clean state
              setAuthState((prev) => ({
                ...prev,
                method: null,
                status: 'unauthenticated',
                credentialId: undefined,
              }));
            }
          } else {
            console.log(
              '🔐 Setting status to failed for non-cancellation error'
            );
            // Other errors - set to failed state
            setAuthState((prev) => ({ ...prev, status: 'failed' }));
          }
        } else {
          console.log('🔐 Setting status to failed for unknown error type');
          // Unknown error - set to failed state
          setAuthState((prev) => ({ ...prev, status: 'failed' }));
        }
      }
      return false;
    },
    [authState, setAuthState]
  );

  // Verify passkey
  const verifyPasskey = useCallback(async () => {
    console.log('🔐 verifyPasskey called');
    console.log('🔐 Current auth state before verification:', authState);

    try {
      console.log('🔐 Setting status to authenticating...');
      setAuthState((prev) => ({ ...prev, status: 'authenticating' }));
      console.log('🔐 Status set to authenticating');

      // Generate a random challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      console.log(
        '🔐 Generated challenge, calling navigator.credentials.get...'
      );

      // Get passkey - use existing credential if available
      const credentialOptions = {
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: 'required' as UserVerificationRequirement,
          timeout: 60000,
          // If we have a stored credential ID, use it to find the specific credential
          ...(authState.credentialId && {
            allowCredentials: [
              {
                id: Uint8Array.from(atob(authState.credentialId), (c) =>
                  c.charCodeAt(0)
                ),
                type: 'public-key' as const,
              },
            ],
          }),
        },
        // Remove conditional mediation - it can cause hangs in some browsers
        // mediation: 'conditional',
      };

      console.log('🔐 Credential options:', {
        hasCredentialId: !!authState.credentialId,
        challengeLength: challenge.length,
        timeout: credentialOptions.publicKey.timeout,
        userVerification: credentialOptions.publicKey.userVerification,
      });

      const assertion = await navigator.credentials.get(credentialOptions);

      console.log('🔐 navigator.credentials.get completed:', {
        hasAssertion: !!assertion,
        assertionType: assertion?.type,
      });

      if (assertion) {
        console.log(
          '🔐 Passkey verification successful, setting authenticated state...'
        );
        setAuthState((prev) => ({ ...prev, status: 'authenticated' }));
        setSessionAuthenticated(true); // Mark as authenticated in this session
        console.log('🔐 Passkey verification completed successfully');
        return true;
      } else {
        console.log('🔐 No assertion returned from passkey verification');
        setAuthState((prev) => ({ ...prev, status: 'failed' }));
      }
    } catch (error) {
      console.error('🔐 Passkey verification failed:', error);
      console.log('🔐 Verification error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack',
      });

      // Handle specific error types
      if (error instanceof Error) {
        console.log('🔐 Error type analysis:', {
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

        // Check for user cancellation or timeout - DON'T clear localStorage for these
        if (
          error.name === 'NotAllowedError' ||
          error.name === 'AbortError' ||
          error.message.includes('not allowed') ||
          error.message.includes('timed out') ||
          error.message.includes('cancelled') ||
          error.message.includes('canceled') ||
          error.message.includes('aborted') ||
          error.message.includes('user cancelled') ||
          error.message.includes('user canceled')
        ) {
          console.log(
            '🔐 Passkey verification failed due to user cancellation or timeout - PRESERVING stored credential'
          );
          // Don't clear the stored credential for user cancellation
          // Just set status to failed
          setAuthState((prev) => ({ ...prev, status: 'failed' }));
        } else if (
          error.name === 'InvalidStateError' ||
          error.message.includes('credential not found') ||
          error.message.includes('not found')
        ) {
          console.log('🔐 Stored credential no longer exists, clearing it');
          // Credential doesn't exist, clear it
          setAuthState((prev) => ({
            ...prev,
            status: 'unauthenticated',
            method: null,
            credentialId: undefined,
          }));
          // Clear localStorage
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('ltc-signer-auth');
              console.log('🔐 localStorage cleared due to invalid credential');
            } catch (localError) {
              console.error('🔐 Failed to clear localStorage:', localError);
            }
          }
        } else {
          console.log(
            '🔐 Other verification error, setting failed state - PRESERVING stored credential'
          );
          // For other errors, don't clear localStorage - just set failed status
          setAuthState((prev) => ({ ...prev, status: 'failed' }));
        }
      } else {
        console.log(
          '🔐 Unknown verification error, setting failed state - PRESERVING stored credential'
        );
        // For unknown errors, don't clear localStorage - just set failed status
        setAuthState((prev) => ({ ...prev, status: 'failed' }));
      }
    }
    return false;
  }, [authState, setAuthState, setSessionAuthenticated]);

  // Set PIN code
  const setPinCode = useCallback(
    (pin: string, confirmPin: string) => {
      console.log('🔐 setPinCode called:', {
        pinLength: pin.length,
        confirmPinLength: confirmPin.length,
      });

      // Use AuthValidationService for PIN validation
      const validationResult = AuthValidationService.validatePinAuth(
        pin,
        confirmPin
      );

      if (validationResult.isValid) {
        console.log('🔐 PIN validation passed, setting authenticated state...');
        setAuthState((prev) => ({
          ...prev,
          method: 'pin',
          status: 'authenticated',
        }));
        const newPinAuth = { pin, confirmPin };
        setPinAuth(newPinAuth);
        console.log('🔐 PIN auth state updated');

        // Save PIN to localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('ltc-signer-pin', JSON.stringify(newPinAuth));
            console.log('🔐 PIN saved to localStorage');
          } catch (error) {
            console.error('❌ Failed to save PIN to localStorage:', error);
          }
        }

        return true;
      } else {
        console.log('🔐 PIN validation failed:', validationResult.errors);
        return false;
      }
    },
    [setAuthState, setPinAuth]
  );

  // Verify PIN code
  const verifyPinCode = useCallback(
    (pin: string) => {
      console.log('🔐 verifyPinCode called:', { pinLength: pin.length });
      console.log('🔐 PIN verification:', {
        inputPin: pin,
        storedPin: pinAuth.pin,
        pinsMatch: pin === pinAuth.pin,
      });

      if (pin === pinAuth.pin) {
        console.log(
          '🔐 PIN verification successful, setting authenticated state...'
        );
        setAuthState((prev) => ({ ...prev, status: 'authenticated' }));
        setSessionAuthenticated(true); // Mark as authenticated in this session
        console.log('🔐 PIN verification completed successfully');
        return true;
      } else {
        console.log('🔐 PIN verification failed, setting failed state...');
        setAuthState((prev) => ({ ...prev, status: 'failed' }));
        return false;
      }
    },
    [pinAuth.pin, setAuthState, setSessionAuthenticated]
  );

  // Reset authentication
  const resetAuth = useCallback(() => {
    console.log('🔄 resetAuth called');
    console.log('🔄 Current auth state before reset:', authState);
    console.log(
      '🔄 Current session authentication before reset:',
      sessionAuthenticated
    );

    setAuthState((prev) => ({
      ...prev,
      method: null,
      status: 'unauthenticated',
      credentialId: undefined,
    }));
    setPinAuth({ pin: '', confirmPin: '' });
    setSessionAuthenticated(false); // Reset session authentication

    console.log('🔄 Auth state reset to unauthenticated');
    console.log('🔄 Session authentication reset to false');

    // Clear from localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('ltc-signer-auth');
        localStorage.removeItem('ltc-signer-pin');
        console.log('🔄 localStorage cleared');
      } catch (error) {
        console.error('❌ Failed to clear auth state:', error);
      }
    }
  }, [
    authState,
    sessionAuthenticated,
    setAuthState,
    setPinAuth,
    setSessionAuthenticated,
  ]);

  // Logout
  const logout = useCallback(() => {
    console.log('🚪 logout called');
    console.log('🚪 Current auth state before logout:', authState);
    console.log(
      '🚪 Current session authentication before logout:',
      sessionAuthenticated
    );

    setAuthState((prev) => ({
      ...prev,
      status: 'unauthenticated',
      method: null,
      credentialId: undefined,
    }));
    setPinAuth({ pin: '', confirmPin: '' });
    setSessionAuthenticated(false); // Reset session authentication

    console.log('🚪 Auth state set to unauthenticated');
    console.log('🚪 Session authentication reset to false');

    // Clear from localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('ltc-signer-auth');
        localStorage.removeItem('ltc-signer-pin');
        console.log('🚪 localStorage cleared');
      } catch (error) {
        console.error('❌ Failed to clear auth state:', error);
      }
    }
  }, [
    authState,
    sessionAuthenticated,
    setAuthState,
    setPinAuth,
    setSessionAuthenticated,
  ]);

  // Stress test utilities (development only) - temporarily disabled for build
  const stressTestUtils = null; // process.env.NODE_ENV === 'development'
  /* ? {
          // Reset to clean state before testing
          resetToCleanState: () => {
            console.warn('🧪 STRESS TEST: Resetting to clean state');
            setAuthStateInternal({
              method: null,
              status: 'unauthenticated',
              isPasskeySupported: authState.isPasskeySupported,
              isPWA: authState.isPWA,
            });
            setPinAuth({ pin: '', confirmPin: '' });
            setSessionAuthenticated(false);
            localStorage.removeItem('ltc-signer-auth');
            localStorage.removeItem('ltc-signer-pin');
          },

          // Corrupt auth state for testing (bypasses validation)
          corruptAuthState: () => {
            console.warn(
              '🧪 STRESS TEST: Corrupting auth state (bypassing validation)'
            );
            setAuthStateInternal({
              method: 'pin' as AuthMethod,
              status: 'authenticated' as AuthStatus,
              isPasskeySupported: false,
              isPWA: false,
              credentialId: 'corrupted-credential',
            });
          },

          // Corrupt PIN data for testing
          corruptPinData: () => {
            console.warn('🧪 STRESS TEST: Corrupting PIN data');
            setPinAuth({ pin: 'corrupted', confirmPin: 'corrupted' });
          },

          // Simulate network failure
          simulateNetworkFailure: () => {
            console.warn('🧪 STRESS TEST: Simulating network failure');
            setAuthStateInternal((prev) => ({ ...prev, status: 'failed' }));
          },

          // Test validation by setting invalid state through normal setter
          testValidation: () => {
            console.warn(
              '🧪 STRESS TEST: Testing validation with invalid state'
            );
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
              authState,
              pinAuth,
              sessionAuthenticated,
              localStorage: {
                auth:
                  typeof window !== 'undefined'
                    ? localStorage.getItem('ltc-signer-auth')
                    : null,
                pin:
                  typeof window !== 'undefined'
                    ? localStorage.getItem('ltc-signer-pin')
                    : null,
              },
              validationRules: {
                'PIN method with credentialId':
                  authState.method === 'pin' && authState.credentialId
                    ? 'INVALID'
                    : 'OK',
                'Authenticated passkey without credentialId':
                  authState.method === 'passkey' &&
                  authState.status === 'authenticated' &&
                  !authState.credentialId
                    ? 'INVALID'
                    : 'OK',
                'Failed status':
                  authState.status === 'failed' ? 'INVALID' : 'OK',
                'Session authentication': sessionAuthenticated
                  ? 'AUTHENTICATED'
                  : 'NOT AUTHENTICATED',
              },
            };
          },

          // Test credential verification
          testCredentialVerification: async () => {
            console.warn('🧪 STRESS TEST: Testing credential verification');
            if (authState.method === 'passkey' && authState.credentialId) {
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
                        id: Uint8Array.from(atob(authState.credentialId), (c) =>
                          c.charCodeAt(0)
                        ),
                        type: 'public-key',
                      },
                    ],
                  },
                  // Use silent mediation for testing
                  mediation: 'silent',
                });

                console.log('🧪 Credential verification test result:', {
                  success: !!assertion,
                  hasAssertion: !!assertion,
                });

                return !!assertion;
              } catch (error) {
                console.log('🧪 Credential verification test failed:', error);
                return false;
              }
            } else {
              console.log('🧪 No passkey credential to test');
              return false;
            }
          },
        }
      : null;
  */

  // Passkey-based encryption and decryption functions
  const encryptWithPasskey = useCallback(
    async (data: string): Promise<string> => {
      console.log('🔐 encryptWithPasskey called');

      if (!authState.credentialId) {
        throw new Error('No passkey available for encryption');
      }

      try {
        // Generate a random challenge for encryption
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);
        console.log(
          '🔐 Generated challenge for encryption:',
          Array.from(challenge)
        );

        // Get the passkey signature to derive encryption key
        console.log('🔐 Requesting passkey assertion for encryption...');
        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge,
            rpId: window.location.hostname,
            userVerification: 'required',
            timeout: 60000,
            allowCredentials: [
              {
                id: Uint8Array.from(atob(authState.credentialId), (c) =>
                  c.charCodeAt(0)
                ),
                type: 'public-key',
              },
            ],
          },
        });

        console.log('🔐 Received assertion:', assertion);

        if (!assertion) {
          throw new Error(
            'No assertion returned from navigator.credentials.get'
          );
        }

        if (!('response' in assertion)) {
          throw new Error('Assertion does not contain response property');
        }

        // Extract the response first
        const assertionResponse =
          assertion.response as AuthenticatorAssertionResponse;

        if (!assertionResponse.signature) {
          throw new Error('Assertion response does not contain signature');
        }

        console.log('🔐 Assertion validation passed');

        // Extract the signature and response data
        const signature = new Uint8Array(assertionResponse.signature);
        const clientDataHash = await crypto.subtle.digest(
          'SHA-256',
          assertionResponse.clientDataJSON
        );
        const authenticatorData = assertionResponse.authenticatorData;

        // Combine signature data for key derivation
        const keyMaterial = new Uint8Array(
          signature.length +
            clientDataHash.byteLength +
            authenticatorData.byteLength
        );
        keyMaterial.set(signature, 0);
        keyMaterial.set(new Uint8Array(clientDataHash), signature.length);
        keyMaterial.set(
          new Uint8Array(authenticatorData),
          signature.length + clientDataHash.byteLength
        );

        // Derive encryption key using PBKDF2
        const salt = new Uint8Array(16);
        crypto.getRandomValues(salt);

        const baseKey = await crypto.subtle.importKey(
          'raw',
          keyMaterial,
          { name: 'PBKDF2' },
          false,
          ['deriveBits', 'deriveKey']
        );

        const encryptionKey = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256',
          },
          baseKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt']
        );

        // Generate IV
        const iv = new Uint8Array(12);
        crypto.getRandomValues(iv);

        // Encrypt the data
        const encodedData = new TextEncoder().encode(data);
        const encryptedData = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          encryptionKey,
          encodedData
        );

        // Create encrypted payload with metadata
        const encryptedPayload = {
          version: 1,
          algorithm: 'passkey-aes-gcm',
          salt: Array.from(salt),
          iv: Array.from(iv),
          data: Array.from(new Uint8Array(encryptedData)),
          timestamp: Date.now(),
          challenge: Array.from(challenge), // Store challenge for decryption
        };

        // Return base64 encoded encrypted payload
        return btoa(JSON.stringify(encryptedPayload));
      } catch (error) {
        console.error('🔐 Passkey encryption failed:', error);

        // Log detailed error information
        if (error instanceof Error) {
          console.error('🔐 Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
          });

          // Handle specific WebAuthn errors
          if (error.name === 'NotAllowedError') {
            throw new Error(
              'Passkey encryption was cancelled or timed out. Please try again.'
            );
          } else if (error.name === 'InvalidStateError') {
            throw new Error(
              'Passkey not found on this device. Please re-authenticate.'
            );
          } else if (error.name === 'AbortError') {
            throw new Error(
              'Passkey encryption was aborted. Please try again.'
            );
          }
        }

        throw new Error(
          `Passkey encryption failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    },
    [authState.credentialId]
  );

  const decryptWithPasskey = useCallback(
    async (encryptedData: string): Promise<string> => {
      console.log('🔐 decryptWithPasskey called');

      if (!authState.credentialId) {
        throw new Error('No passkey available for decryption');
      }

      try {
        // Parse the encrypted payload
        const payload = JSON.parse(atob(encryptedData));

        if (payload.version !== 1 || payload.algorithm !== 'passkey-aes-gcm') {
          throw new Error('Unsupported encrypted data format');
        }

        // Use the same challenge that was used during encryption
        const challenge = new Uint8Array(payload.challenge);

        // Get the passkey signature to derive the same encryption key
        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge,
            rpId: window.location.hostname,
            userVerification: 'required',
            timeout: 60000,
            allowCredentials: [
              {
                id: Uint8Array.from(atob(authState.credentialId), (c) =>
                  c.charCodeAt(0)
                ),
                type: 'public-key',
              },
            ],
          },
        });

        if (!assertion) {
          throw new Error('No assertion returned for decryption');
        }

        if (!('response' in assertion)) {
          throw new Error('Assertion does not contain response property');
        }

        // Extract the response first
        const assertionResponse =
          assertion.response as AuthenticatorAssertionResponse;

        if (!assertionResponse.signature) {
          throw new Error('Assertion response does not contain signature');
        }

        // Extract the signature and response data
        const signature = new Uint8Array(assertionResponse.signature);
        const clientDataHash = await crypto.subtle.digest(
          'SHA-256',
          assertionResponse.clientDataJSON
        );
        const authenticatorData = assertionResponse.authenticatorData;

        // Reconstruct the same key material used during encryption
        const keyMaterial = new Uint8Array(
          signature.length +
            clientDataHash.byteLength +
            authenticatorData.byteLength
        );
        keyMaterial.set(signature, 0);
        keyMaterial.set(new Uint8Array(clientDataHash), signature.length);
        keyMaterial.set(
          new Uint8Array(authenticatorData),
          signature.length + clientDataHash.byteLength
        );

        // Derive the same encryption key using the stored salt
        const salt = new Uint8Array(payload.salt);
        const baseKey = await crypto.subtle.importKey(
          'raw',
          keyMaterial,
          { name: 'PBKDF2' },
          false,
          ['deriveBits', 'deriveKey']
        );

        const decryptionKey = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256',
          },
          baseKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );

        // Decrypt the data using the stored IV
        const iv = new Uint8Array(payload.iv);
        const data = new Uint8Array(payload.data);

        const decryptedData = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          decryptionKey,
          data
        );

        // Return the decrypted string
        return new TextDecoder().decode(decryptedData);
      } catch (error) {
        console.error('🔐 Passkey decryption failed:', error);
        throw new Error(
          `Passkey decryption failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    },
    [authState.credentialId]
  );

  // PIN-based encryption and decryption functions
  const encryptWithPin = useCallback(
    async (data: string, pin: string): Promise<string> => {
      console.log('🔐 encryptWithPin called');

      try {
        // Derive encryption key from PIN using PBKDF2
        const salt = new Uint8Array(16);
        crypto.getRandomValues(salt);

        const keyMaterial = new TextEncoder().encode(pin);
        const baseKey = await crypto.subtle.importKey(
          'raw',
          keyMaterial,
          { name: 'PBKDF2' },
          false,
          ['deriveBits', 'deriveKey']
        );

        const encryptionKey = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256',
          },
          baseKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt']
        );

        // Generate IV
        const iv = new Uint8Array(12);
        crypto.getRandomValues(iv);

        // Encrypt the data
        const encodedData = new TextEncoder().encode(data);
        const encryptedData = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          encryptionKey,
          encodedData
        );

        // Create encrypted payload with metadata
        const encryptedPayload = {
          version: 1,
          algorithm: 'pin-aes-gcm',
          salt: Array.from(salt),
          iv: Array.from(iv),
          data: Array.from(new Uint8Array(encryptedData)),
          timestamp: Date.now(),
        };

        // Return base64 encoded encrypted payload
        return btoa(JSON.stringify(encryptedPayload));
      } catch (error) {
        console.error('🔐 PIN encryption failed:', error);
        throw new Error(
          `PIN encryption failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    },
    []
  );

  const decryptWithPin = useCallback(
    async (encryptedData: string, pin: string): Promise<string> => {
      console.log('🔐 decryptWithPin called');

      try {
        // Parse the encrypted payload
        const payload = JSON.parse(atob(encryptedData));

        if (payload.version !== 1 || payload.algorithm !== 'pin-aes-gcm') {
          throw new Error('Unsupported encrypted data format');
        }

        // Derive the same encryption key from PIN
        const salt = new Uint8Array(payload.salt);
        const keyMaterial = new TextEncoder().encode(pin);
        const baseKey = await crypto.subtle.importKey(
          'raw',
          keyMaterial,
          { name: 'PBKDF2' },
          false,
          ['deriveBits', 'deriveKey']
        );

        const decryptionKey = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256',
          },
          baseKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );

        // Decrypt the data
        const iv = new Uint8Array(payload.iv);
        const data = new Uint8Array(payload.data);

        const decryptedData = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          decryptionKey,
          data
        );

        // Return the decrypted string
        return new TextDecoder().decode(decryptedData);
      } catch (error) {
        console.error('🔐 PIN decryption failed:', error);
        throw new Error(
          `PIN decryption failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    },
    []
  );

  // Test passkey encryption/decryption
  const testPasskeyEncryption = useCallback(async (): Promise<boolean> => {
    try {
      const testData = 'Test wallet data for passkey encryption';
      console.log('🧪 Testing passkey encryption with data:', testData);

      // Encrypt the test data (this will prompt for passkey)
      console.log('🧪 Encrypting... (will prompt for passkey)');
      const encrypted = await encryptWithPasskey(testData);
      console.log('🧪 Data encrypted successfully');

      // Decrypt the test data (this will prompt for passkey again)
      console.log('🧪 Decrypting... (will prompt for passkey)');
      const decrypted = await decryptWithPasskey(encrypted);
      console.log('🧪 Data decrypted successfully');

      const success = decrypted === testData;
      console.log('🧪 Passkey encryption test result:', {
        success,
        original: testData,
        decrypted,
      });

      return success;
    } catch (error) {
      console.error('🧪 Passkey encryption test failed:', error);
      return false;
    }
  }, [encryptWithPasskey, decryptWithPasskey]);

  // Unified encryption functions - auto-detect auth method
  const encryptData = useCallback(
    async (data: string, pin?: string): Promise<string> => {
      console.log('🔐 encryptData called - unified encryption interface', {
        dataLength: data.length,
        hasPin: !!pin,
        authMethod: authState?.method,
      });

      if (!data) {
        throw new Error('No data provided for encryption');
      }

      if (authState?.method === 'passkey' && authState?.credentialId) {
        console.log('🔐 Auto-detected passkey encryption');
        // Use legacy implementation (backup file)
        return await PasskeyEncryptionService.encrypt(
          data,
          authState.credentialId
        );
      } else if (authState?.method === 'pin' && pin) {
        console.log('🔐 Auto-detected PIN encryption');
        // Use legacy implementation (backup file)
        return await PinEncryptionService.encrypt(data, pin);
      } else if (pin) {
        console.log('🔐 Fallback to PIN encryption with provided PIN');
        // Use legacy implementation (backup file)
        return await PinEncryptionService.encrypt(data, pin);
      } else {
        throw new Error(
          `No valid encryption method available. Auth method: ${
            authState?.method
          }, hasCredential: ${!!authState?.credentialId}, hasPin: ${!!pin}`
        );
      }
    },
    [authState]
  );

  const decryptData = useCallback(
    async (encryptedData: string, pin?: string): Promise<string> => {
      console.log('🔐 decryptData called - unified decryption interface', {
        encryptedDataLength: encryptedData.length,
        hasPin: !!pin,
        authMethod: authState?.method,
      });

      if (!encryptedData) {
        throw new Error('No encrypted data provided for decryption');
      }

      if (authState?.method === 'passkey' && authState?.credentialId) {
        console.log('🔐 Auto-detected passkey decryption');
        // Use legacy implementation (backup file)
        return await PasskeyEncryptionService.decrypt(
          encryptedData,
          authState.credentialId
        );
      } else if (authState?.method === 'pin' && pin) {
        console.log('🔐 Auto-detected PIN decryption');
        // Use legacy implementation (backup file)
        return await PinEncryptionService.decrypt(encryptedData, pin);
      } else if (pin) {
        console.log('🔐 Fallback to PIN decryption with provided PIN');
        // Use legacy implementation (backup file)
        return await PinEncryptionService.decrypt(encryptedData, pin);
      } else {
        throw new Error(
          `No valid decryption method available. Auth method: ${
            authState?.method
          }, hasCredential: ${!!authState?.credentialId}, hasPin: ${!!pin}`
        );
      }
    },
    [authState]
  );

  const value: AuthContextType = {
    authState,
    pinAuth,
    sessionAuthenticated,
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
      console.log('🔐 verifyCredentialExists called');
      console.log('🔐 Current auth state for verification:', authState);

      if (!authState.credentialId) {
        console.log('🔐 No credential ID to verify.');
        return false;
      }

      try {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);

        await navigator.credentials.get({
          publicKey: {
            challenge,
            rpId: window.location.hostname,
            userVerification: 'required',
            timeout: 60000,
            allowCredentials: [
              {
                id: Uint8Array.from(atob(authState.credentialId), (c) =>
                  c.charCodeAt(0)
                ),
                type: 'public-key',
              },
            ],
          },
          // Remove conditional mediation - it can cause hangs
          // mediation: 'conditional',
        });

        console.log('🔐 verifyCredentialExists: Credential found.');
        return true;
      } catch (error) {
        console.error('🔐 verifyCredentialExists failed:', error);
        console.log('🔐 Verification error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : 'No stack',
        });

        if (error instanceof Error) {
          if (
            error.name === 'NotAllowedError' ||
            error.message.includes('not allowed') ||
            error.message.includes('timed out')
          ) {
            console.log(
              '🔐 verifyCredentialExists failed due to user cancellation or timeout.'
            );
            return false;
          } else if (
            error.name === 'InvalidStateError' ||
            error.message.includes('credential not found')
          ) {
            console.log('🔐 verifyCredentialExists: Credential not found.');
            return false;
          }
        }
        return false;
      }
    },
    ...(stressTestUtils ? { stressTestUtils } : {}),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
