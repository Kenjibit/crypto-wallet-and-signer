/**
 * Authentication State Validation Utilities
 * Ensures auth state integrity and consistency
 */

export interface AuthState {
  method: 'passkey' | 'pin' | null;
  status: 'authenticated' | 'unauthenticated' | 'authenticating' | 'failed';
  isPasskeySupported: boolean;
  isPWA: boolean;
  credentialId?: string;
}

/**
 * Validates that an auth state is properly authenticated
 */
export function validateAuthenticatedState(authState: AuthState): boolean {
  // Must have authenticated status
  if (authState.status !== 'authenticated') {
    console.warn(
      '🔒 Auth validation failed: status is not authenticated',
      authState.status
    );
    return false;
  }

  // Must have a valid method
  if (
    !authState.method ||
    (authState.method !== 'passkey' && authState.method !== 'pin')
  ) {
    console.warn('🔒 Auth validation failed: invalid method', authState.method);
    return false;
  }

  // If passkey method, must have credential ID
  if (authState.method === 'passkey') {
    if (!authState.credentialId || authState.credentialId.length === 0) {
      console.warn(
        '🔒 Auth validation failed: passkey method but no credential ID',
        authState.credentialId
      );
      return false;
    }
  }

  console.log('🔒 Auth state validation passed', authState);
  return true;
}

/**
 * Validates that a newly created passkey state is valid
 */
export function validatePasskeyCreation(authState: AuthState): boolean {
  if (authState.method !== 'passkey') {
    console.warn(
      '🔒 Passkey validation failed: method is not passkey',
      authState.method
    );
    return false;
  }

  if (authState.status !== 'authenticated') {
    console.warn(
      '🔒 Passkey validation failed: status is not authenticated',
      authState.status
    );
    return false;
  }

  if (!authState.credentialId) {
    console.warn(
      '🔒 Passkey validation failed: no credential ID',
      authState.credentialId
    );
    return false;
  }

  // Validate credential ID format (should be base64)
  try {
    atob(authState.credentialId);
  } catch {
    console.warn(
      '🔒 Passkey validation failed: invalid credential ID format',
      authState.credentialId
    );
    return false;
  }

  console.log('🔒 Passkey creation validation passed', authState);
  return true;
}

/**
 * Validates that a PIN auth state is valid
 */
export function validatePinAuth(authState: AuthState): boolean {
  if (authState.method !== 'pin') {
    console.warn(
      '🔒 PIN validation failed: method is not pin',
      authState.method
    );
    return false;
  }

  if (authState.status !== 'authenticated') {
    console.warn(
      '🔒 PIN validation failed: status is not authenticated',
      authState.status
    );
    return false;
  }

  console.log('🔒 PIN auth validation passed', authState);
  return true;
}

/**
 * Checks if auth state is in a consistent state (no conflicting values)
 */
export function checkAuthStateConsistency(authState: AuthState): boolean {
  // If authenticated, must have a method
  if (authState.status === 'authenticated' && !authState.method) {
    console.warn('🔒 Consistency check failed: authenticated but no method');
    return false;
  }

  // If unauthenticated, should not have method or credential
  if (authState.status === 'unauthenticated') {
    if (authState.method !== null) {
      console.warn(
        '🔒 Consistency check failed: unauthenticated but has method',
        authState.method
      );
      return false;
    }
    if (authState.credentialId) {
      console.warn(
        '🔒 Consistency check failed: unauthenticated but has credential ID'
      );
      return false;
    }
  }

  // If has credential ID, method should be passkey
  if (authState.credentialId && authState.method !== 'passkey') {
    console.warn(
      '🔒 Consistency check failed: has credential ID but method is not passkey',
      authState.method
    );
    return false;
  }

  console.log('🔒 Auth state consistency check passed');
  return true;
}

/**
 * Comprehensive auth state validation
 */
export function validateAuthState(authState: AuthState): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check basic consistency
  if (!checkAuthStateConsistency(authState)) {
    errors.push('Auth state is inconsistent');
  }

  // If claiming to be authenticated, validate it properly
  if (authState.status === 'authenticated') {
    if (!validateAuthenticatedState(authState)) {
      errors.push('Invalid authenticated state');
    }

    // Additional method-specific validation
    if (authState.method === 'passkey' && !validatePasskeyCreation(authState)) {
      errors.push('Invalid passkey state');
    }

    if (authState.method === 'pin' && !validatePinAuth(authState)) {
      errors.push('Invalid PIN state');
    }
  }

  const isValid = errors.length === 0;

  if (!isValid) {
    console.error('🔒 Auth state validation failed:', errors, authState);
  } else {
    console.log('🔒 Auth state validation complete: PASSED');
  }

  return { isValid, errors };
}
