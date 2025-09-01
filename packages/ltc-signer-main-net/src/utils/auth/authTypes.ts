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
