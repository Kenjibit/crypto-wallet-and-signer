import { renderHook } from '@testing-library/react';
import { useEncryption } from '../useEncryption';
import { PasskeyEncryptionService } from '../../services/encryption/PasskeyEncryptionService';
import { PinEncryptionService } from '../../services/encryption/PinEncryptionService';
import { authLogger } from '../../../utils/auth/authLogger';

// Mock the services
jest.mock('../../services/encryption/PasskeyEncryptionService');
jest.mock('../../services/encryption/PinEncryptionService');
jest.mock('../../../utils/auth/authLogger');

// Mock the useAuthState hook
jest.mock('../useAuthState', () => ({
  useAuthState: jest.fn(),
}));

// Mock crypto API
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: jest.fn(),
    subtle: {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      importKey: jest.fn(),
      deriveKey: jest.fn(),
      digest: jest.fn(),
    },
  },
});

import { useAuthState } from '../useAuthState';

const mockUseAuthState = useAuthState as jest.MockedFunction<
  typeof useAuthState
>;
const mockPasskeyEncryptionService =
  PasskeyEncryptionService as jest.MockedClass<typeof PasskeyEncryptionService>;
const mockPinEncryptionService = PinEncryptionService as jest.MockedClass<
  typeof PinEncryptionService
>;
const mockAuthLogger = authLogger as jest.Mocked<typeof authLogger>;

describe('useEncryption Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default auth state (unauthenticated)
    mockUseAuthState.mockReturnValue({
      authState: {
        method: null,
        status: 'unauthenticated',
        isPasskeySupported: true,
        isPWA: false,
      },
      setAuthState: jest.fn(),
    });

    // Setup default service mocks
    mockPasskeyEncryptionService.encrypt.mockResolvedValue(
      'encrypted-passkey-data'
    );
    mockPasskeyEncryptionService.decrypt.mockResolvedValue(
      'decrypted-passkey-data'
    );
    mockPasskeyEncryptionService.testEncryption.mockResolvedValue(true);

    mockPinEncryptionService.encrypt.mockResolvedValue('encrypted-pin-data');
    mockPinEncryptionService.decrypt.mockResolvedValue('decrypted-pin-data');
    mockPinEncryptionService.testEncryption.mockResolvedValue(true);
    mockPinEncryptionService.validateEncryptedData.mockReturnValue(true);
    mockPinEncryptionService.getEncryptedDataInfo.mockReturnValue({
      version: 1,
      algorithm: 'pin-aes-gcm',
      timestamp: Date.now(),
      dataSize: 100,
    });

    mockAuthLogger.debug.mockImplementation(() => {});
    mockAuthLogger.error.mockImplementation(() => {});
    mockAuthLogger.performance.mockImplementation(() => {});
  });

  describe('Hook Interface', () => {
    test('returns all expected methods', () => {
      const { result } = renderHook(() => useEncryption());

      expect(result.current).toHaveProperty('encryptData');
      expect(result.current).toHaveProperty('decryptData');
      expect(result.current).toHaveProperty('testEncryption');
      expect(result.current).toHaveProperty('encryptWithPasskey');
      expect(result.current).toHaveProperty('decryptWithPasskey');
      expect(result.current).toHaveProperty('testPasskeyEncryption');
      expect(result.current).toHaveProperty('encryptWithPin');
      expect(result.current).toHaveProperty('decryptWithPin');
      expect(result.current).toHaveProperty('validateEncryptedData');
      expect(result.current).toHaveProperty('getEncryptedDataInfo');
    });

    test('methods are functions', () => {
      const { result } = renderHook(() => useEncryption());

      expect(typeof result.current.encryptData).toBe('function');
      expect(typeof result.current.decryptData).toBe('function');
      expect(typeof result.current.testEncryption).toBe('function');
      expect(typeof result.current.encryptWithPasskey).toBe('function');
      expect(typeof result.current.decryptWithPasskey).toBe('function');
      expect(typeof result.current.testPasskeyEncryption).toBe('function');
      expect(typeof result.current.encryptWithPin).toBe('function');
      expect(typeof result.current.decryptWithPin).toBe('function');
      expect(typeof result.current.validateEncryptedData).toBe('function');
      expect(typeof result.current.getEncryptedDataInfo).toBe('function');
    });
  });

  describe('encryptData', () => {
    test('encrypts with passkey when authenticated with passkey', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
          credentialId: 'test-credential-id',
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      const encryptedData = await result.current.encryptData('test data');

      expect(mockPasskeyEncryptionService.encrypt).toHaveBeenCalledWith(
        'test data',
        'test-credential-id'
      );
      expect(encryptedData).toBe('encrypted-passkey-data');
    });

    test('encrypts with PIN when authenticated with PIN', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'pin',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      const encryptedData = await result.current.encryptData(
        'test data',
        '1234'
      );

      expect(mockPinEncryptionService.encrypt).toHaveBeenCalledWith(
        'test data',
        '1234'
      );
      expect(encryptedData).toBe('encrypted-pin-data');
    });

    test('throws error when no valid encryption method available', async () => {
      const { result } = renderHook(() => useEncryption());

      await expect(result.current.encryptData('test data')).rejects.toThrow(
        'No valid encryption method available'
      );
    });

    test('throws error when no data provided', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
          credentialId: 'test-credential-id',
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      await expect(result.current.encryptData('')).rejects.toThrow(
        'No data provided for encryption'
      );
    });

    test('logs performance metrics', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
          credentialId: 'test-credential-id',
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      await result.current.encryptData('test data');

      expect(mockAuthLogger.performance).toHaveBeenCalledWith(
        'encryptData',
        expect.any(Number)
      );
    });
  });

  describe('decryptData', () => {
    test('decrypts with passkey when authenticated with passkey', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
          credentialId: 'test-credential-id',
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      const decryptedData = await result.current.decryptData('encrypted-data');

      expect(mockPasskeyEncryptionService.decrypt).toHaveBeenCalledWith(
        'encrypted-data',
        'test-credential-id'
      );
      expect(decryptedData).toBe('decrypted-passkey-data');
    });

    test('decrypts with PIN when authenticated with PIN', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'pin',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      const decryptedData = await result.current.decryptData(
        'encrypted-data',
        '1234'
      );

      expect(mockPinEncryptionService.decrypt).toHaveBeenCalledWith(
        'encrypted-data',
        '1234'
      );
      expect(decryptedData).toBe('decrypted-pin-data');
    });

    test('throws error when no valid decryption method available', async () => {
      const { result } = renderHook(() => useEncryption());

      await expect(
        result.current.decryptData('encrypted-data')
      ).rejects.toThrow('No valid decryption method available');
    });

    test('throws error when no encrypted data provided', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
          credentialId: 'test-credential-id',
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      await expect(result.current.decryptData('')).rejects.toThrow(
        'No encrypted data provided for decryption'
      );
    });
  });

  describe('encryptWithPasskey', () => {
    test('encrypts successfully when passkey authenticated', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
          credentialId: 'test-credential-id',
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      const encryptedData = await result.current.encryptWithPasskey(
        'test data'
      );

      expect(mockPasskeyEncryptionService.encrypt).toHaveBeenCalledWith(
        'test data',
        'test-credential-id'
      );
      expect(encryptedData).toBe('encrypted-passkey-data');
    });

    test('throws error when no credential available', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      await expect(
        result.current.encryptWithPasskey('test data')
      ).rejects.toThrow('No passkey credential available for encryption');
    });

    test('throws error when not authenticated with passkey', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'pin',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      await expect(
        result.current.encryptWithPasskey('test data')
      ).rejects.toThrow('Not authenticated with passkey method');
    });
  });

  describe('decryptWithPasskey', () => {
    test('decrypts successfully when passkey authenticated', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
          credentialId: 'test-credential-id',
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      const decryptedData = await result.current.decryptWithPasskey(
        'encrypted-data'
      );

      expect(mockPasskeyEncryptionService.decrypt).toHaveBeenCalledWith(
        'encrypted-data',
        'test-credential-id'
      );
      expect(decryptedData).toBe('decrypted-passkey-data');
    });

    test('throws error when no credential available', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      await expect(
        result.current.decryptWithPasskey('encrypted-data')
      ).rejects.toThrow('No passkey credential available for decryption');
    });

    test('throws error when not authenticated with passkey', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'pin',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      await expect(
        result.current.decryptWithPasskey('encrypted-data')
      ).rejects.toThrow('Not authenticated with passkey method');
    });
  });

  describe('encryptWithPin', () => {
    test('encrypts successfully with PIN', async () => {
      const { result } = renderHook(() => useEncryption());

      const encryptedData = await result.current.encryptWithPin(
        'test data',
        '1234'
      );

      expect(mockPinEncryptionService.encrypt).toHaveBeenCalledWith(
        'test data',
        '1234'
      );
      expect(encryptedData).toBe('encrypted-pin-data');
    });

    test('throws error when PIN is empty', async () => {
      const { result } = renderHook(() => useEncryption());

      await expect(
        result.current.encryptWithPin('test data', '')
      ).rejects.toThrow('PIN is required for PIN-based encryption');
    });
  });

  describe('decryptWithPin', () => {
    test('decrypts successfully with PIN', async () => {
      const { result } = renderHook(() => useEncryption());

      const decryptedData = await result.current.decryptWithPin(
        'encrypted-data',
        '1234'
      );

      expect(mockPinEncryptionService.decrypt).toHaveBeenCalledWith(
        'encrypted-data',
        '1234'
      );
      expect(decryptedData).toBe('decrypted-pin-data');
    });

    test('throws error when PIN is empty', async () => {
      const { result } = renderHook(() => useEncryption());

      await expect(
        result.current.decryptWithPin('encrypted-data', '')
      ).rejects.toThrow('PIN is required for PIN-based decryption');
    });
  });

  describe('testEncryption', () => {
    test('tests passkey encryption when authenticated with passkey', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
          credentialId: 'test-credential-id',
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      const success = await result.current.testEncryption();

      expect(mockPasskeyEncryptionService.testEncryption).toHaveBeenCalledWith(
        'test-credential-id'
      );
      expect(success).toBe(true);
    });

    test('tests PIN encryption when authenticated with PIN', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'pin',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      const success = await result.current.testEncryption('test data', '1234');

      expect(mockPinEncryptionService.testEncryption).toHaveBeenCalledWith(
        'test data',
        '1234'
      );
      expect(success).toBe(true);
    });

    test('returns false when no valid test method available', async () => {
      const { result } = renderHook(() => useEncryption());

      const success = await result.current.testEncryption();

      expect(success).toBe(false);
    });
  });

  describe('testPasskeyEncryption', () => {
    test('tests passkey encryption successfully', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
          credentialId: 'test-credential-id',
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      const success = await result.current.testPasskeyEncryption();

      expect(mockPasskeyEncryptionService.testEncryption).toHaveBeenCalledWith(
        'test-credential-id'
      );
      expect(success).toBe(true);
    });

    test('returns false when no credential available', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      const success = await result.current.testPasskeyEncryption();

      expect(success).toBe(false);
    });

    test('returns false when not authenticated with passkey', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'pin',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      const success = await result.current.testPasskeyEncryption();

      expect(success).toBe(false);
    });
  });

  describe('validateEncryptedData', () => {
    test('validates PIN encrypted data', () => {
      const { result } = renderHook(() => useEncryption());

      const isValid = result.current.validateEncryptedData('encrypted-data');

      expect(
        mockPinEncryptionService.validateEncryptedData
      ).toHaveBeenCalledWith('encrypted-data');
      expect(isValid).toBe(true);
    });

    test('validates passkey encrypted data', () => {
      // Mock PIN validation to return false
      mockPinEncryptionService.validateEncryptedData.mockReturnValue(false);

      // Mock atob and JSON.parse for passkey format
      global.atob = jest.fn(() =>
        JSON.stringify({
          version: 1,
          algorithm: 'passkey-aes-gcm',
          salt: [1, 2, 3],
          iv: [4, 5, 6],
          data: [7, 8, 9],
          challenge: [10, 11, 12],
          timestamp: Date.now(),
        })
      );

      const { result } = renderHook(() => useEncryption());

      const isValid = result.current.validateEncryptedData('encrypted-data');

      expect(isValid).toBe(true);
    });

    test('returns false for invalid data', () => {
      mockPinEncryptionService.validateEncryptedData.mockReturnValue(false);
      global.atob = jest.fn(() => {
        throw new Error('Invalid data');
      });

      const { result } = renderHook(() => useEncryption());

      const isValid = result.current.validateEncryptedData('invalid-data');

      expect(isValid).toBe(false);
    });
  });

  describe('getEncryptedDataInfo', () => {
    test('returns PIN encrypted data info', () => {
      const { result } = renderHook(() => useEncryption());

      const info = result.current.getEncryptedDataInfo('encrypted-data');

      expect(
        mockPinEncryptionService.getEncryptedDataInfo
      ).toHaveBeenCalledWith('encrypted-data');
      expect(info).toEqual({
        version: 1,
        algorithm: 'pin-aes-gcm',
        timestamp: expect.any(Number),
        dataSize: 100,
      });
    });

    test('returns passkey encrypted data info', () => {
      // Mock PIN info to return null
      mockPinEncryptionService.getEncryptedDataInfo.mockReturnValue(null);

      // Mock atob and JSON.parse for passkey format
      const mockData = {
        version: 1,
        algorithm: 'passkey-aes-gcm',
        salt: [1, 2, 3],
        iv: [4, 5, 6],
        data: [7, 8, 9],
        challenge: [10, 11, 12],
        timestamp: Date.now(),
      };
      global.atob = jest.fn(() => JSON.stringify(mockData));

      const { result } = renderHook(() => useEncryption());

      const info = result.current.getEncryptedDataInfo('encrypted-data');

      expect(info).toEqual({
        version: 1,
        algorithm: 'passkey-aes-gcm',
        timestamp: mockData.timestamp,
        dataSize: 3,
      });
    });

    test('returns null for invalid data', () => {
      mockPinEncryptionService.getEncryptedDataInfo.mockReturnValue(null);
      global.atob = jest.fn(() => {
        throw new Error('Invalid data');
      });

      const { result } = renderHook(() => useEncryption());

      const info = result.current.getEncryptedDataInfo('invalid-data');

      expect(info).toBe(null);
    });
  });

  describe('Error Handling', () => {
    test('handles encryption service errors gracefully', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
          credentialId: 'test-credential-id',
        },
        setAuthState: jest.fn(),
      });

      mockPasskeyEncryptionService.encrypt.mockRejectedValue(
        new Error('Encryption failed')
      );

      const { result } = renderHook(() => useEncryption());

      await expect(result.current.encryptData('test data')).rejects.toThrow(
        'Encryption failed'
      );
      expect(mockAuthLogger.error).toHaveBeenCalled();
    });

    test('handles decryption service errors gracefully', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
          credentialId: 'test-credential-id',
        },
        setAuthState: jest.fn(),
      });

      mockPasskeyEncryptionService.decrypt.mockRejectedValue(
        new Error('Decryption failed')
      );

      const { result } = renderHook(() => useEncryption());

      await expect(
        result.current.decryptData('encrypted-data')
      ).rejects.toThrow('Decryption failed');
      expect(mockAuthLogger.error).toHaveBeenCalled();
    });
  });

  describe('Performance Monitoring', () => {
    test('logs performance for encryptData', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
          credentialId: 'test-credential-id',
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      await result.current.encryptData('test data');

      expect(mockAuthLogger.performance).toHaveBeenCalledWith(
        'encryptData',
        expect.any(Number)
      );
    });

    test('logs performance for decryptData', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
          credentialId: 'test-credential-id',
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      await result.current.decryptData('encrypted-data');

      expect(mockAuthLogger.performance).toHaveBeenCalledWith(
        'decryptData',
        expect.any(Number)
      );
    });
  });

  describe('Logging', () => {
    test('logs debug information for encryptData', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
          credentialId: 'test-credential-id',
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      await result.current.encryptData('test data');

      expect(mockAuthLogger.debug).toHaveBeenCalledWith(
        'useEncryption.encryptData called',
        expect.objectContaining({
          dataLength: 9,
          method: 'passkey',
          hasCredential: true,
          hasPin: undefined,
        })
      );
    });

    test('logs debug information for decryptData', async () => {
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
          credentialId: 'test-credential-id',
        },
        setAuthState: jest.fn(),
      });

      const { result } = renderHook(() => useEncryption());

      await result.current.decryptData('encrypted-data');

      expect(mockAuthLogger.debug).toHaveBeenCalledWith(
        'useEncryption.decryptData called',
        expect.objectContaining({
          encryptedDataLength: 14,
          method: 'passkey',
          hasCredential: true,
          hasPin: undefined,
        })
      );
    });
  });
});
