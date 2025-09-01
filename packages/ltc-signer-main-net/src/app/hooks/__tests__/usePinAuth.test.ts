import { renderHook, act } from '@testing-library/react';
import { usePinAuth } from '../usePinAuth';
import { PinService } from '../../services/auth/PinService';
import { PinEncryptionService } from '../../services/encryption/PinEncryptionService';

// Mock the services
jest.mock('../../services/auth/PinService');
jest.mock('../../services/encryption/PinEncryptionService');
jest.mock('../../../utils/auth/authLogger', () => ({
  authLogger: {
    debug: jest.fn(),
    error: jest.fn(),
    performance: jest.fn(),
  },
}));

const mockPinService = PinService as jest.Mocked<typeof PinService>;
const mockPinEncryptionService = PinEncryptionService as jest.Mocked<
  typeof PinEncryptionService
>;

describe('usePinAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all mocks to default implementations
    mockPinService.validatePinAuth.mockReturnValue({
      isValid: true,
      errors: [],
    });

    mockPinService.verifyPinMatch.mockReturnValue(true);
    mockPinService.savePinAuth.mockImplementation(() => {});

    mockPinEncryptionService.encrypt.mockResolvedValue('encrypted-data');
    mockPinEncryptionService.decrypt.mockResolvedValue('decrypted-data');
    mockPinEncryptionService.testEncryption.mockResolvedValue(true);
  });

  describe('Initial State', () => {
    test('returns correct initial state', () => {
      const { result } = renderHook(() => usePinAuth());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.setPinCode).toBe('function');
      expect(typeof result.current.verifyPinCode).toBe('function');
      expect(typeof result.current.encryptWithPin).toBe('function');
      expect(typeof result.current.decryptWithPin).toBe('function');
      expect(typeof result.current.testPinEncryption).toBe('function');
      expect(typeof result.current.getValidationResult).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.getStoredPin).toBe('function');
    });
  });

  describe('setPinCode', () => {
    test('successfully sets PIN', () => {
      const { result } = renderHook(() => usePinAuth());

      let success = false;
      act(() => {
        success = result.current.setPinCode('1234', '1234');
      });

      expect(success).toBe(true);
      expect(mockPinService.validatePinAuth).toHaveBeenCalledWith(
        '1234',
        '1234'
      );
      expect(mockPinService.savePinAuth).toHaveBeenCalledWith({
        pin: '1234',
        confirmPin: '1234',
      });
      expect(result.current.error).toBeNull();
      expect(result.current.getStoredPin()).toBe('1234');
    });

    test('handles validation failure', () => {
      mockPinService.validatePinAuth.mockReturnValue({
        isValid: false,
        errors: ['PIN too short'],
      });

      const { result } = renderHook(() => usePinAuth());

      let success = false;
      act(() => {
        success = result.current.setPinCode('12', '12');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('PIN validation failed: PIN too short');
      expect(mockPinService.savePinAuth).not.toHaveBeenCalled();
      expect(result.current.getValidationResult()).toEqual({
        isValid: false,
        errors: ['PIN validation failed: PIN too short'],
      });
    });

    test('handles save failure', () => {
      mockPinService.savePinAuth.mockImplementation(() => {
        throw new Error('Storage failed');
      });

      const { result } = renderHook(() => usePinAuth());

      let success = false;
      act(() => {
        success = result.current.setPinCode('1234', '1234');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe(
        'PIN validation passed but failed to save'
      );
      expect(result.current.getValidationResult()).toEqual({
        isValid: false,
        errors: ['PIN validation passed but failed to save'],
      });
    });

    test('handles validation error', () => {
      mockPinService.validatePinAuth.mockImplementation(() => {
        throw new Error('Validation error');
      });

      const { result } = renderHook(() => usePinAuth());

      let success = false;
      act(() => {
        success = result.current.setPinCode('1234', '1234');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('PIN setup failed');
      expect(result.current.getValidationResult()).toEqual({
        isValid: false,
        errors: ['PIN setup failed'],
      });
    });

    test('updates validation result correctly', () => {
      const { result } = renderHook(() => usePinAuth());

      // Initially valid
      expect(result.current.getValidationResult()).toEqual({
        isValid: true,
        errors: [],
      });

      // Trigger validation failure
      mockPinService.validatePinAuth.mockReturnValue({
        isValid: false,
        errors: ['Test error'],
      });

      act(() => {
        result.current.setPinCode('invalid', 'pin');
      });

      expect(result.current.getValidationResult()).toEqual({
        isValid: false,
        errors: ['Test error'],
      });
    });
  });

  describe('verifyPinCode', () => {
    test('successfully verifies PIN', () => {
      const { result } = renderHook(() => usePinAuth());

      // Set PIN first
      act(() => {
        result.current.setPinCode('1234', '1234');
      });

      let isValid = false;
      act(() => {
        isValid = result.current.verifyPinCode('1234');
      });

      expect(isValid).toBe(true);
      expect(mockPinService.verifyPinMatch).toHaveBeenCalledWith(
        '1234',
        '1234'
      );
      expect(result.current.error).toBeNull();
    });

    test('handles PIN verification failure', () => {
      const { result } = renderHook(() => usePinAuth());

      // Set PIN first
      act(() => {
        result.current.setPinCode('1234', '1234');
      });

      // Mock verification failure
      mockPinService.verifyPinMatch.mockReturnValue(false);

      let isValid = false;
      act(() => {
        isValid = result.current.verifyPinCode('5678');
      });

      expect(isValid).toBe(false);
      expect(result.current.error).toBe('PIN verification failed');
    });

    test('handles no PIN set', () => {
      const { result } = renderHook(() => usePinAuth());

      let isValid = false;
      act(() => {
        isValid = result.current.verifyPinCode('1234');
      });

      expect(isValid).toBe(false);
      expect(result.current.error).toBe('No PIN has been set');
    });

    test('handles verification error', () => {
      const { result } = renderHook(() => usePinAuth());

      // Set PIN first
      act(() => {
        result.current.setPinCode('1234', '1234');
      });

      // Mock verification error
      mockPinService.verifyPinMatch.mockImplementation(() => {
        throw new Error('Verification error');
      });

      let isValid = false;
      act(() => {
        isValid = result.current.verifyPinCode('1234');
      });

      expect(isValid).toBe(false);
      expect(result.current.error).toBe('PIN verification failed');
    });
  });

  describe('encryptWithPin', () => {
    test('successfully encrypts data', async () => {
      const { result } = renderHook(() => usePinAuth());

      let encryptedData = '';
      await act(async () => {
        encryptedData = await result.current.encryptWithPin(
          'test data',
          '1234'
        );
      });

      expect(encryptedData).toBe('encrypted-data');
      expect(mockPinEncryptionService.encrypt).toHaveBeenCalledWith(
        'test data',
        '1234'
      );
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('validates required data parameter', async () => {
      const { result } = renderHook(() => usePinAuth());

      await expect(result.current.encryptWithPin('', '1234')).rejects.toThrow(
        'Data to encrypt is required'
      );
    });

    test('validates required PIN parameter', async () => {
      const { result } = renderHook(() => usePinAuth());

      await expect(
        result.current.encryptWithPin('test data', '')
      ).rejects.toThrow('PIN is required for encryption');
    });

    test('handles encryption error', async () => {
      mockPinEncryptionService.encrypt.mockRejectedValue(
        new Error('Encryption failed')
      );

      const { result } = renderHook(() => usePinAuth());

      await expect(
        result.current.encryptWithPin('test data', '1234')
      ).rejects.toThrow('Encryption failed');
      expect(result.current.error).toBe('PIN encryption failed');
    });

    test('sets loading state correctly', async () => {
      let resolvePromise: (value: string) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockPinEncryptionService.encrypt.mockReturnValue(promise);

      const { result } = renderHook(() => usePinAuth());

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.encryptWithPin('test data', '1234');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise('encrypted-data');
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('decryptWithPin', () => {
    test('successfully decrypts data', async () => {
      const { result } = renderHook(() => usePinAuth());

      let decryptedData = '';
      await act(async () => {
        decryptedData = await result.current.decryptWithPin(
          'encrypted-data',
          '1234'
        );
      });

      expect(decryptedData).toBe('decrypted-data');
      expect(mockPinEncryptionService.decrypt).toHaveBeenCalledWith(
        'encrypted-data',
        '1234'
      );
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('validates required encryptedData parameter', async () => {
      const { result } = renderHook(() => usePinAuth());

      await expect(result.current.decryptWithPin('', '1234')).rejects.toThrow(
        'Encrypted data is required'
      );
    });

    test('validates required PIN parameter', async () => {
      const { result } = renderHook(() => usePinAuth());

      await expect(
        result.current.decryptWithPin('encrypted-data', '')
      ).rejects.toThrow('PIN is required for decryption');
    });

    test('handles decryption error', async () => {
      mockPinEncryptionService.decrypt.mockRejectedValue(
        new Error('Decryption failed')
      );

      const { result } = renderHook(() => usePinAuth());

      await expect(
        result.current.decryptWithPin('encrypted-data', '1234')
      ).rejects.toThrow('Decryption failed');
      expect(result.current.error).toBe('PIN decryption failed');
    });
  });

  describe('testPinEncryption', () => {
    test('successfully tests encryption', async () => {
      const { result } = renderHook(() => usePinAuth());

      let success = false;
      await act(async () => {
        success = await result.current.testPinEncryption('test data', '1234');
      });

      expect(success).toBe(true);
      expect(mockPinEncryptionService.testEncryption).toHaveBeenCalledWith(
        'test data',
        '1234'
      );
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('handles test failure', async () => {
      mockPinEncryptionService.testEncryption.mockResolvedValue(false);

      const { result } = renderHook(() => usePinAuth());

      let success = false;
      await act(async () => {
        success = await result.current.testPinEncryption('test data', '1234');
      });

      expect(success).toBe(false);
    });

    test('handles test error', async () => {
      mockPinEncryptionService.testEncryption.mockRejectedValue(
        new Error('Test failed')
      );

      const { result } = renderHook(() => usePinAuth());

      let success = false;
      await act(async () => {
        success = await result.current.testPinEncryption('test data', '1234');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('PIN encryption test failed');
    });

    test('validates required parameters', async () => {
      const { result } = renderHook(() => usePinAuth());

      let success = false;
      await act(async () => {
        success = await result.current.testPinEncryption('', '1234');
      });

      expect(success).toBe(false);
      expect(mockPinEncryptionService.testEncryption).not.toHaveBeenCalled();
    });
  });

  describe('getStoredPin', () => {
    test('returns stored PIN', () => {
      const { result } = renderHook(() => usePinAuth());

      expect(result.current.getStoredPin()).toBe('');

      act(() => {
        result.current.setPinCode('1234', '1234');
      });

      expect(result.current.getStoredPin()).toBe('1234');
    });
  });

  describe('clearError', () => {
    test('clears error state', () => {
      mockPinService.validatePinAuth.mockReturnValue({
        isValid: false,
        errors: ['Test error'],
      });

      const { result } = renderHook(() => usePinAuth());

      // Trigger an error
      act(() => {
        result.current.setPinCode('invalid', 'pin');
      });

      expect(result.current.error).toBe('PIN validation failed: Test error');

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Air-gapped Compatibility', () => {
    test('works without localStorage', () => {
      // Mock localStorage as unavailable
      const originalLocalStorage = global.localStorage;
      delete (global as unknown as Record<string, unknown>).localStorage;

      const { result } = renderHook(() => usePinAuth());

      // Should not crash and should handle gracefully
      expect(result.current).toBeDefined();
      expect(typeof result.current.setPinCode).toBe('function');

      // Restore localStorage
      global.localStorage = originalLocalStorage;
    });

    test('handles localStorage errors gracefully', () => {
      mockPinService.savePinAuth.mockImplementation(() => {
        throw new Error('localStorage quota exceeded');
      });

      const { result } = renderHook(() => usePinAuth());

      let success = false;
      act(() => {
        success = result.current.setPinCode('1234', '1234');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe(
        'PIN validation passed but failed to save'
      );
    });
  });

  describe('Validation Edge Cases', () => {
    test('handles empty PIN inputs', () => {
      mockPinService.validatePinAuth.mockReturnValue({
        isValid: false,
        errors: ['PIN cannot be empty'],
      });

      const { result } = renderHook(() => usePinAuth());

      let success = false;
      act(() => {
        success = result.current.setPinCode('', '');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe(
        'PIN validation failed: PIN cannot be empty'
      );
    });

    test('handles weak PIN patterns', () => {
      mockPinService.validatePinAuth.mockReturnValue({
        isValid: false,
        errors: ['PIN cannot be all the same digit'],
      });

      const { result } = renderHook(() => usePinAuth());

      let success = false;
      act(() => {
        success = result.current.setPinCode('1111', '1111');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe(
        'PIN validation failed: PIN cannot be all the same digit'
      );
    });
  });
});
