import { authLogger } from '../../../utils/auth/authLogger';

/**
 * Service class for PIN-based encryption operations
 * Handles encryption and decryption of data using PIN-derived keys
 */
export class PinEncryptionService {
  private static readonly PBKDF2_ITERATIONS = 100000;
  private static readonly AES_KEY_LENGTH = 256;
  private static readonly AES_GCM_IV_LENGTH = 12;
  private static readonly PBKDF2_SALT_LENGTH = 16;
  private static readonly VERSION = 1;
  private static readonly ALGORITHM = 'pin-aes-gcm';

  /**
   * Encrypts data using a PIN-derived encryption key
   * @param data - Data to encrypt
   * @param pin - PIN to derive encryption key from
   * @returns Promise resolving to base64-encoded encrypted data
   */
  static async encrypt(data: string, pin: string): Promise<string> {
    const startTime = performance.now();

    try {
      authLogger.debug('PIN encryption started', {
        dataLength: data.length,
        pinLength: pin.length,
      });

      // Generate salt for PBKDF2
      const salt = new Uint8Array(this.PBKDF2_SALT_LENGTH);
      crypto.getRandomValues(salt);

      // Import PIN as key material
      const keyMaterial = new TextEncoder().encode(pin);
      const baseKey = await crypto.subtle.importKey(
        'raw',
        keyMaterial,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      // Derive encryption key using PBKDF2
      const encryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: this.PBKDF2_ITERATIONS,
          hash: 'SHA-256',
        },
        baseKey,
        { name: 'AES-GCM', length: this.AES_KEY_LENGTH },
        false,
        ['encrypt']
      );

      // Generate IV for AES-GCM
      const iv = new Uint8Array(this.AES_GCM_IV_LENGTH);
      crypto.getRandomValues(iv);

      // Encrypt the data
      const encodedData = new TextEncoder().encode(data);
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        encryptionKey,
        encodedData
      );

      // Create encrypted payload with metadata
      const encryptedPayload = {
        version: this.VERSION,
        algorithm: this.ALGORITHM,
        salt: Array.from(salt),
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encryptedData)),
        timestamp: Date.now(),
      };

      // Return base64-encoded encrypted payload
      const result = btoa(JSON.stringify(encryptedPayload));
      const duration = performance.now() - startTime;

      authLogger.debug('PIN encryption completed', {
        duration: `${duration.toFixed(2)}ms`,
        resultLength: result.length,
        payloadSize: JSON.stringify(encryptedPayload).length,
      });

      return result;
    } catch (error) {
      authLogger.error(
        'PIN encryption failed',
        error instanceof Error ? error : new Error(String(error))
      );
      throw new Error(
        `PIN encryption failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Decrypts data using a PIN-derived decryption key
   * @param encryptedData - Base64-encoded encrypted data to decrypt
   * @param pin - PIN to derive decryption key from
   * @returns Promise resolving to decrypted data string
   */
  static async decrypt(encryptedData: string, pin: string): Promise<string> {
    const startTime = performance.now();

    try {
      authLogger.debug('PIN decryption started', {
        encryptedDataLength: encryptedData.length,
        pinLength: pin.length,
      });

      // Parse the encrypted payload
      const payload = JSON.parse(atob(encryptedData));

      // Validate payload format
      if (
        payload.version !== this.VERSION ||
        payload.algorithm !== this.ALGORITHM
      ) {
        const error = new Error(
          `Unsupported encrypted data format: version ${payload.version}, algorithm ${payload.algorithm}`
        );
        authLogger.error('PIN decryption failed: unsupported format', error);
        throw error;
      }

      // Extract cryptographic parameters
      const salt = new Uint8Array(payload.salt);
      const iv = new Uint8Array(payload.iv);
      const encryptedBytes = new Uint8Array(payload.data);

      // Import PIN as key material
      const keyMaterial = new TextEncoder().encode(pin);
      const baseKey = await crypto.subtle.importKey(
        'raw',
        keyMaterial,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      // Derive the same decryption key using PBKDF2
      const decryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: this.PBKDF2_ITERATIONS,
          hash: 'SHA-256',
        },
        baseKey,
        { name: 'AES-GCM', length: this.AES_KEY_LENGTH },
        false,
        ['decrypt']
      );

      // Decrypt the data
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        decryptionKey,
        encryptedBytes
      );

      // Convert decrypted bytes to string
      const result = new TextDecoder().decode(decryptedData);
      const duration = performance.now() - startTime;

      authLogger.debug('PIN decryption completed', {
        duration: `${duration.toFixed(2)}ms`,
        resultLength: result.length,
      });

      return result;
    } catch (error) {
      authLogger.error(
        'PIN decryption failed',
        error instanceof Error ? error : new Error(String(error))
      );

      // Provide more specific error messages for common failure cases
      if (error instanceof Error) {
        if (error.name === 'OperationError') {
          throw new Error(
            'PIN decryption failed: incorrect PIN or corrupted data'
          );
        }
        if (error.message.includes('Unsupported encrypted data format')) {
          throw error; // Re-throw format errors as-is
        }
      }

      throw new Error(
        `PIN decryption failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Tests PIN encryption/decryption round trip
   * @param testData - Test data to encrypt and decrypt
   * @param pin - PIN to use for encryption/decryption
   * @returns Promise resolving to true if test passes, false otherwise
   */
  static async testEncryption(
    testData: string = 'test data',
    pin: string = '1234'
  ): Promise<boolean> {
    try {
      authLogger.debug('Testing PIN encryption round trip');

      // Encrypt test data
      const encrypted = await this.encrypt(testData, pin);

      // Decrypt test data
      const decrypted = await this.decrypt(encrypted, pin);

      // Verify round trip success
      const success = decrypted === testData;

      authLogger.debug('PIN encryption test completed', {
        success,
        originalLength: testData.length,
        encryptedLength: encrypted.length,
        decryptedLength: decrypted.length,
      });

      return success;
    } catch (error) {
      authLogger.error(
        'PIN encryption test failed',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  /**
   * Validates encrypted data format without decrypting
   * @param encryptedData - Base64-encoded encrypted data to validate
   * @returns true if format is valid, false otherwise
   */
  static validateEncryptedData(encryptedData: string): boolean {
    try {
      const payload = JSON.parse(atob(encryptedData));

      const isValid =
        payload.version === this.VERSION &&
        payload.algorithm === this.ALGORITHM &&
        Array.isArray(payload.salt) &&
        Array.isArray(payload.iv) &&
        Array.isArray(payload.data) &&
        typeof payload.timestamp === 'number';

      authLogger.debug('PIN encrypted data validation', {
        isValid,
        hasRequiredFields: !!(payload.salt && payload.iv && payload.data),
      });

      return isValid;
    } catch {
      authLogger.debug('PIN encrypted data validation failed: invalid format');
      return false;
    }
  }

  /**
   * Gets metadata about encrypted data without decrypting
   * @param encryptedData - Base64-encoded encrypted data
   * @returns Metadata object or null if invalid
   */
  static getEncryptedDataInfo(encryptedData: string): {
    version: number;
    algorithm: string;
    timestamp: number;
    dataSize: number;
  } | null {
    try {
      const payload = JSON.parse(atob(encryptedData));

      if (!this.validateEncryptedData(encryptedData)) {
        return null;
      }

      return {
        version: payload.version,
        algorithm: payload.algorithm,
        timestamp: payload.timestamp,
        dataSize: payload.data.length,
      };
    } catch {
      authLogger.debug('Failed to get encrypted data info');
      return null;
    }
  }
}
