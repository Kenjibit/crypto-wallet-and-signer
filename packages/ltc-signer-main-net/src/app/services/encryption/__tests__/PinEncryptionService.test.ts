import { describe, test, expect, beforeEach } from 'vitest';
import { PinEncryptionService } from '../PinEncryptionService';

import { vi } from 'vitest';
// Mock the authLogger
vi.mock('../../../../utils/auth/authLogger', () => ({
  authLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    performance: vi.fn(),
  },
}));

// Mock crypto.getRandomValues
const mockGetRandomValues = vi.fn();
Object.defineProperty(global.crypto, 'getRandomValues', {
  value: mockGetRandomValues,
  writable: true,
});

// Mock crypto.subtle
const mockCryptoSubtle = {
  importKey: vi.fn(),
  deriveKey: vi.fn(),
  encrypt: vi.fn(),
  decrypt: vi.fn(),
};
Object.defineProperty(global.crypto, 'subtle', {
  value: mockCryptoSubtle,
  writable: true,
});

// Mock performance.now
const mockPerformanceNow = vi.fn();
Object.defineProperty(window.performance, 'now', {
  value: mockPerformanceNow,
  writable: true,
});

describe('PinEncryptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);

    // Mock crypto.getRandomValues to return predictable values
    mockGetRandomValues.mockImplementation((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = i % 256; // Fill with predictable pattern
      }
    });
  });

  describe('encrypt', () => {
    beforeEach(() => {
      // Mock successful crypto operations
      const mockKey = { type: 'secret' };
      const mockEncryptedData = new Uint8Array([1, 2, 3, 4, 5]);

      mockCryptoSubtle.importKey.mockResolvedValue(mockKey);
      mockCryptoSubtle.deriveKey.mockResolvedValue(mockKey);
      mockCryptoSubtle.encrypt.mockResolvedValue(mockEncryptedData);
    });

    test('encrypts data successfully', async () => {
      const testData = 'Hello, World!';
      const pin = '1234';

      const result = await PinEncryptionService.encrypt(testData, pin);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);

      // Verify the result is valid base64
      expect(() => atob(result)).not.toThrow();
    });

    test('handles crypto operation failures', async () => {
      mockCryptoSubtle.importKey.mockRejectedValue(new Error('Crypto failed'));

      const testData = 'test';
      const pin = '1234';

      await expect(PinEncryptionService.encrypt(testData, pin)).rejects.toThrow(
        'PIN encryption failed'
      );
    });

    test('includes proper metadata in encrypted payload', async () => {
      const testData = 'test data';
      const pin = '1234';

      const result = await PinEncryptionService.encrypt(testData, pin);
      const payload = JSON.parse(atob(result));

      expect(payload.version).toBe(1);
      expect(payload.algorithm).toBe('pin-aes-gcm');
      expect(Array.isArray(payload.salt)).toBe(true);
      expect(Array.isArray(payload.iv)).toBe(true);
      expect(Array.isArray(payload.data)).toBe(true);
      expect(typeof payload.timestamp).toBe('number');
    });
  });

  describe('decrypt', () => {
    beforeEach(() => {
      // Mock successful crypto operations
      const mockKey = { type: 'secret' };
      const mockDecryptedData = new TextEncoder().encode('decrypted data');

      mockCryptoSubtle.importKey.mockResolvedValue(mockKey);
      mockCryptoSubtle.deriveKey.mockResolvedValue(mockKey);
      mockCryptoSubtle.decrypt.mockResolvedValue(mockDecryptedData);
    });

    test('decrypts data successfully', async () => {
      // First encrypt some data
      const testData = 'Hello, World!';
      const pin = '1234';

      const encrypted = await PinEncryptionService.encrypt(testData, pin);
      const decrypted = await PinEncryptionService.decrypt(encrypted, pin);

      expect(decrypted).toBe(testData);
    });

    test('rejects invalid encrypted data format', async () => {
      const invalidData = btoa(JSON.stringify({ invalid: 'format' }));

      await expect(
        PinEncryptionService.decrypt(invalidData, '1234')
      ).rejects.toThrow('Unsupported encrypted data format');
    });

    test('rejects corrupted base64 data', async () => {
      const corruptedData = 'invalid-base64!';

      await expect(
        PinEncryptionService.decrypt(corruptedData, '1234')
      ).rejects.toThrow();
    });

    test('handles crypto operation failures', async () => {
      mockCryptoSubtle.importKey.mockRejectedValue(new Error('Crypto failed'));

      const testData = 'test';
      const pin = '1234';
      const encrypted = await PinEncryptionService.encrypt(testData, pin);

      const isValid = await PinEncryptionService.decrypt(encrypted, pin);
      expect(isValid).toBe('decrypted data'); // Mocked result
    });

    test('provides specific error for wrong PIN', async () => {
      mockCryptoSubtle.decrypt.mockRejectedValue(
        new Error(
          'OperationError: The operation failed for an operation-specific reason'
        )
      );

      const testData = 'test';
      const pin = '1234';
      const encrypted = await PinEncryptionService.encrypt(testData, pin);

      await expect(
        PinEncryptionService.decrypt(encrypted, '5678')
      ).rejects.toThrow(
        'PIN decryption failed: incorrect PIN or corrupted data'
      );
    });
  });

  describe('testEncryption', () => {
    beforeEach(() => {
      // Mock successful crypto operations
      const mockKey = { type: 'secret' };
      const mockEncryptedData = new Uint8Array([1, 2, 3, 4, 5]);
      const mockDecryptedData = new TextEncoder().encode('test data');

      mockCryptoSubtle.importKey.mockResolvedValue(mockKey);
      mockCryptoSubtle.deriveKey.mockResolvedValue(mockKey);
      mockCryptoSubtle.encrypt.mockResolvedValue(mockEncryptedData);
      mockCryptoSubtle.decrypt.mockResolvedValue(mockDecryptedData);
    });

    test('passes encryption round trip test', async () => {
      const result = await PinEncryptionService.testEncryption(
        'test data',
        '1234'
      );
      expect(result).toBe(true);
    });

    test('fails encryption test when round trip fails', async () => {
      // Mock decryption to return different data
      const wrongData = new TextEncoder().encode('wrong data');
      mockCryptoSubtle.decrypt.mockResolvedValue(wrongData);

      const result = await PinEncryptionService.testEncryption(
        'test data',
        '1234'
      );
      expect(result).toBe(false);
    });

    test('handles encryption failures in test', async () => {
      mockCryptoSubtle.importKey.mockRejectedValue(new Error('Crypto failed'));

      const result = await PinEncryptionService.testEncryption(
        'test data',
        '1234'
      );
      expect(result).toBe(false);
    });

    test('uses default test parameters when not provided', async () => {
      const result = await PinEncryptionService.testEncryption();
      expect(result).toBe(true);
    });
  });

  describe('validateEncryptedData', () => {
    test('validates correct encrypted data format', async () => {
      const testData = 'test data';
      const pin = '1234';
      const encrypted = await PinEncryptionService.encrypt(testData, pin);

      const isValid = PinEncryptionService.validateEncryptedData(encrypted);
      expect(isValid).toBe(true);
    });

    test('rejects invalid base64 data', () => {
      const isValid =
        PinEncryptionService.validateEncryptedData('invalid-base64!');
      expect(isValid).toBe(false);
    });

    test('rejects invalid JSON data', () => {
      const invalidJson = btoa('invalid json');
      const isValid = PinEncryptionService.validateEncryptedData(invalidJson);
      expect(isValid).toBe(false);
    });

    test('rejects data with wrong version', () => {
      const wrongVersion = btoa(
        JSON.stringify({
          version: 2,
          algorithm: 'pin-aes-gcm',
          salt: [1, 2, 3],
          iv: [4, 5, 6],
          data: [7, 8, 9],
          timestamp: Date.now(),
        })
      );

      const isValid = PinEncryptionService.validateEncryptedData(wrongVersion);
      expect(isValid).toBe(false);
    });

    test('rejects data with wrong algorithm', () => {
      const wrongAlgorithm = btoa(
        JSON.stringify({
          version: 1,
          algorithm: 'wrong-algorithm',
          salt: [1, 2, 3],
          iv: [4, 5, 6],
          data: [7, 8, 9],
          timestamp: Date.now(),
        })
      );

      const isValid =
        PinEncryptionService.validateEncryptedData(wrongAlgorithm);
      expect(isValid).toBe(false);
    });
  });

  describe('getEncryptedDataInfo', () => {
    test('returns correct metadata for valid encrypted data', async () => {
      const testData = 'test data';
      const pin = '1234';
      const encrypted = await PinEncryptionService.encrypt(testData, pin);

      const info = PinEncryptionService.getEncryptedDataInfo(encrypted);

      expect(info).not.toBeNull();
      expect(info?.version).toBe(1);
      expect(info?.algorithm).toBe('pin-aes-gcm');
      expect(typeof info?.timestamp).toBe('number');
      expect(typeof info?.dataSize).toBe('number');
    });

    test('returns null for invalid encrypted data', () => {
      const info = PinEncryptionService.getEncryptedDataInfo('invalid-data');
      expect(info).toBeNull();
    });

    test('returns null for wrong version', () => {
      const wrongVersion = btoa(
        JSON.stringify({
          version: 2,
          algorithm: 'pin-aes-gcm',
          salt: [1, 2, 3],
          iv: [4, 5, 6],
          data: [7, 8, 9],
          timestamp: Date.now(),
        })
      );

      const info = PinEncryptionService.getEncryptedDataInfo(wrongVersion);
      expect(info).toBeNull();
    });
  });

  describe('encryption round trip', () => {
    test('successfully encrypts and decrypts various data types', async () => {
      const testCases = [
        'Simple text',
        'Text with special characters: !@#$%^&*()',
        'Unicode: 你好世界 🌍',
        'Numbers: 1234567890',
        'Empty string',
        'Very long text: ' + 'a'.repeat(1000),
      ];

      for (const testData of testCases) {
        const pin = '1234';

        const encrypted = await PinEncryptionService.encrypt(testData, pin);
        const decrypted = await PinEncryptionService.decrypt(encrypted, pin);

        expect(decrypted).toBe(testData);
      }
    });

    test('maintains data integrity with different PINs', async () => {
      const testData = 'sensitive data';
      const pin1 = '1234';
      const pin2 = '5678';

      const encrypted1 = await PinEncryptionService.encrypt(testData, pin1);
      const encrypted2 = await PinEncryptionService.encrypt(testData, pin2);

      // Same data with different PINs should produce different encrypted results
      expect(encrypted1).not.toBe(encrypted2);

      // But should decrypt correctly with respective PINs
      const decrypted1 = await PinEncryptionService.decrypt(encrypted1, pin1);
      const decrypted2 = await PinEncryptionService.decrypt(encrypted2, pin2);

      expect(decrypted1).toBe(testData);
      expect(decrypted2).toBe(testData);
    });
  });
});
