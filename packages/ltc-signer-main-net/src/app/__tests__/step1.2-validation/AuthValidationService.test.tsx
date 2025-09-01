/**
 * Step 1.2 Validation Tests: AuthValidationService
 *
 * Tests for the extracted AuthValidationService functionality
 */

import { AuthValidationService } from '../../services/validation/AuthValidationService';
import type { AuthState } from '../../types/auth';

import { vi } from 'vitest';
describe('AuthValidationService', () => {
  describe('validateAndCorrectAuthState', () => {
    test('should pass valid auth state without changes', () => {
      const validState: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'valid-credential-id',
      };

      const result =
        AuthValidationService.validateAndCorrectAuthState(validState);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.corrected).toBeUndefined();
    });

    test('should correct PIN method with credentialId', () => {
      const invalidState: AuthState = {
        method: 'pin',
        status: 'authenticated',
        isPasskeySupported: false,
        isPWA: false,
        credentialId: 'should-be-removed',
      };

      const result =
        AuthValidationService.validateAndCorrectAuthState(invalidState);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PIN method cannot have credentialId');
      expect(result.corrected?.credentialId).toBeUndefined();
    });

    test('should correct authenticated passkey without credentialId', () => {
      const invalidState: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: undefined,
      };

      const result =
        AuthValidationService.validateAndCorrectAuthState(invalidState);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Authenticated passkey must have credentialId'
      );
      expect(result.corrected?.status).toBe('unauthenticated');
    });

    test('should correct failed status to unauthenticated', () => {
      const invalidState: AuthState = {
        method: 'passkey',
        status: 'failed',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'some-credential',
      };

      const result =
        AuthValidationService.validateAndCorrectAuthState(invalidState);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Failed status is invalid');
      expect(result.corrected?.status).toBe('unauthenticated');
    });

    test('should correct authenticating status with null method', () => {
      const invalidState: AuthState = {
        method: null,
        status: 'authenticating',
        isPasskeySupported: false,
        isPWA: false,
      };

      const result =
        AuthValidationService.validateAndCorrectAuthState(invalidState);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Authenticating status requires a method'
      );
      expect(result.corrected?.status).toBe('unauthenticated');
      expect(result.corrected?.method).toBeNull();
    });
  });

  describe('validatePasskeyCreation', () => {
    test('should validate correct passkey state', () => {
      const validState: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'valid-credential-id',
      };

      const result = AuthValidationService.validatePasskeyCreation(validState);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject non-passkey method', () => {
      const invalidState: AuthState = {
        method: 'pin',
        status: 'authenticated',
        isPasskeySupported: false,
        isPWA: false,
        credentialId: 'some-credential',
      };

      const result =
        AuthValidationService.validatePasskeyCreation(invalidState);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Method must be passkey');
    });

    test('should reject unauthenticated status', () => {
      const invalidState: AuthState = {
        method: 'passkey',
        status: 'unauthenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'some-credential',
      };

      const result =
        AuthValidationService.validatePasskeyCreation(invalidState);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Status must be authenticated');
    });

    test('should reject missing credential ID', () => {
      const invalidState: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: undefined,
      };

      const result =
        AuthValidationService.validatePasskeyCreation(invalidState);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Credential ID is required');
    });

    test('should reject invalid credential ID format', () => {
      const invalidState: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'invalid-base64-format!!!',
      };

      // Mock atob to throw an error for invalid base64
      const originalAtob = global.atob;
      global.atob = vi.fn(() => {
        throw new Error('Invalid base64');
      });

      const result =
        AuthValidationService.validatePasskeyCreation(invalidState);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid credential ID format');

      // Restore original atob
      global.atob = originalAtob;
    });
  });

  describe('validatePinAuth', () => {
    test('should validate correct PIN format', () => {
      const result = AuthValidationService.validatePinAuth('1234', '1234');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject PIN too short', () => {
      const result = AuthValidationService.validatePinAuth('123', '123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PIN must be exactly 4 digits');
    });

    test('should reject PIN too long', () => {
      const result = AuthValidationService.validatePinAuth('12345', '12345');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PIN must be exactly 4 digits');
    });

    test('should reject non-numeric PIN', () => {
      const result = AuthValidationService.validatePinAuth('abcd', 'abcd');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PIN must contain only digits');
    });

    test('should reject non-matching confirmation', () => {
      const result = AuthValidationService.validatePinAuth('1234', '5678');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PIN confirmation does not match');
    });

    test('should handle multiple validation errors', () => {
      const result = AuthValidationService.validatePinAuth('abc', 'def');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PIN must be exactly 4 digits');
      expect(result.errors).toContain('PIN must contain only digits');
      expect(result.errors).toContain('PIN confirmation does not match');
    });
  });

  describe('validateCompleteAuthState', () => {
    test('should validate complete valid state', () => {
      const validState: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'valid-credential-id',
      };

      const result =
        AuthValidationService.validateCompleteAuthState(validState);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should accumulate all validation errors', () => {
      const invalidState: AuthState = {
        method: 'pin',
        status: 'authenticated',
        isPasskeySupported: false,
        isPWA: false,
        credentialId: 'should-not-have-this',
      };

      const result =
        AuthValidationService.validateCompleteAuthState(invalidState);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('Basic consistency checks', () => {
    test('should detect authenticated state without method', () => {
      const invalidState: AuthState = {
        method: null,
        status: 'authenticated',
        isPasskeySupported: false,
        isPWA: false,
      };

      const result =
        AuthValidationService.validateAndCorrectAuthState(invalidState);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Authenticated state must have a method');
    });

    test('should detect unauthenticated state with method', () => {
      const invalidState: AuthState = {
        method: 'passkey',
        status: 'unauthenticated',
        isPasskeySupported: true,
        isPWA: false,
      };

      const result =
        AuthValidationService.validateAndCorrectAuthState(invalidState);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Unauthenticated state should not have a method'
      );
    });

    test('should detect credential ID without passkey method', () => {
      const invalidState: AuthState = {
        method: 'pin',
        status: 'authenticated',
        isPasskeySupported: false,
        isPWA: false,
        credentialId: 'invalid-for-pin',
      };

      const result =
        AuthValidationService.validateAndCorrectAuthState(invalidState);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Credential ID requires passkey method');
      expect(result.corrected?.credentialId).toBeUndefined();
    });
  });
});
