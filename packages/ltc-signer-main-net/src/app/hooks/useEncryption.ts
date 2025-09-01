import { useCallback, useMemo } from 'react';
import { PasskeyEncryptionService } from '../services/encryption/PasskeyEncryptionService';
import { PinEncryptionService } from '../services/encryption/PinEncryptionService';
import { authLogger } from '../../utils/auth/authLogger';
import { useAuthState } from './useAuthState';
import { FEATURES } from '../config/features';

/**
 * Unified encryption hook for offline PWA wallet
 *
 * Provides a single interface for both passkey and PIN-based encryption operations.
 * All operations work completely offline using the Web Crypto API, making it
 * perfect for air-gapped wallet scenarios.
 *
 * Features:
 * - Unified interface for passkey and PIN encryption
 * - Complete offline operation (no network calls)
 * - Web Crypto API integration for hardware-backed security
 * - Comprehensive error handling and recovery
 * - Performance monitoring
 * - PWA-compatible (works when installed as standalone app)
 */
export const useEncryption = () => {
  const { authState } = useAuthState();

  /**
   * Encrypt data using the appropriate method based on current auth state
   * - If authenticated with passkey: uses passkey-based encryption
   * - If authenticated with PIN: uses PIN-based encryption
   *
   * @param data - Data to encrypt
   * @param pin - PIN to use for PIN-based encryption (ignored for passkey)
   * @returns Promise resolving to base64-encoded encrypted data
   */
  const encryptData = useCallback(
    async (data: string, pin?: string): Promise<string> => {
      const startTime = performance.now();

      try {
        authLogger.debug('useEncryption.encryptData called', {
          dataLength: data.length,
          method: authState.method,
          hasCredential: !!authState.credentialId,
          hasPin: !!pin,
        });

        if (!data) {
          throw new Error('No data provided for encryption');
        }

        let result: string;

        // Choose encryption method based on auth state
        if (authState.method === 'passkey' && authState.credentialId) {
          authLogger.debug('Using passkey encryption');
          result = await PasskeyEncryptionService.encrypt(
            data,
            authState.credentialId
          );
        } else if (authState.method === 'pin' && pin) {
          authLogger.debug('Using PIN encryption');
          result = await PinEncryptionService.encrypt(data, pin);
        } else {
          throw new Error(
            `No valid encryption method available. Auth method: ${
              authState.method
            }, hasCredential: ${!!authState.credentialId}, hasPin: ${!!pin}`
          );
        }

        const duration = performance.now() - startTime;
        authLogger.performance('encryptData', duration);
        authLogger.debug('Encryption completed successfully', {
          duration: `${duration.toFixed(2)}ms`,
          resultLength: result.length,
        });

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        authLogger.error(
          `useEncryption.encryptData failed: ${
            error instanceof Error ? error.message : String(error)
          } (${duration.toFixed(2)}ms, method: ${
            authState.method
          }, credential: ${!!authState.credentialId})`,
          error instanceof Error ? error : undefined
        );

        throw error;
      }
    },
    [authState.method, authState.credentialId]
  );

  /**
   * Decrypt data using the appropriate method based on current auth state
   * - If authenticated with passkey: uses passkey-based decryption
   * - If authenticated with PIN: uses PIN-based decryption
   *
   * @param encryptedData - Base64-encoded encrypted data to decrypt
   * @param pin - PIN to use for PIN-based decryption (ignored for passkey)
   * @returns Promise resolving to decrypted data string
   */
  const decryptData = useCallback(
    async (encryptedData: string, pin?: string): Promise<string> => {
      const startTime = performance.now();

      try {
        authLogger.debug('useEncryption.decryptData called', {
          encryptedDataLength: encryptedData.length,
          method: authState.method,
          hasCredential: !!authState.credentialId,
          hasPin: !!pin,
        });

        if (!encryptedData) {
          throw new Error('No encrypted data provided for decryption');
        }

        let result: string;

        // Choose decryption method based on auth state
        if (authState.method === 'passkey' && authState.credentialId) {
          authLogger.debug('Using passkey decryption');
          result = await PasskeyEncryptionService.decrypt(
            encryptedData,
            authState.credentialId
          );
        } else if (authState.method === 'pin' && pin) {
          authLogger.debug('Using PIN decryption');
          result = await PinEncryptionService.decrypt(encryptedData, pin);
        } else {
          throw new Error(
            `No valid decryption method available. Auth method: ${
              authState.method
            }, hasCredential: ${!!authState.credentialId}, hasPin: ${!!pin}`
          );
        }

        const duration = performance.now() - startTime;
        authLogger.performance('decryptData', duration);
        authLogger.debug('Decryption completed successfully', {
          duration: `${duration.toFixed(2)}ms`,
          resultLength: result.length,
        });

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        authLogger.error(
          `useEncryption.decryptData failed: ${
            error instanceof Error ? error.message : String(error)
          } (${duration.toFixed(2)}ms, method: ${
            authState.method
          }, credential: ${!!authState.credentialId})`,
          error instanceof Error ? error : undefined
        );

        throw error;
      }
    },
    [authState.method, authState.credentialId]
  );

  /**
   * Encrypt data using passkey-based encryption
   * Requires the user to be authenticated with a passkey
   *
   * @param data - Data to encrypt
   * @returns Promise resolving to base64-encoded encrypted data
   */
  const encryptWithPasskey = useCallback(
    async (data: string): Promise<string> => {
      if (!authState.credentialId) {
        throw new Error('No passkey credential available for encryption');
      }

      if (authState.method !== 'passkey') {
        throw new Error('Not authenticated with passkey method');
      }

      return await PasskeyEncryptionService.encrypt(
        data,
        authState.credentialId
      );
    },
    [authState.credentialId, authState.method]
  );

  /**
   * Decrypt data using passkey-based decryption
   * Requires the user to be authenticated with a passkey
   *
   * @param encryptedData - Base64-encoded encrypted data to decrypt
   * @returns Promise resolving to decrypted data string
   */
  const decryptWithPasskey = useCallback(
    async (encryptedData: string): Promise<string> => {
      if (!authState.credentialId) {
        throw new Error('No passkey credential available for decryption');
      }

      if (authState.method !== 'passkey') {
        throw new Error('Not authenticated with passkey method');
      }

      return await PasskeyEncryptionService.decrypt(
        encryptedData,
        authState.credentialId
      );
    },
    [authState.credentialId, authState.method]
  );

  /**
   * Encrypt data using PIN-based encryption
   *
   * @param data - Data to encrypt
   * @param pin - PIN to use for encryption
   * @returns Promise resolving to base64-encoded encrypted data
   */
  const encryptWithPin = useCallback(
    async (data: string, pin: string): Promise<string> => {
      if (!pin) {
        throw new Error('PIN is required for PIN-based encryption');
      }

      return await PinEncryptionService.encrypt(data, pin);
    },
    []
  );

  /**
   * Decrypt data using PIN-based decryption
   *
   * @param encryptedData - Base64-encoded encrypted data to decrypt
   * @param pin - PIN to use for decryption
   * @returns Promise resolving to decrypted data string
   */
  const decryptWithPin = useCallback(
    async (encryptedData: string, pin: string): Promise<string> => {
      if (!pin) {
        throw new Error('PIN is required for PIN-based decryption');
      }

      return await PinEncryptionService.decrypt(encryptedData, pin);
    },
    []
  );

  /**
   * Test encryption/decryption round trip using current auth method
   * This is useful for validating that encryption works correctly
   *
   * @param testData - Test data to encrypt/decrypt (optional, defaults to test string)
   * @param pin - PIN to use for PIN-based testing (optional, ignored for passkey)
   * @returns Promise resolving to true if test passes, false otherwise
   */
  const testEncryption = useCallback(
    async (
      testData: string = 'encryption test data',
      pin?: string
    ): Promise<boolean> => {
      try {
        authLogger.debug('useEncryption.testEncryption called', {
          testDataLength: testData.length,
          method: authState.method,
          hasCredential: !!authState.credentialId,
          hasPin: !!pin,
        });

        let success: boolean;

        if (authState.method === 'passkey' && authState.credentialId) {
          success = await PasskeyEncryptionService.testEncryption(
            authState.credentialId
          );
        } else if (authState.method === 'pin' && pin) {
          success = await PinEncryptionService.testEncryption(testData, pin);
        } else {
          authLogger.debug('No valid encryption method for testing');
          return false;
        }

        authLogger.debug('Encryption test result', { success });
        return success;
      } catch (error) {
        authLogger.error(
          `useEncryption.testEncryption failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
          error instanceof Error ? error : undefined
        );
        return false;
      }
    },
    [authState.method, authState.credentialId]
  );

  /**
   * Test passkey encryption specifically
   * Requires the user to be authenticated with a passkey
   *
   * @returns Promise resolving to true if test passes, false otherwise
   */
  const testPasskeyEncryption = useCallback(async (): Promise<boolean> => {
    if (!authState.credentialId) {
      authLogger.debug('No passkey credential available for testing');
      return false;
    }

    if (authState.method !== 'passkey') {
      authLogger.debug('Not authenticated with passkey method');
      return false;
    }

    return await PasskeyEncryptionService.testEncryption(
      authState.credentialId
    );
  }, [authState.credentialId, authState.method]);

  /**
   * Validate encrypted data format without decrypting
   * This is useful for checking if data appears to be encrypted correctly
   *
   * @param encryptedData - Base64-encoded encrypted data to validate
   * @returns true if format is valid, false otherwise
   */
  const validateEncryptedData = useCallback(
    (encryptedData: string): boolean => {
      try {
        // Try to validate as PIN-encrypted data first
        if (PinEncryptionService.validateEncryptedData(encryptedData)) {
          return true;
        }

        // If not PIN format, try to parse as passkey format
        const payload = JSON.parse(atob(encryptedData));

        // Check for passkey encryption format
        const isPasskeyFormat =
          payload.version === 1 &&
          payload.algorithm === 'passkey-aes-gcm' &&
          Array.isArray(payload.salt) &&
          Array.isArray(payload.iv) &&
          Array.isArray(payload.data) &&
          Array.isArray(payload.challenge) &&
          typeof payload.timestamp === 'number';

        return isPasskeyFormat;
      } catch {
        // If parsing fails, data is not valid encrypted format
        return false;
      }
    },
    []
  );

  /**
   * Get metadata about encrypted data without decrypting
   * Useful for displaying information about encrypted data
   *
   * @param encryptedData - Base64-encoded encrypted data
   * @returns Metadata object or null if invalid
   */
  const getEncryptedDataInfo = useCallback((encryptedData: string) => {
    try {
      // Try to get PIN encryption info first
      const pinInfo = PinEncryptionService.getEncryptedDataInfo(encryptedData);
      if (pinInfo) {
        return pinInfo;
      }

      // If not PIN format, try to parse as passkey format
      const payload = JSON.parse(atob(encryptedData));

      if (
        payload.version === 1 &&
        payload.algorithm === 'passkey-aes-gcm' &&
        Array.isArray(payload.salt) &&
        Array.isArray(payload.iv) &&
        Array.isArray(payload.data) &&
        Array.isArray(payload.challenge) &&
        typeof payload.timestamp === 'number'
      ) {
        return {
          version: payload.version,
          algorithm: payload.algorithm,
          timestamp: payload.timestamp,
          dataSize: payload.data.length,
        };
      }

      return null;
    } catch {
      return null;
    }
  }, []);

  // Memoize the hook interface to prevent unnecessary re-renders
  const encryptionInterface = useMemo(
    () => ({
      // Unified encryption methods
      encryptData,
      decryptData,
      testEncryption,

      // Passkey-specific methods
      encryptWithPasskey,
      decryptWithPasskey,
      testPasskeyEncryption,

      // PIN-specific methods
      encryptWithPin,
      decryptWithPin,

      // Utility methods
      validateEncryptedData,
      getEncryptedDataInfo,
    }),
    [
      encryptData,
      decryptData,
      testEncryption,
      encryptWithPasskey,
      decryptWithPasskey,
      testPasskeyEncryption,
      encryptWithPin,
      decryptWithPin,
      validateEncryptedData,
      getEncryptedDataInfo,
    ]
  );

  return encryptionInterface;
};

/**
 * Legacy encryption hook interface (for backward compatibility)
 * This provides the same interface as the old inline encryption functions
 */
export const useLegacyEncryption = () => {
  authLogger.debug(
    'useLegacyEncryption called - using legacy encryption interface'
  );

  // Return empty interface for now - this would need to be implemented
  // if we need to support legacy encryption functions
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    encryptWithPasskey: async (_data: string) => {
      throw new Error('Legacy encryption not implemented');
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    decryptWithPasskey: async (_encryptedData: string) => {
      throw new Error('Legacy encryption not implemented');
    },
    encryptWithPin: useCallback(
      async (data: string, pin: string): Promise<string> => {
        const startTime = performance.now();

        try {
          authLogger.debug('useEncryption.encryptWithPin called', {
            dataLength: data.length,
            pinLength: pin.length,
          });

          if (!data) {
            throw new Error('No data provided for PIN encryption');
          }

          if (!pin) {
            throw new Error('No PIN provided for PIN encryption');
          }

          const result = await PinEncryptionService.encrypt(data, pin);

          const duration = performance.now() - startTime;
          authLogger.performance('encryptWithPin', duration);
          authLogger.debug('PIN encryption completed successfully', {
            duration: `${duration.toFixed(2)}ms`,
            resultLength: result.length,
          });

          return result;
        } catch (error) {
          const duration = performance.now() - startTime;
          authLogger.error(
            `useEncryption.encryptWithPin failed: ${
              error instanceof Error ? error.message : String(error)
            } (${duration.toFixed(2)}ms)`,
            error instanceof Error ? error : undefined
          );

          throw error;
        }
      },
      []
    ),

    decryptWithPin: useCallback(
      async (encryptedData: string, pin: string): Promise<string> => {
        const startTime = performance.now();

        try {
          authLogger.debug('useEncryption.decryptWithPin called', {
            encryptedDataLength: encryptedData.length,
            pinLength: pin.length,
          });

          if (!encryptedData) {
            throw new Error('No encrypted data provided for PIN decryption');
          }

          if (!pin) {
            throw new Error('No PIN provided for PIN decryption');
          }

          const result = await PinEncryptionService.decrypt(encryptedData, pin);

          const duration = performance.now() - startTime;
          authLogger.performance('decryptWithPin', duration);
          authLogger.debug('PIN decryption completed successfully', {
            duration: `${duration.toFixed(2)}ms`,
            resultLength: result.length,
          });

          return result;
        } catch (error) {
          const duration = performance.now() - startTime;
          authLogger.error(
            `useEncryption.decryptWithPin failed: ${
              error instanceof Error ? error.message : String(error)
            } (${duration.toFixed(2)}ms)`,
            error instanceof Error ? error : undefined
          );

          throw error;
        }
      },
      []
    ),
    testPasskeyEncryption: async () => false,
    // Add missing methods to match interface
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    encryptData: async (_data: string, _pin?: string) => {
      throw new Error('Legacy encryption not implemented');
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    decryptData: async (_encryptedData: string, _pin?: string) => {
      throw new Error('Legacy encryption not implemented');
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    testEncryption: async (_testData?: string, _pin?: string) => false,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    validateEncryptedData: (_encryptedData: string) => false,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getEncryptedDataInfo: (_encryptedData: string) => null,
  };
};

/**
 * Conditional encryption hook based on feature flag
 * Use this in components to automatically switch between new and legacy encryption
 */
export const useConditionalEncryption = () => {
  // Always call hooks at the top level to follow Rules of Hooks
  const newEncryption = useEncryption();
  const legacyEncryption = useLegacyEncryption();

  // Return the appropriate interface based on feature flag
  return FEATURES.USE_ENCRYPTION_HOOK ? newEncryption : legacyEncryption;
};
