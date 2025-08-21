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
    }

    return corrected;
  };

  // Add session authentication tracking
  const [sessionAuthenticated, setSessionAuthenticated] = useState(false);

  const [authState, setAuthStateInternal] = useState<AuthState>(() => {
    // Try to restore authentication state from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ltc-signer-auth');
        if (saved) {
          const parsed = JSON.parse(saved);
          const restored = {
            method: parsed.method || null,
            status: parsed.status || 'unauthenticated',
            isPasskeySupported: false, // Will be updated by useEffect
            isPWA: false, // Will be updated by useEffect
            credentialId: parsed.credentialId,
          };
          // Validate restored state
          return validateAndCorrectAuthState(restored);
        }
      } catch (error) {
        console.error('Failed to restore auth state:', error);
      }
    }

    return {
      method: null,
      status: 'unauthenticated',
      isPasskeySupported: false,
      isPWA: false,
    };
  });

  // Validated wrapper for setAuthState
  const setAuthState = (
    newState: AuthState | ((prev: AuthState) => AuthState)
  ) => {
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

        return validated;
      });
    } else {
      const validated = validateAndCorrectAuthState(newState);

      // Reset session authentication if auth state becomes invalid
      if (validated.status === 'unauthenticated' || validated.method === null) {
        setSessionAuthenticated(false);
      }

      setAuthStateInternal(validated);
    }
  };

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
    const checkPasskeySupport = async () => {
      // Check basic WebAuthn support
      const hasWebAuthn =
        typeof window !== 'undefined' && window.PublicKeyCredential;

      // Check platform authenticator support (this is what iOS 16+ provides)
      const hasPlatformAuthenticator =
        hasWebAuthn &&
        typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
          'function';

      // Check conditional mediation (iOS 16.1+ feature)
      const hasConditionalMediation =
        hasWebAuthn &&
        typeof PublicKeyCredential.isConditionalMediationAvailable ===
          'function';

      // Detect iOS specifically with more comprehensive patterns
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isIOS16Plus =
        isIOS && /OS 1[6-9]|OS [2-9][0-9]/.test(navigator.userAgent);
      const isIOS18Plus =
        isIOS && /OS 1[8-9]|OS [2-9][0-9]/.test(navigator.userAgent);

      // Check if actually available (not just API presence)
      let platformAuthenticatorAvailable = false;
      if (hasPlatformAuthenticator) {
        try {
          platformAuthenticatorAvailable =
            await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        } catch (error) {
          console.warn(
            'Failed to check platform authenticator availability:',
            error
          );
          platformAuthenticatorAvailable = false;
        }
      }

      // iOS 16+ supports passkeys with platform authenticator
      // Also check actual availability, not just API presence
      let isSupported =
        hasPlatformAuthenticator && platformAuthenticatorAvailable;

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

      // Additional iOS-specific checks
      let finalSupported = isSupported;

      setAuthState((prev) => ({
        ...prev,
        isPasskeySupported: finalSupported || false,
        isPWA,
      }));

      // If we have a stored credential ID, verify it still exists on the device
      if (authState.credentialId && isSupported) {
        try {
          const existingCredential = await navigator.credentials.get({
            publicKey: {
              challenge: new Uint8Array(32),
              rpId: window.location.hostname,
              userVerification: 'discouraged',
              allowCredentials: [
                {
                  id: Uint8Array.from(atob(authState.credentialId), (c) =>
                    c.charCodeAt(0)
                  ),
                  type: 'public-key',
                },
              ],
            },
            mediation: 'silent',
          });

          if (existingCredential) {
            // Credential still exists, keep user authenticated
            setAuthState((prev) => ({
              ...prev,
              status: 'authenticated',
              method: 'passkey',
            }));
          } else {
            // Credential no longer exists, clear it
            setAuthState((prev) => ({
              ...prev,
              status: 'unauthenticated',
              method: null,
              credentialId: undefined,
            }));
            localStorage.removeItem('ltc-signer-auth');
          }
        } catch (error) {
          // Credential verification failed, clear it
          setAuthState((prev) => ({
            ...prev,
            status: 'unauthenticated',
            method: null,
            credentialId: undefined,
          }));
          localStorage.removeItem('ltc-signer-auth');
        }
      }
    };

    checkPasskeySupport();
  }, []); // Remove dependency on authState.credentialId to prevent infinite loop

  // Save authentication state to localStorage whenever it changes
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      authState.status !== 'unauthenticated' &&
      authState.method !== null // Only save if method is selected
    ) {
      try {
        localStorage.setItem(
          'ltc-signer-auth',
          JSON.stringify({
            method: authState.method,
            status: authState.status,
            credentialId: authState.credentialId,
          })
        );
      } catch (error) {
        console.error('Failed to save auth state:', error);
      }
    } else if (
      typeof window !== 'undefined' &&
      (authState.status === 'unauthenticated' || authState.method === null)
    ) {
      // Clear localStorage when state is invalid or unauthenticated
      try {
        localStorage.removeItem('ltc-signer-auth');
      } catch (error) {
        console.error('Failed to clear auth state:', error);
      }
    }
  }, [authState.method, authState.status, authState.credentialId]);

  // Create passkey
  const createPasskey = useCallback(
    async (username: string, displayName: string) => {
      try {
        setAuthState((prev) => ({ ...prev, status: 'authenticating' }));

        // Generate a random challenge
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);

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

        if (credential && 'rawId' in credential) {
          // Store the credential ID for future reference
          const publicKeyCredential = credential as PublicKeyCredential;
          const credentialId = btoa(
            String.fromCharCode(...new Uint8Array(publicKeyCredential.rawId))
          );

          // Validate that the credential is properly formed
          if (!credentialId || credentialId.length === 0) {
            console.error('Invalid credential ID generated');
            setAuthState((prev) => ({ ...prev, status: 'failed' }));
            return false;
          }

          const newState = {
            ...authState,
            method: 'passkey' as AuthMethod,
            status: 'authenticated' as AuthStatus,
            credentialId,
          };

          // Validate the new state before setting it
          const validation = validateAuthState(newState);
          if (!validation.isValid) {
            console.error(
              'Auth state validation failed before setting:',
              validation.errors
            );
            setAuthState((prev) => ({ ...prev, status: 'failed' }));
            return false;
          }

          setAuthState(newState);

          // Additional validation: Ensure state was actually set correctly
          setTimeout(() => {
            const postValidation = validatePasskeyCreation(newState);
            if (!postValidation) {
              console.error('🔐 Post-creation validation failed');
            }
          }, 50);

          return true;
        } else {
          console.log('🔐 No credential or rawId, passkey creation failed');
        }
      } catch (error) {
        console.error('🔐 Passkey creation failed:', error);

        // Handle different types of errors properly
        if (error instanceof Error) {
          // Check if this is a user cancellation
          if (
            error.name === 'NotAllowedError' ||
            error.message.includes('User cancelled') ||
            error.message.includes('aborted')
          ) {
            console.log('🔐 Passkey creation cancelled by user');
            // Reset to clean state when user cancels
            setAuthState((prev) => ({
              ...prev,
              method: null,
              status: 'unauthenticated',
              credentialId: undefined,
            }));
          } else {
            // Other errors - set to failed state
            setAuthState((prev) => ({ ...prev, status: 'failed' }));
          }
        } else {
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
    try {
      setAuthState((prev) => ({ ...prev, status: 'authenticating' }));

      // Generate a random challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Get passkey - use existing credential if available
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60000,
          // If we have a stored credential ID, use it to find the specific credential
          ...(authState.credentialId && {
            allowCredentials: [
              {
                id: Uint8Array.from(atob(authState.credentialId), (c) =>
                  c.charCodeAt(0)
                ),
                type: 'public-key',
              },
            ],
          }),
        },
        mediation: 'conditional',
      });

      if (assertion) {
        setAuthState((prev) => ({ ...prev, status: 'authenticated' }));
        setSessionAuthenticated(true); // Mark as authenticated in this session
        return true;
      }
    } catch (error) {
      console.error('Passkey verification failed:', error);
      setAuthState((prev) => ({ ...prev, status: 'failed' }));
    }
    return false;
  }, [authState.credentialId]);

  // Set PIN code
  const setPinCode = useCallback(
    (pin: string, confirmPin: string) => {
      if (pin === confirmPin && pin.length === 4 && /^\d{4}$/.test(pin)) {
        setAuthState((prev) => ({
          ...prev,
          method: 'pin',
          status: 'authenticated',
        }));
        const newPinAuth = { pin, confirmPin };
        setPinAuth(newPinAuth);

        // Save PIN to localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('ltc-signer-pin', JSON.stringify(newPinAuth));
          } catch (error) {
            console.error('Failed to save PIN to localStorage:', error);
          }
        }

        return true;
      } else {
        return false;
      }
    },
    [pinAuth]
  );

  // Verify PIN code
  const verifyPinCode = useCallback(
    (pin: string) => {
      if (pin === pinAuth.pin) {
        setAuthState((prev) => ({ ...prev, status: 'authenticated' }));
        setSessionAuthenticated(true); // Mark as authenticated in this session
        return true;
      } else {
        setAuthState((prev) => ({ ...prev, status: 'failed' }));
        return false;
      }
    },
    [pinAuth.pin]
  );

  // Reset authentication
  const resetAuth = useCallback(() => {
    setAuthState((prev) => ({
      ...prev,
      method: null,
      status: 'unauthenticated',
      credentialId: undefined,
    }));
    setPinAuth({ pin: '', confirmPin: '' });
    setSessionAuthenticated(false); // Reset session authentication

    // Clear from localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('ltc-signer-auth');
        localStorage.removeItem('ltc-signer-pin');
      } catch (error) {
        console.error('Failed to clear auth state:', error);
      }
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    setAuthState((prev) => ({
      ...prev,
      status: 'unauthenticated',
      method: null,
      credentialId: undefined,
    }));
    setPinAuth({ pin: '', confirmPin: '' });
    setSessionAuthenticated(false); // Reset session authentication

    // Clear from localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('ltc-signer-auth');
        localStorage.removeItem('ltc-signer-pin');
      } catch (error) {
        console.error('Failed to clear auth state:', error);
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
    ...(stressTestUtils && { stressTestUtils }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
