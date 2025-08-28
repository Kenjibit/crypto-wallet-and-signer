import { walletDB, EncryptionMetadata } from './wallet-database';

// Encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  pbkdf2Iterations: 100000,
  saltLength: 32,
  ivLength: 12,
  tagLength: 128,
} as const;

export class WalletEncryption {
  /**
   * Generate a random salt for key derivation
   */
  private static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.saltLength));
  }

  /**
   * Generate a random initialization vector
   */
  private static generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.ivLength));
  }

  /**
   * Derive encryption key from PIN using PBKDF2
   */
  private static async deriveKeyFromPIN(
    pin: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const pinBuffer = encoder.encode(pin);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      pinBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: ENCRYPTION_CONFIG.pbkdf2Iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: ENCRYPTION_CONFIG.algorithm,
        length: ENCRYPTION_CONFIG.keyLength,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Derive encryption key from passkey signature
   */
  private static async deriveKeyFromPasskey(
    signature: ArrayBuffer,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      signature,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: ENCRYPTION_CONFIG.pbkdf2Iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: ENCRYPTION_CONFIG.algorithm,
        length: ENCRYPTION_CONFIG.keyLength,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data using PIN-based authentication
   */
  static async encryptWithPIN(
    data: string,
    pin: string,
    walletId: number
  ): Promise<{ encryptedData: string; salt: string; iv: string }> {
    try {
      const salt = this.generateSalt();
      const iv = this.generateIV();
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      const key = await this.deriveKeyFromPIN(pin, salt);

      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: ENCRYPTION_CONFIG.algorithm,
          iv: iv,
          tagLength: ENCRYPTION_CONFIG.tagLength,
        },
        key,
        dataBuffer
      );

      // Save encryption metadata to database
      const metadata: Omit<EncryptionMetadata, 'id'> = {
        walletId,
        algorithm: ENCRYPTION_CONFIG.algorithm,
        keyDerivation: 'PBKDF2',
        salt: btoa(String.fromCharCode(...salt)),
        iterations: ENCRYPTION_CONFIG.pbkdf2Iterations,
        createdAt: new Date(),
      };

      await walletDB.encryptionMetadata.add(metadata);

      return {
        encryptedData: btoa(
          String.fromCharCode(...new Uint8Array(encryptedBuffer))
        ),
        salt: btoa(String.fromCharCode(...salt)),
        iv: btoa(String.fromCharCode(...iv)),
      };
    } catch (error) {
      console.error('❌ PIN encryption failed:', error);
      throw new Error(
        `PIN encryption failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Decrypt data using PIN-based authentication
   */
  static async decryptWithPIN(
    encryptedData: string,
    pin: string,
    walletId: number
  ): Promise<string> {
    try {
      // Get encryption metadata from database
      const metadata = await walletDB.encryptionMetadata
        .where('walletId')
        .equals(walletId)
        .first();

      if (!metadata) {
        throw new Error('Encryption metadata not found for wallet');
      }

      const salt = Uint8Array.from(atob(metadata.salt), (c) => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(encryptedData.split('.')[1] || ''), (c) =>
        c.charCodeAt(0)
      );
      const encryptedBuffer = Uint8Array.from(
        atob(encryptedData.split('.')[0] || ''),
        (c) => c.charCodeAt(0)
      );

      const key = await this.deriveKeyFromPIN(pin, salt);

      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: ENCRYPTION_CONFIG.algorithm,
          iv: iv,
          tagLength: ENCRYPTION_CONFIG.tagLength,
        },
        key,
        encryptedBuffer
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('❌ PIN decryption failed:', error);
      throw new Error(
        `PIN decryption failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Encrypt data using passkey-based authentication
   */
  static async encryptWithPasskey(
    data: string,
    signature: ArrayBuffer,
    walletId: number
  ): Promise<{ encryptedData: string; salt: string; iv: string }> {
    try {
      const salt = this.generateSalt();
      const iv = this.generateIV();
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      const key = await this.deriveKeyFromPasskey(signature, salt);

      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: ENCRYPTION_CONFIG.algorithm,
          iv: iv,
          tagLength: ENCRYPTION_CONFIG.tagLength,
        },
        key,
        dataBuffer
      );

      // Save encryption metadata to database
      const metadata: Omit<EncryptionMetadata, 'id'> = {
        walletId,
        algorithm: ENCRYPTION_CONFIG.algorithm,
        keyDerivation: 'PBKDF2',
        salt: btoa(String.fromCharCode(...salt)),
        iterations: ENCRYPTION_CONFIG.pbkdf2Iterations,
        createdAt: new Date(),
      };

      await walletDB.encryptionMetadata.add(metadata);

      return {
        encryptedData: btoa(
          String.fromCharCode(...new Uint8Array(encryptedBuffer))
        ),
        salt: btoa(String.fromCharCode(...salt)),
        iv: btoa(String.fromCharCode(...iv)),
      };
    } catch (error) {
      console.error('❌ Passkey encryption failed:', error);
      throw new Error(
        `Passkey encryption failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Decrypt data using passkey-based authentication
   */
  static async decryptWithPasskey(
    encryptedData: string,
    signature: ArrayBuffer,
    walletId: number
  ): Promise<string> {
    try {
      // Get encryption metadata from database
      const metadata = await walletDB.encryptionMetadata
        .where('walletId')
        .equals(walletId)
        .first();

      if (!metadata) {
        throw new Error('Encryption metadata not found for wallet');
      }

      const salt = Uint8Array.from(atob(metadata.salt), (c) => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(encryptedData.split('.')[1] || ''), (c) =>
        c.charCodeAt(0)
      );
      const encryptedBuffer = Uint8Array.from(
        atob(encryptedData.split('.')[0] || ''),
        (c) => c.charCodeAt(0)
      );

      const key = await this.deriveKeyFromPasskey(signature, salt);

      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: ENCRYPTION_CONFIG.algorithm,
          iv: iv,
          tagLength: ENCRYPTION_CONFIG.tagLength,
        },
        key,
        encryptedBuffer
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('❌ Passkey decryption failed:', error);
      throw new Error(
        `Passkey decryption failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Test encryption/decryption functionality
   */
  static async testEncryption(): Promise<boolean> {
    try {
      const testData = 'Test wallet data for encryption';
      const testPIN = '123456';
      const testWalletId = 999; // Temporary ID for testing

      // Test PIN encryption
      const encrypted = await this.encryptWithPIN(
        testData,
        testPIN,
        testWalletId
      );
      const decrypted = await this.decryptWithPIN(
        encrypted.encryptedData,
        testPIN,
        testWalletId
      );

      const success = decrypted === testData;
      console.log(`🧪 Encryption test: ${success ? '✅ PASSED' : '❌ FAILED'}`);

      // Clean up test metadata
      await walletDB.encryptionMetadata
        .where('walletId')
        .equals(testWalletId)
        .delete();

      return success;
    } catch (error) {
      console.error('🧪 Encryption test failed:', error);
      return false;
    }
  }
}

// Export encryption configuration
export { ENCRYPTION_CONFIG };

