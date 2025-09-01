import { PasskeyEncryptionService } from '../PasskeyEncryptionService';

// Mock the WebAuthn API
const mockWebAuthn = {
  create: jest.fn(),
  get: jest.fn(),
  isUserVerifyingPlatformAuthenticatorAvailable: jest.fn(),
  isConditionalMediationAvailable: jest.fn(),
};

// Mock navigator
Object.defineProperty(navigator, 'credentials', {
  value: mockWebAuthn,
  writable: true,
});

// Mock PublicKeyCredential
Object.defineProperty(window, 'PublicKeyCredential', {
  value: {
    isUserVerifyingPlatformAuthenticatorAvailable:
      mockWebAuthn.isUserVerifyingPlatformAuthenticatorAvailable,
    isConditionalMediationAvailable:
      mockWebAuthn.isConditionalMediationAvailable,
  },
  writable: true,
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'test.example.com',
    protocol: 'https:',
    origin: 'https://test.example.com',
  },
  writable: true,
});

// Mock crypto
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: jest.fn(),
    subtle: {
      digest: jest.fn(),
      importKey: jest.fn(),
      deriveKey: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    },
  },
  writable: true,
});

// Mock performance
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(),
  },
  writable: true,
});

// Mock TextEncoder and TextDecoder
Object.defineProperty(window, 'TextEncoder', {
  value: jest.fn().mockImplementation(() => ({
    encode: jest.fn((str: string) => new Uint8Array(str.length)),
  })),
  writable: true,
});

Object.defineProperty(window, 'TextDecoder', {
  value: jest.fn().mockImplementation(() => ({
    decode: jest.fn(() => 'decrypted text'),
  })),
  writable: true,
});

// Setup mocks before each test
beforeEach(() => {
  jest.clearAllMocks();

  // Default mock implementations
  mockWebAuthn.get.mockResolvedValue({
    type: 'public-key',
    response: {
      signature: new Uint8Array([1, 2, 3, 4, 5]),
      clientDataJSON: new Uint8Array([6, 7, 8, 9, 10]),
      authenticatorData: new Uint8Array([11, 12, 13, 14, 15]),
    },
  });

  (crypto.getRandomValues as jest.Mock).mockImplementation(
    (array: Uint8Array) => {
      // Fill with predictable values for testing
      for (let i = 0; i < array.length; i++) {
        array[i] = i % 256;
      }
      return array;
    }
  );

  (crypto.subtle.digest as jest.Mock).mockResolvedValue(new Uint8Array(32));
  (crypto.subtle.importKey as jest.Mock).mockResolvedValue({});
  (crypto.subtle.deriveKey as jest.Mock).mockResolvedValue({});
  (crypto.subtle.encrypt as jest.Mock).mockResolvedValue(
    new Uint8Array([1, 2, 3, 4])
  );
  (crypto.subtle.decrypt as jest.Mock).mockResolvedValue(
    new Uint8Array([72, 101, 108, 108, 111])
  ); // "Hello" in UTF-8

  (performance.now as jest.Mock).mockReturnValue(1000);

  // Mock TextEncoder/TextDecoder
  const mockTextEncoder = {
    encode: jest.fn((str: string) => {
      const arr = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        arr[i] = str.charCodeAt(i);
      }
      return arr;
    }),
  };

  const mockTextDecoder = {
    decode: jest.fn((arr: Uint8Array) => {
      let str = '';
      for (let i = 0; i < arr.length; i++) {
        str += String.fromCharCode(arr[i]);
      }
      return str;
    }),
  };

  (window.TextEncoder as jest.Mock).mockImplementation(() => mockTextEncoder);
  (window.TextDecoder as jest.Mock).mockImplementation(() => mockTextDecoder);
});

describe('PasskeyEncryptionService', () => {
  const testCredentialId = btoa('test-credential');
  const testData = 'Hello, World!';
  const testEncryptedData = btoa(
    JSON.stringify({
      version: 1,
      algorithm: 'passkey-aes-gcm',
      salt: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      iv: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      data: [1, 2, 3, 4],
      timestamp: 1234567890,
      challenge: [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
        20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
      ],
    })
  );

  describe('encrypt', () => {
    test('encrypts data successfully', async () => {
      const result = await PasskeyEncryptionService.encrypt(
        testData,
        testCredentialId
      );

      expect(typeof result).toBe('string');

      // Parse the result to verify structure
      const parsed = JSON.parse(atob(result));
      expect(parsed.version).toBe(1);
      expect(parsed.algorithm).toBe('passkey-aes-gcm');
      expect(Array.isArray(parsed.salt)).toBe(true);
      expect(Array.isArray(parsed.iv)).toBe(true);
      expect(Array.isArray(parsed.data)).toBe(true);
      expect(typeof parsed.timestamp).toBe('number');
      expect(Array.isArray(parsed.challenge)).toBe(true);

      // Verify WebAuthn was called correctly
      expect(mockWebAuthn.get).toHaveBeenCalledWith({
        publicKey: expect.objectContaining({
          challenge: expect.any(Uint8Array),
          rpId: 'test.example.com',
          userVerification: 'required',
          timeout: 60000,
          allowCredentials: [
            expect.objectContaining({
              id: expect.any(Uint8Array),
              type: 'public-key',
            }),
          ],
        }),
      });
    });

    test('throws error when no credential ID is provided', async () => {
      await expect(
        PasskeyEncryptionService.encrypt(testData, '')
      ).rejects.toThrow('No passkey available for encryption');
    });

    test('throws error when WebAuthn returns no assertion', async () => {
      mockWebAuthn.get.mockResolvedValue(null);

      await expect(
        PasskeyEncryptionService.encrypt(testData, testCredentialId)
      ).rejects.toThrow('No assertion returned from navigator.credentials.get');
    });

    test('throws error when assertion has no response', async () => {
      mockWebAuthn.get.mockResolvedValue({
        type: 'public-key',
        // Missing response
      });

      await expect(
        PasskeyEncryptionService.encrypt(testData, testCredentialId)
      ).rejects.toThrow('Assertion does not contain response property');
    });

    test('throws error when assertion response has no signature', async () => {
      mockWebAuthn.get.mockResolvedValue({
        type: 'public-key',
        response: {
          // Missing signature
          clientDataJSON: new Uint8Array([1, 2, 3]),
          authenticatorData: new Uint8Array([4, 5, 6]),
        },
      });

      await expect(
        PasskeyEncryptionService.encrypt(testData, testCredentialId)
      ).rejects.toThrow('Assertion response does not contain signature');
    });

    test('handles NotAllowedError (user cancellation)', async () => {
      const error = new Error('User cancelled encryption');
      error.name = 'NotAllowedError';
      mockWebAuthn.get.mockRejectedValue(error);

      await expect(
        PasskeyEncryptionService.encrypt(testData, testCredentialId)
      ).rejects.toThrow(
        'Passkey encryption was cancelled or timed out. Please try again.'
      );
    });

    test('handles InvalidStateError (passkey not found)', async () => {
      const error = new Error('Passkey not found');
      error.name = 'InvalidStateError';
      mockWebAuthn.get.mockRejectedValue(error);

      await expect(
        PasskeyEncryptionService.encrypt(testData, testCredentialId)
      ).rejects.toThrow(
        'Passkey not found on this device. Please re-authenticate.'
      );
    });

    test('handles AbortError', async () => {
      const error = new Error('Encryption aborted');
      error.name = 'AbortError';
      mockWebAuthn.get.mockRejectedValue(error);

      await expect(
        PasskeyEncryptionService.encrypt(testData, testCredentialId)
      ).rejects.toThrow('Passkey encryption was aborted. Please try again.');
    });
  });

  describe('decrypt', () => {
    test('decrypts data successfully', async () => {
      const result = await PasskeyEncryptionService.decrypt(
        testEncryptedData,
        testCredentialId
      );

      expect(typeof result).toBe('string');

      // Verify WebAuthn was called correctly
      expect(mockWebAuthn.get).toHaveBeenCalledWith({
        publicKey: expect.objectContaining({
          challenge: expect.any(Uint8Array),
          rpId: 'test.example.com',
          userVerification: 'required',
          timeout: 60000,
          allowCredentials: [
            expect.objectContaining({
              id: expect.any(Uint8Array),
              type: 'public-key',
            }),
          ],
        }),
      });
    });

    test('throws error when no credential ID is provided', async () => {
      await expect(
        PasskeyEncryptionService.decrypt(testEncryptedData, '')
      ).rejects.toThrow('No passkey available for decryption');
    });

    test('throws error for unsupported version', async () => {
      const invalidData = btoa(
        JSON.stringify({
          version: 2,
          algorithm: 'passkey-aes-gcm',
          salt: [],
          iv: [],
          data: [],
          timestamp: 1234567890,
          challenge: [],
        })
      );

      await expect(
        PasskeyEncryptionService.decrypt(invalidData, testCredentialId)
      ).rejects.toThrow('Unsupported encrypted data format');
    });

    test('throws error for unsupported algorithm', async () => {
      const invalidData = btoa(
        JSON.stringify({
          version: 1,
          algorithm: 'unknown-algorithm',
          salt: [],
          iv: [],
          data: [],
          timestamp: 1234567890,
          challenge: [],
        })
      );

      await expect(
        PasskeyEncryptionService.decrypt(invalidData, testCredentialId)
      ).rejects.toThrow('Unsupported encrypted data format');
    });

    test('throws error when WebAuthn returns no assertion', async () => {
      mockWebAuthn.get.mockResolvedValue(null);

      await expect(
        PasskeyEncryptionService.decrypt(testEncryptedData, testCredentialId)
      ).rejects.toThrow('No assertion returned for decryption');
    });

    test('handles decryption errors gracefully', async () => {
      const error = new Error('Decryption failed');
      mockWebAuthn.get.mockRejectedValue(error);

      await expect(
        PasskeyEncryptionService.decrypt(testEncryptedData, testCredentialId)
      ).rejects.toThrow('Passkey decryption failed: Decryption failed');
    });
  });

  describe('testEncryption', () => {
    test('returns true for successful round trip', async () => {
      const result = await PasskeyEncryptionService.testEncryption(
        testCredentialId
      );

      expect(result).toBe(true);
    });

    test('returns false when encryption fails', async () => {
      const error = new Error('Encryption test failed');
      mockWebAuthn.get.mockRejectedValueOnce(error);

      const result = await PasskeyEncryptionService.testEncryption(
        testCredentialId
      );

      expect(result).toBe(false);
    });

    test('returns false when decryption fails', async () => {
      // Mock successful encryption but failed decryption
      mockWebAuthn.get
        .mockResolvedValueOnce({
          type: 'public-key',
          response: {
            signature: new Uint8Array([1, 2, 3]),
            clientDataJSON: new Uint8Array([4, 5, 6]),
            authenticatorData: new Uint8Array([7, 8, 9]),
          },
        })
        .mockRejectedValueOnce(new Error('Decryption failed'));

      const result = await PasskeyEncryptionService.testEncryption(
        testCredentialId
      );

      expect(result).toBe(false);
    });
  });
});
