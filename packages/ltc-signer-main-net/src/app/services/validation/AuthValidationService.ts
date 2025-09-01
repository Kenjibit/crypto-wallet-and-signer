/**
 * AuthValidationService - Pure validation functions for authentication state
 * Extracted from AuthContext to improve maintainability and testability
 */

import { AuthState } from '../../types/auth';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  corrected?: AuthState;
}

/**
 * Service class for authentication state validation and correction
 */
export class AuthValidationService {
  /**
   * Validates and corrects an auth state based on business rules
   * This is the main validation function that was extracted from AuthContext
   */
  static validateAndCorrectAuthState(state: AuthState): ValidationResult {
    console.log('🔍 validateAndCorrectAuthState called with:', state);
    const corrected = { ...state };
    const errors: string[] = [];
    let hasChanges = false;

    // Rule 1: PIN method should never have credentialId
    if (corrected.method === 'pin' && corrected.credentialId) {
      console.warn(
        '🚨 Validation: PIN method with credentialId detected, removing credentialId'
      );
      corrected.credentialId = undefined;
      hasChanges = true;
      errors.push('PIN method cannot have credentialId');
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
      errors.push('Authenticated passkey must have credentialId');
    }

    // Rule 3: Failed status should reset to unauthenticated (not clear method/credentialId)
    if (corrected.status === 'failed') {
      console.warn(
        '🚨 Validation: Failed status detected, resetting to unauthenticated'
      );
      corrected.status = 'unauthenticated';
      hasChanges = true;
      errors.push('Failed status is invalid');
    }

    // Rule 4: Authenticating status is allowed with null method (represents authentication in progress)
    // This is a valid intermediate state during passkey creation/verification
    if (corrected.status === 'authenticating' && corrected.method === null) {
      console.log(
        'ℹ️ Authenticating status with null method is valid (authentication in progress)'
      );
      // This is allowed - no changes needed
    }

    // Rule 5: Check for basic state consistency
    const consistencyResult = this.checkBasicConsistency(corrected);
    if (!consistencyResult.isValid) {
      errors.push(...consistencyResult.errors);
    }

    if (hasChanges) {
      console.log('🛠️ Auth state corrected:', {
        original: state,
        corrected: corrected,
      });
    } else {
      console.log('✅ Auth state validation passed, no changes needed');
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      corrected: hasChanges ? corrected : undefined,
    };
  }

  /**
   * Validates passkey creation state
   */
  static validatePasskeyCreation(state: AuthState): ValidationResult {
    const errors: string[] = [];

    if (state.method !== 'passkey') {
      errors.push('Method must be passkey');
    }

    if (state.status !== 'authenticated') {
      errors.push('Status must be authenticated');
    }

    if (!state.credentialId) {
      errors.push('Credential ID is required');
    }

    // Validate credential ID format (should be base64)
    if (state.credentialId) {
      try {
        atob(state.credentialId);
      } catch {
        errors.push('Invalid credential ID format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks basic consistency rules for auth state
   */
  private static checkBasicConsistency(state: AuthState): ValidationResult {
    const errors: string[] = [];

    // If authenticated, must have a method
    if (state.status === 'authenticated' && !state.method) {
      errors.push('Authenticated state must have a method');
    }

    // If unauthenticated, should not have method or credential
    if (state.status === 'unauthenticated') {
      if (state.method !== null) {
        errors.push('Unauthenticated state should not have a method');
      }
      if (state.credentialId) {
        errors.push('Unauthenticated state should not have credential ID');
      }
    }

    // If has credential ID, method should be passkey
    if (state.credentialId && state.method !== 'passkey') {
      errors.push('Credential ID requires passkey method');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates PIN authentication state
   */
  static validatePinAuth(pin: string, confirmPin: string): ValidationResult {
    const errors: string[] = [];

    if (!pin || pin.length !== 4) {
      errors.push('PIN must be exactly 4 digits');
    }

    if (!/^\d{4}$/.test(pin)) {
      errors.push('PIN must contain only digits');
    }

    if (pin !== confirmPin) {
      errors.push('PIN confirmation does not match');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates a complete auth state for consistency
   */
  static validateCompleteAuthState(state: AuthState): ValidationResult {
    const errors: string[] = [];

    // Basic validation
    const basicValidation = this.validateAndCorrectAuthState(state);
    errors.push(...basicValidation.errors);

    // Method-specific validation
    if (state.method === 'passkey') {
      const passkeyValidation = this.validatePasskeyCreation(state);
      errors.push(...passkeyValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
