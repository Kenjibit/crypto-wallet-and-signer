import type {
  AuthState,
  AuthMethod,
  AuthStatus,
  PinAuth,
} from '../../app/types/auth';

export interface StressTestUtils {
  resetToCleanState: () => void;
  corruptAuthState: () => void;
  corruptPinData: () => void;
  simulateNetworkFailure: () => void;
  testValidation: () => void;
  getDebugInfo: () => {
    authState: AuthState;
    pinAuth: PinAuth;
    sessionAuthenticated: boolean;
    localStorage: {
      auth: string | null;
      pin: string | null;
    };
    validationRules: {
      'PIN method with credentialId': string;
      'Authenticated passkey without credentialId': string;
      'Failed status': string;
      'Session authentication': string;
    };
  };
  testCredentialVerification: () => Promise<boolean>;
}

export const createStressTestUtils = (
  authState: AuthState,
  pinAuth: PinAuth,
  sessionAuthenticated: boolean,
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>,
  setPinAuth: React.Dispatch<React.SetStateAction<PinAuth>>,
  setSessionAuthenticated: React.Dispatch<React.SetStateAction<boolean>>
): StressTestUtils => ({
  // Reset to clean state before testing
  resetToCleanState: () => {
    console.warn('🧪 STRESS TEST: Resetting to clean state');
    setAuthState({
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
    console.warn('🧪 STRESS TEST: Corrupting PIN data');
    setPinAuth({ pin: 'corrupted', confirmPin: 'corrupted' });
  },

  // Simulate network failure
  simulateNetworkFailure: () => {
    console.warn('🧪 STRESS TEST: Simulating network failure');
    setAuthState((prev) => ({ ...prev, status: 'failed' }));
  },

  // Test validation by setting invalid state through normal setter
  testValidation: () => {
    console.warn('🧪 STRESS TEST: Testing validation with invalid state');
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
        'Failed status': authState.status === 'failed' ? 'INVALID' : 'OK',
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
});
