'use client';

import { useCallback, useState } from 'react';
import { PasskeyService } from '../services/auth/PasskeyService';
import { PasskeyEncryptionService } from '../services/encryption/PasskeyEncryptionService';
import { authLogger } from '../../utils/auth/authLogger';

/**
 * Hook for passkey authentication operations
 *
 * This hook provides a clean, offline-compatible interface for passkey operations
 * including creation, verification, and existence checking. Designed specifically
 * for air-gapped wallet usage with no external network dependencies.
 */
export interface UsePasskeyAuthReturn {
  /** Create a new passkey credential */
  createPasskey: (
    username: string,
    displayName: string
  ) => Promise<{ success: boolean; credentialId?: string }>;

  /** Verify an existing passkey credential */
  verifyPasskey: (credentialId?: string) => Promise<boolean>;

  /** Check if a credential exists and is valid */
  verifyCredentialExists: (credentialId: string) => Promise<boolean>;

  /** Encrypt data using passkey-based encryption */
  encryptWithPasskey: (data: string, credentialId: string) => Promise<string>;

  /** Decrypt data using passkey-based encryption */
  decryptWithPasskey: (
    encryptedData: string,
    credentialId: string
  ) => Promise<string>;

  /** Test passkey encryption/decryption round trip */
  testPasskeyEncryption: (credentialId: string) => Promise<boolean>;

  /** Loading state for async operations */
  isLoading: boolean;

  /** Last error from passkey operations */
  error: string | null;

  /** Clear any error state */
  clearError: () => void;
}

export const usePasskeyAuth = (): UsePasskeyAuthReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Create a new passkey credential
   */
  const createPasskey = useCallback(
    async (
      username: string,
      displayName: string
    ): Promise<{ success: boolean; credentialId?: string }> => {
      authLogger.debug('usePasskeyAuth.createPasskey called', {
        username,
        displayName,
      });

      if (!username || !displayName) {
        const errorMsg = 'Username and display name are required';
        authLogger.error(errorMsg);
        setError(errorMsg);
        return { success: false };
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await PasskeyService.createCredential(
          username,
          displayName
        );

        if (result.credential && result.credentialId) {
          authLogger.debug('Passkey created successfully', {
            credentialId: result.credentialId.substring(0, 10) + '...',
          });
          return { success: true, credentialId: result.credentialId };
        } else {
          const errorMsg = 'Passkey creation failed: No credential returned';
          authLogger.error(errorMsg);
          setError(errorMsg);
          return { success: false };
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Passkey creation failed';
        authLogger.error(
          'Passkey creation failed in hook',
          error instanceof Error ? error : new Error(String(error))
        );
        setError(errorMsg);
        return { success: false };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Verify an existing passkey credential
   */
  const verifyPasskey = useCallback(
    async (credentialId?: string): Promise<boolean> => {
      authLogger.debug('usePasskeyAuth.verifyPasskey called', {
        hasCredentialId: !!credentialId,
      });

      setIsLoading(true);
      setError(null);

      try {
        const result = await PasskeyService.verifyCredential(credentialId);

        if (result.success && result.authenticated) {
          authLogger.debug('Passkey verification successful');
          return true;
        } else {
          const errorMsg = 'Passkey verification failed';
          authLogger.debug(errorMsg);
          setError(errorMsg);
          return false;
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? error.message
            : 'Passkey verification failed';
        authLogger.error(
          'Passkey verification failed in hook',
          error instanceof Error ? error : new Error(String(error))
        );
        setError(errorMsg);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Check if a credential exists and is valid
   */
  const verifyCredentialExists = useCallback(
    async (credentialId: string): Promise<boolean> => {
      authLogger.debug('usePasskeyAuth.verifyCredentialExists called', {
        credentialId: credentialId.substring(0, 10) + '...',
      });

      if (!credentialId) {
        authLogger.debug('No credential ID provided');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        const exists = await PasskeyService.verifyCredentialExists(
          credentialId
        );
        authLogger.debug('Credential existence check result', { exists });
        return exists;
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? error.message
            : 'Credential existence check failed';
        authLogger.error(
          'Credential existence check failed in hook',
          error instanceof Error ? error : new Error(String(error))
        );
        setError(errorMsg);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Encrypt data using passkey-based encryption
   */
  const encryptWithPasskey = useCallback(
    async (data: string, credentialId: string): Promise<string> => {
      authLogger.debug('usePasskeyAuth.encryptWithPasskey called');

      if (!data) {
        throw new Error('Data to encrypt is required');
      }

      if (!credentialId) {
        throw new Error('Credential ID is required for encryption');
      }

      setIsLoading(true);
      setError(null);

      try {
        const encryptedData = await PasskeyEncryptionService.encrypt(
          data,
          credentialId
        );
        authLogger.debug('Passkey encryption successful');
        return encryptedData;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Passkey encryption failed';
        authLogger.error(
          'Passkey encryption failed in hook',
          error instanceof Error ? error : new Error(String(error))
        );
        setError(errorMsg);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Decrypt data using passkey-based encryption
   */
  const decryptWithPasskey = useCallback(
    async (encryptedData: string, credentialId: string): Promise<string> => {
      authLogger.debug('usePasskeyAuth.decryptWithPasskey called');

      if (!encryptedData) {
        throw new Error('Encrypted data is required');
      }

      if (!credentialId) {
        throw new Error('Credential ID is required for decryption');
      }

      setIsLoading(true);
      setError(null);

      try {
        const decryptedData = await PasskeyEncryptionService.decrypt(
          encryptedData,
          credentialId
        );
        authLogger.debug('Passkey decryption successful');
        return decryptedData;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Passkey decryption failed';
        authLogger.error(
          'Passkey decryption failed in hook',
          error instanceof Error ? error : new Error(String(error))
        );
        setError(errorMsg);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Test passkey encryption/decryption round trip
   */
  const testPasskeyEncryption = useCallback(
    async (credentialId: string): Promise<boolean> => {
      authLogger.debug('usePasskeyAuth.testPasskeyEncryption called');

      if (!credentialId) {
        authLogger.debug('No credential ID provided for encryption test');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        const testResult = await PasskeyEncryptionService.testEncryption(
          credentialId
        );
        authLogger.debug('Passkey encryption test result', {
          success: testResult,
        });
        return testResult;
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? error.message
            : 'Passkey encryption test failed';
        authLogger.error(
          'Passkey encryption test failed in hook',
          error instanceof Error ? error : new Error(String(error))
        );
        setError(errorMsg);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    createPasskey,
    verifyPasskey,
    verifyCredentialExists,
    encryptWithPasskey,
    decryptWithPasskey,
    testPasskeyEncryption,
    isLoading,
    error,
    clearError,
  };
};
