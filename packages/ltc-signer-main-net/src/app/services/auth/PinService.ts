import { authLogger } from '../../../utils/auth/authLogger';

/**
 * Service class for PIN-based authentication operations
 * Handles PIN validation, hashing, verification, and storage operations
 */
export class PinService {
  private static readonly PIN_LENGTH = 4;
  private static readonly PIN_PATTERN = /^\d{4}$/;
  private static readonly STORAGE_KEY = 'ltc-signer-pin';

  /**
   * Validates PIN format (4-digit numeric)
   * @param pin - PIN to validate
   * @returns true if valid, false otherwise
   */
  static validatePin(pin: string): boolean {
    const isValid = this.PIN_PATTERN.test(pin);
    authLogger.debug('PIN validation', {
      pinLength: pin.length,
      isValid,
      pattern: this.PIN_PATTERN.source,
    });
    return isValid;
  }

  /**
   * Validates PIN authentication (PIN and confirmation match)
   * @param pin - PIN to set
   * @param confirmPin - PIN confirmation
   * @returns ValidationResult object
   */
  static validatePinAuth(
    pin: string,
    confirmPin: string
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const startTime = performance.now();

    try {
      // Validate PIN format
      if (!this.validatePin(pin)) {
        errors.push(`PIN must be exactly ${this.PIN_LENGTH} digits`);
      }

      // Validate confirmation matches
      if (pin !== confirmPin) {
        errors.push('PIN and confirmation do not match');
      }

      // Additional validation rules
      if (pin.length === 0) {
        errors.push('PIN cannot be empty');
      }

      if (confirmPin.length === 0) {
        errors.push('PIN confirmation cannot be empty');
      }

      // Check for repeated digits (weak PIN)
      if (pin && /^(\d)\1{3}$/.test(pin)) {
        errors.push('PIN cannot be all the same digit');
      }

      // Check for sequential digits (weak PIN)
      if (pin && /(0123|1234|2345|3456|4567|5678|6789|7890)/.test(pin)) {
        errors.push('PIN cannot be sequential digits');
      }

      const isValid = errors.length === 0;
      const duration = performance.now() - startTime;

      authLogger.debug('PIN authentication validation', {
        isValid,
        errorCount: errors.length,
        duration: `${duration.toFixed(2)}ms`,
      });

      return { isValid, errors };
    } catch (error) {
      authLogger.error(
        'PIN authentication validation failed',
        error instanceof Error ? error : new Error(String(error))
      );
      return {
        isValid: false,
        errors: ['PIN validation failed due to an unexpected error'],
      };
    }
  }

  /**
   * Securely hashes a PIN using PBKDF2
   * @param pin - PIN to hash
   * @returns Promise resolving to hashed PIN string
   */
  static async hashPin(pin: string): Promise<string> {
    const startTime = performance.now();

    try {
      if (!this.validatePin(pin)) {
        throw new Error(
          `Invalid PIN format: must be ${this.PIN_LENGTH} digits`
        );
      }

      // Generate salt
      const salt = new Uint8Array(16);
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

      // Derive key for hashing
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        baseKey,
        { name: 'HMAC', hash: 'SHA-256' },
        true,
        ['sign']
      );

      // Export key as hash
      const hash = await crypto.subtle.exportKey('raw', derivedKey);
      const hashArray = new Uint8Array(hash);

      // Create hash payload with metadata
      const hashedPin = {
        version: 1,
        algorithm: 'pin-pbkdf2-sha256',
        salt: Array.from(salt),
        hash: Array.from(hashArray),
        timestamp: Date.now(),
      };

      const result = btoa(JSON.stringify(hashedPin));
      const duration = performance.now() - startTime;

      authLogger.debug('PIN hashing completed', {
        duration: `${duration.toFixed(2)}ms`,
        hashLength: result.length,
      });

      return result;
    } catch (error) {
      authLogger.error(
        'PIN hashing failed',
        error instanceof Error ? error : new Error(String(error))
      );
      throw new Error(
        `PIN hashing failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Verifies a PIN against a hashed PIN
   * @param pin - PIN to verify
   * @param hashedPin - Previously hashed PIN
   * @returns Promise resolving to boolean indicating if PIN matches
   */
  static async verifyPin(pin: string, hashedPin: string): Promise<boolean> {
    const startTime = performance.now();

    try {
      if (!this.validatePin(pin)) {
        authLogger.debug('PIN verification failed: invalid PIN format');
        return false;
      }

      // Parse hashed PIN payload
      const payload = JSON.parse(atob(hashedPin));

      if (payload.version !== 1 || payload.algorithm !== 'pin-pbkdf2-sha256') {
        authLogger.error(
          `Unsupported hashed PIN format: version ${payload.version}, algorithm ${payload.algorithm}`
        );
        return false;
      }

      // Hash the input PIN with the same salt
      const salt = new Uint8Array(payload.salt);
      const keyMaterial = new TextEncoder().encode(pin);
      const baseKey = await crypto.subtle.importKey(
        'raw',
        keyMaterial,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        baseKey,
        { name: 'HMAC', hash: 'SHA-256' },
        true,
        ['sign']
      );

      const hash = await crypto.subtle.exportKey('raw', derivedKey);
      const hashArray = new Uint8Array(hash);

      // Compare hashes
      const storedHash = new Uint8Array(payload.hash);
      const hashesMatch =
        hashArray.length === storedHash.length &&
        hashArray.every((byte, index) => byte === storedHash[index]);

      const duration = performance.now() - startTime;

      authLogger.debug('PIN verification completed', {
        matches: hashesMatch,
        duration: `${duration.toFixed(2)}ms`,
      });

      return hashesMatch;
    } catch (error) {
      authLogger.error(
        'PIN verification failed',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  /**
   * Saves PIN authentication data to localStorage
   * @param pinAuth - PIN authentication data to save
   */
  static savePinAuth(pinAuth: { pin: string; confirmPin: string }): void {
    try {
      if (typeof window === 'undefined') {
        authLogger.debug('Cannot save PIN auth: window not available');
        return;
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(pinAuth));
      authLogger.debug('PIN auth saved to localStorage');
    } catch (error) {
      authLogger.error(
        'Failed to save PIN auth to localStorage',
        error instanceof Error ? error : new Error(String(error))
      );
      throw new Error('Failed to save PIN authentication data');
    }
  }

  /**
   * Loads PIN authentication data from localStorage
   * @returns PIN authentication data or default empty object
   */
  static loadPinAuth(): { pin: string; confirmPin: string } {
    try {
      if (typeof window === 'undefined') {
        authLogger.debug('Cannot load PIN auth: window not available');
        return { pin: '', confirmPin: '' };
      }

      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) {
        authLogger.debug('No PIN auth found in localStorage');
        return { pin: '', confirmPin: '' };
      }

      const parsed = JSON.parse(saved);
      authLogger.debug('PIN auth loaded from localStorage');

      return {
        pin: parsed.pin || '',
        confirmPin: parsed.confirmPin || '',
      };
    } catch (error) {
      authLogger.error(
        'Failed to load PIN auth from localStorage',
        error instanceof Error ? error : new Error(String(error))
      );
      return { pin: '', confirmPin: '' };
    }
  }

  /**
   * Clears PIN authentication data from localStorage
   */
  static clearPinAuth(): void {
    try {
      if (typeof window === 'undefined') {
        authLogger.debug('Cannot clear PIN auth: window not available');
        return;
      }

      localStorage.removeItem(this.STORAGE_KEY);
      authLogger.debug('PIN auth cleared from localStorage');
    } catch (error) {
      authLogger.error(
        'Failed to clear PIN auth from localStorage',
        error instanceof Error ? error : new Error(String(error))
      );
      // Don't throw here as clearing is often done during cleanup
    }
  }

  /**
   * Verifies PIN matches stored PIN (simple comparison for session verification)
   * @param inputPin - PIN to verify
   * @param storedPin - Stored PIN to compare against
   * @returns true if PINs match, false otherwise
   */
  static verifyPinMatch(inputPin: string, storedPin: string): boolean {
    const matches = inputPin === storedPin;
    authLogger.debug('PIN match verification', {
      inputLength: inputPin.length,
      storedLength: storedPin.length,
      matches,
    });
    return matches;
  }
}
