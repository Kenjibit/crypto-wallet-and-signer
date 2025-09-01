import { authLogger } from '../../../utils/auth/authLogger';

export interface EncryptedPayload {
  version: number;
  algorithm: string;
  salt: number[];
  iv: number[];
  data: number[];
  timestamp: number;
  challenge: number[];
}

/**
 * Service for handling passkey-based encryption and decryption operations
 * Extracted from AuthContext to provide modular, testable encryption functionality
 */
export class PasskeyEncryptionService {
  /**
   * Encrypt data using passkey-derived keys
   */
  static async encrypt(data: string, credentialId: string): Promise<string> {
    authLogger.debug('PasskeyEncryptionService.encrypt called');

    if (!credentialId) {
      throw new Error('No passkey available for encryption');
    }

    try {
      // Generate a random challenge for encryption
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      authLogger.debug('Generated challenge for encryption', {
        challengeLength: challenge.length,
      });

      // Get the passkey signature to derive encryption key
      authLogger.debug('Requesting passkey assertion for encryption');
      const encryptionAssertionStart = performance.now();
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60000,
          allowCredentials: [
            {
              id: Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0)),
              type: 'public-key',
            },
          ],
        },
      });
      const encryptionAssertionDuration =
        performance.now() - encryptionAssertionStart;
      authLogger.performance(
        'encryption assertion',
        encryptionAssertionDuration
      );

      authLogger.debug('Received assertion', { hasAssertion: !!assertion });

      if (!assertion) {
        throw new Error('No assertion returned from navigator.credentials.get');
      }

      if (!('response' in assertion)) {
        throw new Error('Assertion does not contain response property');
      }

      // Extract the response first
      const assertionResponse =
        assertion.response as AuthenticatorAssertionResponse;

      if (!assertionResponse.signature) {
        throw new Error('Assertion response does not contain signature');
      }

      authLogger.debug('Assertion validation passed');

      // Extract the signature and response data
      const signature = new Uint8Array(assertionResponse.signature);
      const clientDataHash = await crypto.subtle.digest(
        'SHA-256',
        assertionResponse.clientDataJSON
      );
      const authenticatorData = assertionResponse.authenticatorData;

      // Combine signature data for key derivation
      const keyMaterial = new Uint8Array(
        signature.length +
          clientDataHash.byteLength +
          authenticatorData.byteLength
      );
      keyMaterial.set(signature, 0);
      keyMaterial.set(new Uint8Array(clientDataHash), signature.length);
      keyMaterial.set(
        new Uint8Array(authenticatorData),
        signature.length + clientDataHash.byteLength
      );

      // Derive encryption key using PBKDF2
      const salt = new Uint8Array(16);
      crypto.getRandomValues(salt);

      const baseKey = await crypto.subtle.importKey(
        'raw',
        keyMaterial,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      const encryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      // Generate IV
      const iv = new Uint8Array(12);
      crypto.getRandomValues(iv);

      // Encrypt the data
      const encodedData = new TextEncoder().encode(data);
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        encryptionKey,
        encodedData
      );

      // Create encrypted payload with metadata
      const encryptedPayload: EncryptedPayload = {
        version: 1,
        algorithm: 'passkey-aes-gcm',
        salt: Array.from(salt),
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encryptedData)),
        timestamp: Date.now(),
        challenge: Array.from(challenge), // Store challenge for decryption
      };

      // Return base64 encoded encrypted payload
      return btoa(JSON.stringify(encryptedPayload));
    } catch (error) {
      authLogger.error(
        'Passkey encryption failed',
        error instanceof Error ? error : new Error(String(error))
      );

      // Log detailed error information
      if (error instanceof Error) {
        authLogger.error('Error details', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });

        // Handle specific WebAuthn errors
        if (error.name === 'NotAllowedError') {
          throw new Error(
            'Passkey encryption was cancelled or timed out. Please try again.'
          );
        } else if (error.name === 'InvalidStateError') {
          throw new Error(
            'Passkey not found on this device. Please re-authenticate.'
          );
        } else if (error.name === 'AbortError') {
          throw new Error('Passkey encryption was aborted. Please try again.');
        }
      }

      throw new Error(
        `Passkey encryption failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Decrypt data using passkey-derived keys
   */
  static async decrypt(
    encryptedData: string,
    credentialId: string
  ): Promise<string> {
    authLogger.debug('PasskeyEncryptionService.decrypt called');

    if (!credentialId) {
      throw new Error('No passkey available for decryption');
    }

    try {
      // Parse the encrypted payload
      const payload: EncryptedPayload = JSON.parse(atob(encryptedData));

      if (payload.version !== 1 || payload.algorithm !== 'passkey-aes-gcm') {
        throw new Error('Unsupported encrypted data format');
      }

      // Use the same challenge that was used during encryption
      const challenge = new Uint8Array(payload.challenge);

      // Get the passkey signature to derive the same encryption key
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60000,
          allowCredentials: [
            {
              id: Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0)),
              type: 'public-key',
            },
          ],
        },
      });

      if (!assertion) {
        throw new Error('No assertion returned for decryption');
      }

      if (!('response' in assertion)) {
        throw new Error('Assertion does not contain response property');
      }

      // Extract the response first
      const assertionResponse =
        assertion.response as AuthenticatorAssertionResponse;

      if (!assertionResponse.signature) {
        throw new Error('Assertion response does not contain signature');
      }

      // Extract the signature and response data
      const signature = new Uint8Array(assertionResponse.signature);
      const clientDataHash = await crypto.subtle.digest(
        'SHA-256',
        assertionResponse.clientDataJSON
      );
      const authenticatorData = assertionResponse.authenticatorData;

      // Reconstruct the same key material used during encryption
      const keyMaterial = new Uint8Array(
        signature.length +
          clientDataHash.byteLength +
          authenticatorData.byteLength
      );
      keyMaterial.set(signature, 0);
      keyMaterial.set(new Uint8Array(clientDataHash), signature.length);
      keyMaterial.set(
        new Uint8Array(authenticatorData),
        signature.length + clientDataHash.byteLength
      );

      // Derive the same encryption key using the stored salt
      const salt = new Uint8Array(payload.salt);
      const baseKey = await crypto.subtle.importKey(
        'raw',
        keyMaterial,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      const decryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      // Decrypt the data using the stored IV
      const iv = new Uint8Array(payload.iv);
      const data = new Uint8Array(payload.data);

      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        decryptionKey,
        data
      );

      // Return the decrypted string
      return new TextDecoder().decode(decryptedData);
    } catch (error) {
      authLogger.error(
        'Passkey decryption failed',
        error instanceof Error ? error : new Error(String(error))
      );
      throw new Error(
        `Passkey decryption failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Test passkey encryption/decryption round trip
   */
  static async testEncryption(credentialId: string): Promise<boolean> {
    try {
      const testData = 'Test wallet data for passkey encryption';
      authLogger.debug('Testing passkey encryption', {
        dataLength: testData.length,
      });

      // Encrypt the test data (this will prompt for passkey)
      authLogger.debug('Encrypting test data');
      const encrypted = await this.encrypt(testData, credentialId);
      authLogger.debug('Data encrypted successfully');

      // Decrypt the test data (this will prompt for passkey again)
      authLogger.debug('Decrypting test data');
      const decrypted = await this.decrypt(encrypted, credentialId);
      authLogger.debug('Data decrypted successfully');

      const success = decrypted === testData;
      authLogger.debug('Passkey encryption test result', {
        success,
        dataLength: testData.length,
      });

      return success;
    } catch (error) {
      authLogger.error(
        'Passkey encryption test failed',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }
}
