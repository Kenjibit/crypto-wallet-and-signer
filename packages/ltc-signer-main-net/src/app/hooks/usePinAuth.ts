'use client';

import { useCallback, useState, useEffect } from 'react';
import { PinService } from '../services/auth/PinService';
import { PinEncryptionService } from '../services/encryption/PinEncryptionService';
import { authLogger } from '../../utils/auth/authLogger';

/**
 * Hook for PIN-based authentication operations
 *
 * This hook provides a clean, offline-compatible interface for PIN operations
 * including validation, setting, verification, and encryption. Designed specifically
 * for air-gapped wallet usage with no external network dependencies.
 */
export interface UsePinAuthReturn {
  /** Set a new PIN with validation */
  setPinCode: (pin: string, confirmPin: string) => boolean;

  /** Verify a PIN against stored PIN */
  verifyPinCode: (pin: string) => boolean;

  /** Encrypt data using PIN-based encryption */
  encryptWithPin: (data: string, pin: string) => Promise<string>;

  /** Decrypt data using PIN-based encryption */
  decryptWithPin: (encryptedData: string, pin: string) => Promise<string>;

  /** Test PIN encryption/decryption round trip */
  testPinEncryption: (data: string, pin: string) => Promise<boolean>;

  /** Get validation result for PIN operations */
  getValidationResult: () => { isValid: boolean; errors: string[] };

  /** Loading state for async operations */
  isLoading: boolean;

  /** Last error from PIN operations */
  error: string | null;

  /** Clear any error state */
  clearError: () => void;

  /** Get current stored PIN (for verification) */
  getStoredPin: () => string;
}

export const usePinAuth = (): UsePinAuthReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
  }>({ isValid: true, errors: [] });
  const [storedPin, setStoredPin] = useState<string>('');

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getValidationResult = useCallback(() => {
    return validationResult;
  }, [validationResult]);

  const getStoredPin = useCallback(() => {
    return storedPin;
  }, [storedPin]);

  // Load PIN from localStorage on initialization
  useEffect(() => {
    authLogger.debug('usePinAuth: Loading PIN from localStorage');
    try {
      const loadedPinAuth = PinService.loadPinAuth();
      if (loadedPinAuth.pin) {
        setStoredPin(loadedPinAuth.pin);
        authLogger.debug('usePinAuth: PIN loaded from localStorage', {
          pinLength: loadedPinAuth.pin.length,
        });
      } else {
        authLogger.debug('usePinAuth: No PIN found in localStorage');
      }
    } catch (error) {
      authLogger.error(
        'usePinAuth: Failed to load PIN from localStorage',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }, []);

  /**
   * Set a new PIN with validation
   */
  const setPinCode = useCallback((pin: string, confirmPin: string): boolean => {
    authLogger.debug('usePinAuth.setPinCode called', {
      pinLength: pin.length,
      confirmPinLength: confirmPin.length,
    });

    setError(null);

    try {
      // Use PinService for comprehensive validation
      const result = PinService.validatePinAuth(pin, confirmPin);
      setValidationResult(result);

      if (result.isValid) {
        // Store the PIN for future verification
        setStoredPin(pin);

        // Save PIN to localStorage via PinService
        try {
          PinService.savePinAuth({ pin, confirmPin });
          authLogger.debug('PIN saved successfully via PinService');
        } catch (saveError) {
          const errorMsg = 'PIN validation passed but failed to save';
          authLogger.error(
            'Failed to save PIN via PinService',
            saveError instanceof Error
              ? saveError
              : new Error(String(saveError))
          );
          setError(errorMsg);
          setValidationResult({
            isValid: false,
            errors: [errorMsg],
          });
          return false;
        }

        authLogger.debug('PIN set successfully');
        return true;
      } else {
        authLogger.debug('PIN validation failed', {
          errorCount: result.errors.length,
          errors: result.errors,
        });
        setError(`PIN validation failed: ${result.errors.join(', ')}`);
        return false;
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'PIN setup failed';
      authLogger.error(
        'PIN setup failed in hook',
        error instanceof Error ? error : new Error(String(error))
      );
      setError(errorMsg);
      setValidationResult({
        isValid: false,
        errors: [errorMsg],
      });
      return false;
    }
  }, []);

  /**
   * Verify a PIN against stored PIN
   */
  const verifyPinCode = useCallback(
    (pin: string): boolean => {
      authLogger.debug('usePinAuth.verifyPinCode called', {
        pinLength: pin.length,
      });

      if (!storedPin) {
        const errorMsg = 'No PIN has been set';
        authLogger.debug(errorMsg);
        setError(errorMsg);
        return false;
      }

      setError(null);

      try {
        // Use PinService for PIN verification
        const isValid = PinService.verifyPinMatch(pin, storedPin);

        if (isValid) {
          authLogger.debug('PIN verification successful');
          return true;
        } else {
          const errorMsg = 'PIN verification failed';
          authLogger.debug(errorMsg);
          setError(errorMsg);
          return false;
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'PIN verification failed';
        authLogger.error(
          'PIN verification failed in hook',
          error instanceof Error ? error : new Error(String(error))
        );
        setError(errorMsg);
        return false;
      }
    },
    [storedPin]
  );

  /**
   * Encrypt data using PIN-based encryption
   */
  const encryptWithPin = useCallback(
    async (data: string, pin: string): Promise<string> => {
      authLogger.debug('usePinAuth.encryptWithPin called');

      if (!data) {
        throw new Error('Data to encrypt is required');
      }

      if (!pin) {
        throw new Error('PIN is required for encryption');
      }

      setIsLoading(true);
      setError(null);

      try {
        const encryptedData = await PinEncryptionService.encrypt(data, pin);
        authLogger.debug('PIN encryption successful');
        return encryptedData;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'PIN encryption failed';
        authLogger.error(
          'PIN encryption failed in hook',
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
   * Decrypt data using PIN-based encryption
   */
  const decryptWithPin = useCallback(
    async (encryptedData: string, pin: string): Promise<string> => {
      authLogger.debug('usePinAuth.decryptWithPin called');

      if (!encryptedData) {
        throw new Error('Encrypted data is required');
      }

      if (!pin) {
        throw new Error('PIN is required for decryption');
      }

      setIsLoading(true);
      setError(null);

      try {
        const decryptedData = await PinEncryptionService.decrypt(
          encryptedData,
          pin
        );
        authLogger.debug('PIN decryption successful');
        return decryptedData;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'PIN decryption failed';
        authLogger.error(
          'PIN decryption failed in hook',
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
   * Test PIN encryption/decryption round trip
   */
  const testPinEncryption = useCallback(
    async (data: string, pin: string): Promise<boolean> => {
      authLogger.debug('usePinAuth.testPinEncryption called');

      if (!data) {
        authLogger.debug('No test data provided');
        return false;
      }

      if (!pin) {
        authLogger.debug('No PIN provided for encryption test');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        const testResult = await PinEncryptionService.testEncryption(data, pin);
        authLogger.debug('PIN encryption test result', { success: testResult });
        return testResult;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'PIN encryption test failed';
        authLogger.error(
          'PIN encryption test failed in hook',
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
    setPinCode,
    verifyPinCode,
    encryptWithPin,
    decryptWithPin,
    testPinEncryption,
    getValidationResult,
    isLoading,
    error,
    clearError,
    getStoredPin,
  };
};
