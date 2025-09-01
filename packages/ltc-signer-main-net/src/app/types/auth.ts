/**
 * Authentication-related type definitions
 * Centralized to avoid circular dependencies
 */

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
  credentialId?: string;
}

export interface PinAuth {
  pin: string;
  confirmPin: string;
}

export interface AuthContextType {
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
  // Passkey encryption functions
  encryptWithPasskey: (data: string) => Promise<string>;
  decryptWithPasskey: (encryptedData: string) => Promise<string>;
  // PIN encryption functions
  encryptWithPin: (data: string, pin: string) => Promise<string>;
  decryptWithPin: (encryptedData: string, pin: string) => Promise<string>;
  // Unified encryption functions - auto-detect auth method
  encryptData: (data: string, pin?: string) => Promise<string>;
  decryptData: (encryptedData: string, pin?: string) => Promise<string>;
  // Test function
  testPasskeyEncryption: () => Promise<boolean>;
  stressTestUtils?: {
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
  } | null;
}
