import {
  AuthValidationService,
  ValidationResult,
} from '../AuthValidationService';
import { AuthState } from '../../../types/auth';

// Mock console methods to avoid cluttering test output
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
};
global.console.log = mockConsole.log;
global.console.warn = mockConsole.warn;

describe('AuthValidationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAndCorrectAuthState', () => {
    test('allows authenticating status with null method (authentication in progress)', () => {
      const state: AuthState = {
        method: null,
        status: 'authenticating',
        isPasskeySupported: true,
        isPWA: false,
      };

      const result: ValidationResult =
        AuthValidationService.validateAndCorrectAuthState(state);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.corrected).toBeUndefined(); // No changes needed
      expect(mockConsole.log).toHaveBeenCalledWith(
        'ℹ️ Authenticating status with null method is valid (authentication in progress)'
      );
    });

    test('allows authenticating status with passkey method', () => {
      const state: AuthState = {
        method: 'passkey',
        status: 'authenticating',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'test-credential-id',
      };

      const result: ValidationResult =
        AuthValidationService.validateAndCorrectAuthState(state);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.corrected).toBeUndefined();
    });

    test('corrects PIN method with credentialId', () => {
      const state: AuthState = {
        method: 'pin',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'should-be-removed',
      };

      const result: ValidationResult =
        AuthValidationService.validateAndCorrectAuthState(state);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PIN method cannot have credentialId');
      expect(result.corrected).toEqual({
        ...state,
        credentialId: undefined,
      });
      expect(mockConsole.warn).toHaveBeenCalledWith(
        '🚨 Validation: PIN method with credentialId detected, removing credentialId'
      );
    });

    test('corrects passkey authenticated without credentialId', () => {
      const state: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: undefined,
      };

      const result: ValidationResult =
        AuthValidationService.validateAndCorrectAuthState(state);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Authenticated passkey must have credentialId'
      );
      expect(result.corrected).toEqual({
        ...state,
        status: 'unauthenticated',
      });
      expect(mockConsole.warn).toHaveBeenCalledWith(
        '🚨 Validation: Authenticated passkey without credentialId, resetting to unauthenticated'
      );
    });

    test('corrects failed status', () => {
      const state: AuthState = {
        method: 'passkey',
        status: 'failed',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'test-credential-id',
      };

      const result: ValidationResult =
        AuthValidationService.validateAndCorrectAuthState(state);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Failed status is invalid');
      expect(result.corrected).toEqual({
        ...state,
        status: 'unauthenticated',
      });
      expect(mockConsole.warn).toHaveBeenCalledWith(
        '🚨 Validation: Failed status detected, resetting to unauthenticated'
      );
    });

    test('validates correct authenticated passkey state', () => {
      const state: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'test-credential-id',
      };

      const result: ValidationResult =
        AuthValidationService.validateAndCorrectAuthState(state);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.corrected).toBeUndefined();
      expect(mockConsole.log).toHaveBeenCalledWith(
        '✅ Auth state validation passed, no changes needed'
      );
    });

    test('validates unauthenticated state', () => {
      const state: AuthState = {
        method: null,
        status: 'unauthenticated',
        isPasskeySupported: true,
        isPWA: false,
      };

      const result: ValidationResult =
        AuthValidationService.validateAndCorrectAuthState(state);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.corrected).toBeUndefined();
    });
  });

  describe('validatePasskeyCreation', () => {
    test('validates correct passkey creation state', () => {
      const state: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'valid-base64-credential-id',
      };

      const result: ValidationResult =
        AuthValidationService.validatePasskeyCreation(state);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects passkey creation with wrong method', () => {
      const state: AuthState = {
        method: 'pin',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'test-credential-id',
      };

      const result: ValidationResult =
        AuthValidationService.validatePasskeyCreation(state);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Method must be passkey');
    });

    test('rejects passkey creation with wrong status', () => {
      const state: AuthState = {
        method: 'passkey',
        status: 'unauthenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'test-credential-id',
      };

      const result: ValidationResult =
        AuthValidationService.validatePasskeyCreation(state);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Status must be authenticated');
    });

    test('rejects passkey creation without credentialId', () => {
      const state: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
      };

      const result: ValidationResult =
        AuthValidationService.validatePasskeyCreation(state);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Credential ID is required');
    });

    test('rejects passkey creation with invalid credentialId format', () => {
      const state: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'invalid-base64!',
      };

      const result: ValidationResult =
        AuthValidationService.validatePasskeyCreation(state);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid credential ID format');
    });
  });

  describe('validatePinAuth', () => {
    test('validates correct PIN authentication', () => {
      const result: ValidationResult = AuthValidationService.validatePinAuth(
        '1234',
        '1234'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects PIN with wrong length', () => {
      const result: ValidationResult = AuthValidationService.validatePinAuth(
        '123',
        '123'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PIN must be exactly 4 digits');
    });

    test('rejects PIN with non-digits', () => {
      const result: ValidationResult = AuthValidationService.validatePinAuth(
        '12a4',
        '12a4'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PIN must contain only digits');
    });

    test('rejects PIN confirmation mismatch', () => {
      const result: ValidationResult = AuthValidationService.validatePinAuth(
        '1234',
        '5678'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PIN confirmation does not match');
    });

    test('handles multiple validation errors', () => {
      const result: ValidationResult = AuthValidationService.validatePinAuth(
        'abc',
        'def'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PIN must be exactly 4 digits');
      expect(result.errors).toContain('PIN must contain only digits');
      expect(result.errors).toContain('PIN confirmation does not match');
    });
  });

  describe('validateCompleteAuthState', () => {
    test('validates complete correct passkey state', () => {
      const state: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'valid-base64-credential-id',
      };

      const result: ValidationResult =
        AuthValidationService.validateCompleteAuthState(state);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validates complete correct PIN state', () => {
      const state: AuthState = {
        method: 'pin',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
      };

      const result: ValidationResult =
        AuthValidationService.validateCompleteAuthState(state);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('accumulates all validation errors', () => {
      const state: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: undefined, // Missing credential ID
      };

      const result: ValidationResult =
        AuthValidationService.validateCompleteAuthState(state);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
