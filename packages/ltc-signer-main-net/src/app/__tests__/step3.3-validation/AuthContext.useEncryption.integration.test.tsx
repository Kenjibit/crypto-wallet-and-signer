import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthProvider } from '../../contexts/AuthContext';
import { PasskeyEncryptionService } from '../../services/encryption/PasskeyEncryptionService';
import { PinEncryptionService } from '../../services/encryption/PinEncryptionService';
import { authLogger } from '../../../utils/auth/authLogger';

import { vi } from 'vitest';
// Mock the services
vi.mock('../../services/encryption/PasskeyEncryptionService');
vi.mock('../../services/encryption/PinEncryptionService');
vi.mock('../../../utils/auth/authLogger');

// Mock WebAuthn API
Object.defineProperty(navigator, 'credentials', {
  value: {
    create: vi.fn(),
    get: vi.fn(),
  },
  writable: true,
});

// Mock crypto API
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: vi.fn(),
    subtle: {
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      importKey: vi.fn(),
      deriveKey: vi.fn(),
      digest: vi.fn(),
    },
  },
});

const mockPasskeyEncryptionService = PasskeyEncryptionService as vi.Mocked<
  typeof PasskeyEncryptionService
>;
const mockPinEncryptionService = PinEncryptionService as vi.Mocked<
  typeof PinEncryptionService
>;
const mockAuthLogger = authLogger as vi.Mocked<typeof authLogger>;

describe('AuthContext + useEncryption Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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

    mockAuthLogger.debug.mockImplementation(() => {});
    mockAuthLogger.error.mockImplementation(() => {});
    mockAuthLogger.performance.mockImplementation(() => {});

    // Mock WebAuthn credentials
    const mockCredential = {
      id: 'test-credential-id',
      type: 'public-key',
      response: {
        clientDataJSON: new Uint8Array([1, 2, 3]),
        attestationObject: new Uint8Array([4, 5, 6]),
      },
    };

    const mockAssertion = {
      id: 'test-credential-id',
      type: 'public-key',
      response: {
        clientDataJSON: new Uint8Array([1, 2, 3]),
        authenticatorData: new Uint8Array([4, 5, 6]),
        signature: new Uint8Array([7, 8, 9]),
        userHandle: new Uint8Array([10, 11, 12]),
      },
    };

    (
      navigator.credentials.create as vi.MockedFunction<
        typeof navigator.credentials.create
      >
    ).mockResolvedValue(mockCredential);
    (
      navigator.credentials.get as vi.MockedFunction<
        typeof navigator.credentials.get
      >
    ).mockResolvedValue(mockAssertion);
  });

  describe('Encryption Integration with AuthContext', () => {
    test('provides encryption methods in AuthContext', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current).toHaveProperty('encryptWithPasskey');
      expect(result.current).toHaveProperty('decryptWithPasskey');
      expect(result.current).toHaveProperty('encryptWithPin');
      expect(result.current).toHaveProperty('decryptWithPin');
      expect(result.current).toHaveProperty('testPasskeyEncryption');

      expect(typeof result.current.encryptWithPasskey).toBe('function');
      expect(typeof result.current.decryptWithPasskey).toBe('function');
      expect(typeof result.current.encryptWithPin).toBe('function');
      expect(typeof result.current.decryptWithPin).toBe('function');
      expect(typeof result.current.testPasskeyEncryption).toBe('function');
    });

    test('encryptWithPasskey works after passkey authentication', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Create passkey first
      await act(async () => {
        await result.current.createPasskey('test-user', 'Test User');
      });

      // Verify passkey creation set up the credential
      expect(result.current.authState.credentialId).toBeDefined();

      // Now test encryption
      let encryptedData: string;
      await act(async () => {
        encryptedData = await result.current.encryptWithPasskey('wallet data');
      });

      expect(mockPasskeyEncryptionService.encrypt).toHaveBeenCalledWith(
        'wallet data',
        result.current.authState.credentialId
      );
      expect(encryptedData).toBe('encrypted-passkey-data');
    });

    test('decryptWithPasskey works after passkey authentication', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Create passkey first
      await act(async () => {
        await result.current.createPasskey('test-user', 'Test User');
      });

      // Now test decryption
      let decryptedData: string;
      await act(async () => {
        decryptedData = await result.current.decryptWithPasskey(
          'encrypted-data'
        );
      });

      expect(mockPasskeyEncryptionService.decrypt).toHaveBeenCalledWith(
        'encrypted-data',
        result.current.authState.credentialId
      );
      expect(decryptedData).toBe('decrypted-passkey-data');
    });

    test('encryptWithPin works after PIN setup', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Set PIN first
      act(() => {
        result.current.setPinCode('1234', '1234');
      });

      // Now test encryption
      let encryptedData: string;
      await act(async () => {
        encryptedData = await result.current.encryptWithPin(
          'wallet data',
          '1234'
        );
      });

      expect(mockPinEncryptionService.encrypt).toHaveBeenCalledWith(
        'wallet data',
        '1234'
      );
      expect(encryptedData).toBe('encrypted-pin-data');
    });

    test('decryptWithPin works after PIN setup', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Set PIN first
      act(() => {
        result.current.setPinCode('1234', '1234');
      });

      // Now test decryption
      let decryptedData: string;
      await act(async () => {
        decryptedData = await result.current.decryptWithPin(
          'encrypted-data',
          '1234'
        );
      });

      expect(mockPinEncryptionService.decrypt).toHaveBeenCalledWith(
        'encrypted-data',
        '1234'
      );
      expect(decryptedData).toBe('decrypted-pin-data');
    });

    test('testPasskeyEncryption works after passkey authentication', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Create passkey first
      await act(async () => {
        await result.current.createPasskey('test-user', 'Test User');
      });

      // Now test encryption
      let testResult: boolean;
      await act(async () => {
        testResult = await result.current.testPasskeyEncryption();
      });

      expect(mockPasskeyEncryptionService.testEncryption).toHaveBeenCalledWith(
        result.current.authState.credentialId
      );
      expect(testResult).toBe(true);
    });
  });

  describe('End-to-End Encryption Workflows', () => {
    test('complete passkey encryption workflow', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // 1. Create passkey
      await act(async () => {
        await result.current.createPasskey('test-user', 'Test User');
      });

      expect(result.current.authState.status).toBe('authenticated');
      expect(result.current.authState.method).toBe('passkey');
      expect(result.current.authState.credentialId).toBeDefined();

      // 2. Encrypt data
      const testData = 'sensitive wallet information';
      let encryptedData: string;
      await act(async () => {
        encryptedData = await result.current.encryptWithPasskey(testData);
      });

      expect(encryptedData).toBe('encrypted-passkey-data');

      // 3. Decrypt data
      let decryptedData: string;
      await act(async () => {
        decryptedData = await result.current.decryptWithPasskey(encryptedData);
      });

      expect(decryptedData).toBe('decrypted-passkey-data');
      expect(mockPasskeyEncryptionService.decrypt).toHaveBeenCalledWith(
        'encrypted-passkey-data',
        result.current.authState.credentialId
      );
    });

    test('complete PIN encryption workflow', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // 1. Set PIN
      act(() => {
        result.current.setPinCode('5678', '5678');
      });

      expect(result.current.authState.status).toBe('authenticated');
      expect(result.current.authState.method).toBe('pin');

      // 2. Encrypt data
      const testData = 'sensitive wallet information';
      let encryptedData: string;
      await act(async () => {
        encryptedData = await result.current.encryptWithPin(testData, '5678');
      });

      expect(encryptedData).toBe('encrypted-pin-data');

      // 3. Decrypt data
      let decryptedData: string;
      await act(async () => {
        decryptedData = await result.current.decryptWithPin(
          encryptedData,
          '5678'
        );
      });

      expect(decryptedData).toBe('decrypted-pin-data');
      expect(mockPinEncryptionService.decrypt).toHaveBeenCalledWith(
        'encrypted-pin-data',
        '5678'
      );
    });

    test('encryption round-trip validation', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Setup passkey authentication
      await act(async () => {
        await result.current.createPasskey('test-user', 'Test User');
      });

      const originalData =
        'This is sensitive wallet data that needs encryption';

      // Encrypt and decrypt
      let encrypted: string;
      let decrypted: string;

      await act(async () => {
        encrypted = await result.current.encryptWithPasskey(originalData);
        decrypted = await result.current.decryptWithPasskey(encrypted);
      });

      expect(encrypted).toBe('encrypted-passkey-data');
      expect(decrypted).toBe('decrypted-passkey-data');

      // Verify the services were called correctly
      expect(mockPasskeyEncryptionService.encrypt).toHaveBeenCalledWith(
        originalData,
        result.current.authState.credentialId
      );
      expect(mockPasskeyEncryptionService.decrypt).toHaveBeenCalledWith(
        'encrypted-passkey-data',
        result.current.authState.credentialId
      );
    });
  });

  describe('Error Handling Integration', () => {
    test('handles passkey encryption errors gracefully', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Setup passkey authentication
      await act(async () => {
        await result.current.createPasskey('test-user', 'Test User');
      });

      // Mock encryption failure
      mockPasskeyEncryptionService.encrypt.mockRejectedValue(
        new Error('Passkey encryption failed')
      );

      // Attempt encryption
      await act(async () => {
        await expect(
          result.current.encryptWithPasskey('test data')
        ).rejects.toThrow('Passkey encryption failed');
      });

      expect(mockAuthLogger.error).toHaveBeenCalled();
    });

    test('handles PIN encryption errors gracefully', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Setup PIN authentication
      act(() => {
        result.current.setPinCode('1234', '1234');
      });

      // Mock encryption failure
      mockPinEncryptionService.encrypt.mockRejectedValue(
        new Error('PIN encryption failed')
      );

      // Attempt encryption
      await act(async () => {
        await expect(
          result.current.encryptWithPin('test data', '1234')
        ).rejects.toThrow('PIN encryption failed');
      });

      expect(mockAuthLogger.error).toHaveBeenCalled();
    });

    test('handles encryption without authentication', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Try to encrypt without authentication
      await act(async () => {
        await expect(
          result.current.encryptWithPasskey('test data')
        ).rejects.toThrow('No passkey credential available for encryption');
      });

      await act(async () => {
        await expect(
          result.current.encryptWithPin('test data', '1234')
        ).rejects.toThrow('PIN is required for PIN-based encryption');
      });
    });
  });

  describe('State Management Integration', () => {
    test('encryption methods respect auth state changes', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Start unauthenticated
      expect(result.current.authState.status).toBe('unauthenticated');

      // Try encryption without auth (should fail)
      await act(async () => {
        await expect(
          result.current.encryptWithPasskey('test')
        ).rejects.toThrow();
      });

      // Authenticate with passkey
      await act(async () => {
        await result.current.createPasskey('test-user', 'Test User');
      });

      expect(result.current.authState.status).toBe('authenticated');
      expect(result.current.authState.method).toBe('passkey');

      // Now encryption should work
      await act(async () => {
        const encrypted = await result.current.encryptWithPasskey('test data');
        expect(encrypted).toBe('encrypted-passkey-data');
      });

      // Logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.authState.status).toBe('unauthenticated');

      // Encryption should fail again
      await act(async () => {
        await expect(
          result.current.encryptWithPasskey('test')
        ).rejects.toThrow();
      });
    });

    test('PIN encryption works after PIN setup', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Start unauthenticated
      expect(result.current.authState.status).toBe('unauthenticated');

      // Try PIN encryption without PIN setup (should still work)
      await act(async () => {
        const encrypted = await result.current.encryptWithPin(
          'test data',
          '1234'
        );
        expect(encrypted).toBe('encrypted-pin-data');
      });

      // Setup PIN properly
      act(() => {
        result.current.setPinCode('5678', '5678');
      });

      expect(result.current.authState.status).toBe('authenticated');
      expect(result.current.authState.method).toBe('pin');

      // PIN encryption should still work
      await act(async () => {
        const encrypted = await result.current.encryptWithPin(
          'test data',
          '5678'
        );
        expect(encrypted).toBe('encrypted-pin-data');
      });
    });
  });

  describe('Service Integration', () => {
    test('uses PasskeyEncryptionService correctly', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Setup passkey authentication
      await act(async () => {
        await result.current.createPasskey('test-user', 'Test User');
      });

      // Test encryption service integration
      await act(async () => {
        await result.current.encryptWithPasskey('test data');
      });

      expect(mockPasskeyEncryptionService.encrypt).toHaveBeenCalledWith(
        'test data',
        result.current.authState.credentialId
      );

      // Test decryption service integration
      await act(async () => {
        await result.current.decryptWithPasskey('encrypted-data');
      });

      expect(mockPasskeyEncryptionService.decrypt).toHaveBeenCalledWith(
        'encrypted-data',
        result.current.authState.credentialId
      );
    });

    test('uses PinEncryptionService correctly', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Test encryption service integration
      await act(async () => {
        await result.current.encryptWithPin('test data', '1234');
      });

      expect(mockPinEncryptionService.encrypt).toHaveBeenCalledWith(
        'test data',
        '1234'
      );

      // Test decryption service integration
      await act(async () => {
        await result.current.decryptWithPin('encrypted-data', '1234');
      });

      expect(mockPinEncryptionService.decrypt).toHaveBeenCalledWith(
        'encrypted-data',
        '1234'
      );
    });
  });

  describe('Performance Monitoring Integration', () => {
    test('logs performance metrics for encryption operations', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Setup passkey authentication
      await act(async () => {
        await result.current.createPasskey('test-user', 'Test User');
      });

      // Perform encryption
      await act(async () => {
        await result.current.encryptWithPasskey('test data');
      });

      // Check that performance was logged (this would be tested more thoroughly in unit tests)
      expect(mockAuthLogger.debug).toHaveBeenCalled();
    });

    test('logs performance metrics for decryption operations', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Setup passkey authentication
      await act(async () => {
        await result.current.createPasskey('test-user', 'Test User');
      });

      // Perform decryption
      await act(async () => {
        await result.current.decryptWithPasskey('encrypted-data');
      });

      // Check that performance was logged
      expect(mockAuthLogger.debug).toHaveBeenCalled();
    });
  });

  describe('PWA Compatibility', () => {
    test('works in PWA environment', async () => {
      // Mock PWA environment
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { controller: {} },
        writable: true,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Setup passkey authentication
      await act(async () => {
        await result.current.createPasskey('test-user', 'Test User');
      });

      // Test encryption in PWA context
      await act(async () => {
        const encrypted = await result.current.encryptWithPasskey(
          'pwa test data'
        );
        expect(encrypted).toBe('encrypted-passkey-data');
      });

      // Verify WebAuthn was called (simulating PWA environment)
      expect(navigator.credentials.create).toHaveBeenCalled();
    });

    test('handles offline encryption scenarios', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Setup PIN authentication (works offline)
      act(() => {
        result.current.setPinCode('1234', '1234');
      });

      // Test PIN encryption offline
      await act(async () => {
        const encrypted = await result.current.encryptWithPin(
          'offline test data',
          '1234'
        );
        expect(encrypted).toBe('encrypted-pin-data');
      });

      // PIN encryption should work completely offline
      expect(mockPinEncryptionService.encrypt).toHaveBeenCalledWith(
        'offline test data',
        '1234'
      );
    });
  });
});
