import { renderHook, act } from '@testing-library/react';
import { usePasskeyAuth } from '../usePasskeyAuth';
import { PasskeyService } from '../../services/auth/PasskeyService';
import { PasskeyEncryptionService } from '../../services/encryption/PasskeyEncryptionService';

// Mock the services
jest.mock('../../services/auth/PasskeyService');
jest.mock('../../services/encryption/PasskeyEncryptionService');
jest.mock('../../../utils/auth/authLogger', () => ({
  authLogger: {
    debug: jest.fn(),
    error: jest.fn(),
    performance: jest.fn(),
  },
}));

const mockPasskeyService = PasskeyService as jest.Mocked<typeof PasskeyService>;
const mockPasskeyEncryptionService = PasskeyEncryptionService as jest.Mocked<
  typeof PasskeyEncryptionService
>;

describe('usePasskeyAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all mocks to default implementations
    mockPasskeyService.createCredential.mockResolvedValue({
      credential: {} as PublicKeyCredential,
      credentialId: 'mock-credential-id',
    });

    mockPasskeyService.verifyCredential.mockResolvedValue({
      success: true,
      authenticated: true,
    });

    mockPasskeyService.verifyCredentialExists.mockResolvedValue(true);

    mockPasskeyEncryptionService.encrypt.mockResolvedValue('encrypted-data');
    mockPasskeyEncryptionService.decrypt.mockResolvedValue('decrypted-data');
    mockPasskeyEncryptionService.testEncryption.mockResolvedValue(true);
  });

  describe('Initial State', () => {
    test('returns correct initial state', () => {
      const { result } = renderHook(() => usePasskeyAuth());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.createPasskey).toBe('function');
      expect(typeof result.current.verifyPasskey).toBe('function');
      expect(typeof result.current.verifyCredentialExists).toBe('function');
      expect(typeof result.current.encryptWithPasskey).toBe('function');
      expect(typeof result.current.decryptWithPasskey).toBe('function');
      expect(typeof result.current.testPasskeyEncryption).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('createPasskey', () => {
    test('successfully creates passkey', async () => {
      const { result } = renderHook(() => usePasskeyAuth());

      let success = false;
      await act(async () => {
        success = await result.current.createPasskey('testuser', 'Test User');
      });

      expect(success).toBe(true);
      expect(mockPasskeyService.createCredential).toHaveBeenCalledWith(
        'testuser',
        'Test User'
      );
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('handles creation failure', async () => {
      mockPasskeyService.createCredential.mockRejectedValue(
        new Error('Creation failed')
      );

      const { result } = renderHook(() => usePasskeyAuth());

      let success = false;
      await act(async () => {
        success = await result.current.createPasskey('testuser', 'Test User');
      });

      expect(success).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Creation failed');
    });

    test('validates required parameters', async () => {
      const { result } = renderHook(() => usePasskeyAuth());

      let success = false;
      await act(async () => {
        success = await result.current.createPasskey('', 'Test User');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe(
        'Username and display name are required'
      );
      expect(mockPasskeyService.createCredential).not.toHaveBeenCalled();
    });

    test('handles invalid credential response', async () => {
      mockPasskeyService.createCredential.mockResolvedValue({
        credential: null,
        credentialId: '',
      });

      const { result } = renderHook(() => usePasskeyAuth());

      let success = false;
      await act(async () => {
        success = await result.current.createPasskey('testuser', 'Test User');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe(
        'Passkey creation failed: No credential returned'
      );
    });

    test('sets loading state correctly', async () => {
      let resolvePromise: (value: {
        credential: PublicKeyCredential;
        credentialId: string;
      }) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockPasskeyService.createCredential.mockReturnValue(promise);

      const { result } = renderHook(() => usePasskeyAuth());

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.createPasskey('testuser', 'Test User');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise({
          credential: {} as PublicKeyCredential,
          credentialId: 'mock-credential-id',
        });
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('verifyPasskey', () => {
    test('successfully verifies passkey', async () => {
      const { result } = renderHook(() => usePasskeyAuth());

      let success = false;
      await act(async () => {
        success = await result.current.verifyPasskey('mock-credential-id');
      });

      expect(success).toBe(true);
      expect(mockPasskeyService.verifyCredential).toHaveBeenCalledWith(
        'mock-credential-id'
      );
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('handles verification failure', async () => {
      mockPasskeyService.verifyCredential.mockResolvedValue({
        success: false,
        authenticated: false,
      });

      const { result } = renderHook(() => usePasskeyAuth());

      let success = false;
      await act(async () => {
        success = await result.current.verifyPasskey('mock-credential-id');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Passkey verification failed');
    });

    test('handles verification error', async () => {
      mockPasskeyService.verifyCredential.mockRejectedValue(
        new Error('Verification failed')
      );

      const { result } = renderHook(() => usePasskeyAuth());

      let success = false;
      await act(async () => {
        success = await result.current.verifyPasskey('mock-credential-id');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Verification failed');
    });

    test('verifies passkey without credentialId', async () => {
      const { result } = renderHook(() => usePasskeyAuth());

      let success = false;
      await act(async () => {
        success = await result.current.verifyPasskey();
      });

      expect(success).toBe(true);
      expect(mockPasskeyService.verifyCredential).toHaveBeenCalledWith(
        undefined
      );
    });
  });

  describe('verifyCredentialExists', () => {
    test('successfully verifies credential exists', async () => {
      const { result } = renderHook(() => usePasskeyAuth());

      let exists = false;
      await act(async () => {
        exists = await result.current.verifyCredentialExists(
          'mock-credential-id'
        );
      });

      expect(exists).toBe(true);
      expect(mockPasskeyService.verifyCredentialExists).toHaveBeenCalledWith(
        'mock-credential-id'
      );
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('handles credential not existing', async () => {
      mockPasskeyService.verifyCredentialExists.mockResolvedValue(false);

      const { result } = renderHook(() => usePasskeyAuth());

      let exists = false;
      await act(async () => {
        exists = await result.current.verifyCredentialExists(
          'mock-credential-id'
        );
      });

      expect(exists).toBe(false);
    });

    test('handles verification error', async () => {
      mockPasskeyService.verifyCredentialExists.mockRejectedValue(
        new Error('Check failed')
      );

      const { result } = renderHook(() => usePasskeyAuth());

      let exists = false;
      await act(async () => {
        exists = await result.current.verifyCredentialExists(
          'mock-credential-id'
        );
      });

      expect(exists).toBe(false);
      expect(result.current.error).toBe('Check failed');
    });

    test('returns false for empty credentialId', async () => {
      const { result } = renderHook(() => usePasskeyAuth());

      let exists = false;
      await act(async () => {
        exists = await result.current.verifyCredentialExists('');
      });

      expect(exists).toBe(false);
      expect(mockPasskeyService.verifyCredentialExists).not.toHaveBeenCalled();
    });
  });

  describe('encryptWithPasskey', () => {
    test('successfully encrypts data', async () => {
      const { result } = renderHook(() => usePasskeyAuth());

      let encryptedData = '';
      await act(async () => {
        encryptedData = await result.current.encryptWithPasskey(
          'test data',
          'mock-credential-id'
        );
      });

      expect(encryptedData).toBe('encrypted-data');
      expect(mockPasskeyEncryptionService.encrypt).toHaveBeenCalledWith(
        'test data',
        'mock-credential-id'
      );
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('validates required data parameter', async () => {
      const { result } = renderHook(() => usePasskeyAuth());

      await expect(
        result.current.encryptWithPasskey('', 'mock-credential-id')
      ).rejects.toThrow('Data to encrypt is required');
    });

    test('validates required credentialId parameter', async () => {
      const { result } = renderHook(() => usePasskeyAuth());

      await expect(
        result.current.encryptWithPasskey('test data', '')
      ).rejects.toThrow('Credential ID is required for encryption');
    });

    test('handles encryption error', async () => {
      mockPasskeyEncryptionService.encrypt.mockRejectedValue(
        new Error('Encryption failed')
      );

      const { result } = renderHook(() => usePasskeyAuth());

      await expect(
        result.current.encryptWithPasskey('test data', 'mock-credential-id')
      ).rejects.toThrow('Encryption failed');
      expect(result.current.error).toBe('Passkey encryption failed');
    });
  });

  describe('decryptWithPasskey', () => {
    test('successfully decrypts data', async () => {
      const { result } = renderHook(() => usePasskeyAuth());

      let decryptedData = '';
      await act(async () => {
        decryptedData = await result.current.decryptWithPasskey(
          'encrypted-data',
          'mock-credential-id'
        );
      });

      expect(decryptedData).toBe('decrypted-data');
      expect(mockPasskeyEncryptionService.decrypt).toHaveBeenCalledWith(
        'encrypted-data',
        'mock-credential-id'
      );
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('validates required encryptedData parameter', async () => {
      const { result } = renderHook(() => usePasskeyAuth());

      await expect(
        result.current.decryptWithPasskey('', 'mock-credential-id')
      ).rejects.toThrow('Encrypted data is required');
    });

    test('validates required credentialId parameter', async () => {
      const { result } = renderHook(() => usePasskeyAuth());

      await expect(
        result.current.decryptWithPasskey('encrypted-data', '')
      ).rejects.toThrow('Credential ID is required for decryption');
    });

    test('handles decryption error', async () => {
      mockPasskeyEncryptionService.decrypt.mockRejectedValue(
        new Error('Decryption failed')
      );

      const { result } = renderHook(() => usePasskeyAuth());

      await expect(
        result.current.decryptWithPasskey(
          'encrypted-data',
          'mock-credential-id'
        )
      ).rejects.toThrow('Decryption failed');
      expect(result.current.error).toBe('Passkey decryption failed');
    });
  });

  describe('testPasskeyEncryption', () => {
    test('successfully tests encryption', async () => {
      const { result } = renderHook(() => usePasskeyAuth());

      let success = false;
      await act(async () => {
        success = await result.current.testPasskeyEncryption(
          'mock-credential-id'
        );
      });

      expect(success).toBe(true);
      expect(mockPasskeyEncryptionService.testEncryption).toHaveBeenCalledWith(
        'mock-credential-id'
      );
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('handles test failure', async () => {
      mockPasskeyEncryptionService.testEncryption.mockResolvedValue(false);

      const { result } = renderHook(() => usePasskeyAuth());

      let success = false;
      await act(async () => {
        success = await result.current.testPasskeyEncryption(
          'mock-credential-id'
        );
      });

      expect(success).toBe(false);
    });

    test('handles test error', async () => {
      mockPasskeyEncryptionService.testEncryption.mockRejectedValue(
        new Error('Test failed')
      );

      const { result } = renderHook(() => usePasskeyAuth());

      let success = false;
      await act(async () => {
        success = await result.current.testPasskeyEncryption(
          'mock-credential-id'
        );
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Passkey encryption test failed');
    });

    test('returns false for empty credentialId', async () => {
      const { result } = renderHook(() => usePasskeyAuth());

      let success = false;
      await act(async () => {
        success = await result.current.testPasskeyEncryption('');
      });

      expect(success).toBe(false);
      expect(
        mockPasskeyEncryptionService.testEncryption
      ).not.toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    test('clears error state', async () => {
      mockPasskeyService.createCredential.mockRejectedValue(
        new Error('Test error')
      );

      const { result } = renderHook(() => usePasskeyAuth());

      // Trigger an error
      await act(async () => {
        await result.current.createPasskey('test', 'Test');
      });

      expect(result.current.error).toBe('Test error');

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Air-gapped Compatibility', () => {
    test('works without navigator object', async () => {
      // Mock window as undefined (server-side rendering)
      const originalWindow = global.window;
      delete (global as unknown as Record<string, unknown>).window;

      const { result } = renderHook(() => usePasskeyAuth());

      // Should not crash and should handle gracefully
      expect(result.current).toBeDefined();
      expect(typeof result.current.createPasskey).toBe('function');

      // Restore window
      global.window = originalWindow;
    });

    test('handles network errors gracefully', async () => {
      mockPasskeyService.createCredential.mockRejectedValue(
        new Error('Network unavailable')
      );

      const { result } = renderHook(() => usePasskeyAuth());

      let success = false;
      await act(async () => {
        success = await result.current.createPasskey('testuser', 'Test User');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Network unavailable');
    });
  });
});
