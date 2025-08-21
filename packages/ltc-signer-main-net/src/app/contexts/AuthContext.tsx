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

export type AuthMethod = 'passkey' | 'pin';
export type AuthStatus =
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'
  | 'failed';

export interface AuthState {
  method: AuthMethod | null;
  status: AuthStatus;
  isPasskeySupported: boolean;
  isPWA: boolean;
  credentialId?: string; // Store the passkey credential ID
}

export interface PinAuth {
  pin: string;
  confirmPin: string;
}

interface AuthContextType {
  authState: AuthState;
  pinAuth: PinAuth;
  sessionAuthenticated: boolean; // Add session authentication status
  createPasskey: (username: string, displayName: string) => Promise<boolean>;
  verifyPasskey: () => Promise<boolean>;
  setPinCode: (pin: string, confirmPin: string) => boolean;
  verifyPinCode: (pin: string) => boolean;
  resetAuth: () => void;
  logout: () => void;
  verifyCredentialExists: () => Promise<boolean>; // Add credential verification function
  stressTestUtils?: {
    resetToCleanState: () => void;
    corruptAuthState: () => void;
    corruptPinData: () => void;
    simulateNetworkFailure: () => void;
    testValidation: () => void;
    getDebugInfo: () => any;
  } | null;
}

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
  // Validation function for auth state
  const validateAndCorrectAuthState = (state: AuthState): AuthState => {
    console.log('🔍 validateAndCorrectAuthState called with:', state);
    let corrected = { ...state };
    let hasChanges = false;

    // Rule 1: PIN method should never have credentialId
    if (corrected.method === 'pin' && corrected.credentialId) {
      console.warn(
        '🚨 Validation: PIN method with credentialId detected, removing credentialId'
      );
      corrected.credentialId = undefined;
      hasChanges = true;
    }

    // Rule 2: Passkey method should have credentialId when authenticated
    if (
      corrected.method === 'passkey' &&
      corrected.status === 'authenticated' &&
      !corrected.credentialId
    ) {
      console.warn(
        '🚨 Validation: Authenticated passkey without credentialId, resetting to unauthenticated'
      );
      corrected.status = 'unauthenticated';
      hasChanges = true;
    }

    // Rule 3: Failed status should reset to unauthenticated (not clear method/credentialId)
    if (corrected.status === 'failed') {
      console.warn(
        '🚨 Validation: Failed status detected, resetting to unauthenticated'
      );
      corrected.status = 'unauthenticated';
      hasChanges = true;
    }

    // Rule 4: Authenticating status with null method is invalid
    if (corrected.status === 'authenticating' && corrected.method === null) {
      console.warn(
        '🚨 Validation: Authenticating status with null method detected, resetting to unauthenticated'
      );
      corrected.status = 'unauthenticated';
      corrected.method = null;
      hasChanges = true;
    }

    if (hasChanges) {
      console.log('🛠️ Auth state corrected:', {
        original: state,
        corrected: corrected,
      });
    } else {
      console.log('✅ Auth state validation passed, no changes needed');
    }

    return corrected;
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
  const setAuthState = (
    newState: AuthState | ((prev: AuthState) => AuthState)
  ) => {
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
      if (validated.status === 'unauthenticated' || validated.method === null) {
        setSessionAuthenticated(false);
      }

      setAuthStateInternal(validated);
      console.log('🛠️ Auth state after setAuthState:', validated);
    }
  };

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
      let isSupported =
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
        (window.navigator as any).standalone === true;
      console.log('🔍 PWA detection:', isPWA);

      // Additional iOS-specific checks
      let finalSupported = isSupported;
      console.log('🔍 Final supported value:', finalSupported);

      console.log('🔍 Setting auth state with passkey support...');
      setAuthState((prev) => ({
        ...prev,
        isPasskeySupported: finalSupported || false,
        isPWA,
      }));
      console.log('🔍 Auth state updated with passkey support');

      // If we have a stored credential ID, verify it still exists on the device
      if (authState.credentialId && isSupported) {
        console.log(
          '🔍 Found stored credential ID, but skipping verification during initialization to avoid NotAllowedError'
        );
        console.log(
          '🔍 Credential will be verified when user actually tries to use it'
        );

        // Don't verify credential during initialization - this causes NotAllowedError
        // Credential will be verified when user actually tries to authenticate
        // Just keep the stored state for now
      } else {
        console.log('🔍 No stored credential ID or passkey not supported');
      }
    };

    checkPasskeySupport();
  }, []); // Remove dependency on authState.credentialId to prevent infinite loop

  // Save authentication state to localStorage whenever it changes
  useEffect(() => {
    console.log('🔄 localStorage effect triggered:', {
      authState,
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
            console.log('🔐 Resetting to clean state...');
            // Reset to clean state when user cancels
            setAuthState((prev) => ({
              ...prev,
              method: null,
              status: 'unauthenticated',
              credentialId: undefined,
            }));
            console.log('🔐 State reset to clean state');
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
    []
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
  }, [authState.credentialId]);

  // Set PIN code
  const setPinCode = useCallback(
    (pin: string, confirmPin: string) => {
      console.log('🔐 setPinCode called:', {
        pinLength: pin.length,
        confirmPinLength: confirmPin.length,
      });
      console.log('🔐 PIN validation:', {
        is4Digits: pin.length === 4,
        isNumeric: /^\d{4}$/.test(pin),
        pinsMatch: pin === confirmPin,
      });

      if (pin === confirmPin && pin.length === 4 && /^\d{4}$/.test(pin)) {
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
        console.log('🔐 PIN validation failed');
        return false;
      }
    },
    [pinAuth]
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
    [pinAuth.pin]
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
  }, []);

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
  }, []);

  // Stress test utilities (development only)
  const stressTestUtils =
    process.env.NODE_ENV === 'development'
      ? {
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
    ...(stressTestUtils && { stressTestUtils }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
