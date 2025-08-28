/**
 * Wallet Import Validation Utilities
 * Validates mnemonic phrases and private keys for wallet import
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a mnemonic phrase for wallet import
 */
export function validateMnemonic(mnemonic: string): ValidationResult {
  const errors: string[] = [];

  // Check if mnemonic is empty
  if (!mnemonic || !mnemonic.trim()) {
    errors.push('Mnemonic phrase is required');
    return { isValid: false, errors };
  }

  const trimmedMnemonic = mnemonic.trim();

  // Split into words and validate
  const words = trimmedMnemonic.split(/\s+/);

  // Check word count (BIP39 supports 12, 15, 18, 21, 24 words)
  const validWordCounts = [12, 15, 18, 21, 24];
  if (!validWordCounts.includes(words.length)) {
    errors.push(
      `Invalid word count: ${words.length}. Expected 12, 15, 18, 21, or 24 words`
    );
  }

  // Check for empty words
  if (words.some((word) => !word)) {
    errors.push('Mnemonic phrase contains empty words');
  }

  // Basic word format validation (letters only, no special characters except hyphens)
  const invalidWords = words.filter((word) => !/^[a-zA-Z-]+$/.test(word));
  if (invalidWords.length > 0) {
    errors.push(
      `Invalid word format: ${invalidWords.slice(0, 3).join(', ')}${
        invalidWords.length > 3 ? '...' : ''
      }`
    );
  }

  // Check for duplicate words (common mistake)
  const uniqueWords = new Set(words);
  if (uniqueWords.size !== words.length) {
    errors.push('Mnemonic phrase contains duplicate words');
  }

  // Check minimum word length (BIP39 words are at least 3 characters)
  const shortWords = words.filter((word) => word.length < 3);
  if (shortWords.length > 0) {
    errors.push(
      `Some words are too short: ${shortWords.slice(0, 3).join(', ')}${
        shortWords.length > 3 ? '...' : ''
      }`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a private key for wallet import
 */
export function validatePrivateKey(privateKey: string): ValidationResult {
  const errors: string[] = [];

  // Check if private key is empty
  if (!privateKey || !privateKey.trim()) {
    errors.push('Private key is required');
    return { isValid: false, errors };
  }

  const trimmedKey = privateKey.trim();

  // Check length - WIF format private keys are typically 51 or 52 characters
  if (trimmedKey.length < 51 || trimmedKey.length > 52) {
    errors.push(
      `Invalid private key length: ${trimmedKey.length} characters. Expected 51 or 52 characters for WIF format`
    );
  }

  // Check if it matches base58 format (WIF uses base58 encoding)
  const base58Regex =
    /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
  if (!base58Regex.test(trimmedKey)) {
    errors.push(
      'Private key contains invalid characters. WIF format uses only base58 characters'
    );
  }

  // Basic WIF validation - should start with specific prefixes
  if (trimmedKey.length >= 1) {
    const firstChar = trimmedKey[0];
    // Litecoin mainnet WIF starts with 'T' (0xb0), testnet with 'c' (0xef)
    if (!['T', 'c', 'L', 'K'].includes(firstChar)) {
      errors.push('Private key does not appear to be in valid WIF format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a passphrase for wallet import
 */
export function validatePassphrase(passphrase: string): ValidationResult {
  const errors: string[] = [];

  // Passphrase is optional, so empty is valid
  if (!passphrase) {
    return { isValid: true, errors: [] };
  }

  // Check maximum length (arbitrary but reasonable limit)
  if (passphrase.length > 256) {
    errors.push('Passphrase is too long (maximum 256 characters)');
  }

  // Check for control characters
  if (/[\x00-\x1F\x7F]/.test(passphrase)) {
    errors.push('Passphrase contains invalid control characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Comprehensive validation for wallet import data
 */
export function validateImportData(data: {
  type: 'mnemonic' | 'private-key';
  mnemonic?: string;
  privateKey?: string;
  passphrase?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (data.type === 'mnemonic') {
    if (!data.mnemonic) {
      errors.push('Mnemonic is required for mnemonic import');
    } else {
      const mnemonicValidation = validateMnemonic(data.mnemonic);
      errors.push(...mnemonicValidation.errors);
    }
  } else if (data.type === 'private-key') {
    if (!data.privateKey) {
      errors.push('Private key is required for private key import');
    } else {
      const privateKeyValidation = validatePrivateKey(data.privateKey);
      errors.push(...privateKeyValidation.errors);
    }
  } else {
    errors.push('Invalid import type specified');
  }

  // Validate passphrase if provided
  if (data.passphrase) {
    const passphraseValidation = validatePassphrase(data.passphrase);
    errors.push(...passphraseValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Checks if a mnemonic phrase appears to be from a specific cryptocurrency
 */
export function detectMnemonicType(mnemonic: string): {
  likelyCoin: 'bitcoin' | 'litecoin' | 'ethereum' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
} {
  // This is a basic heuristic - in a real implementation you'd use more sophisticated detection
  // For now, we'll assume it's likely Litecoin since this is the LTC signer

  if (!mnemonic || !mnemonic.trim()) {
    return { likelyCoin: 'unknown', confidence: 'low' };
  }

  const words = mnemonic.trim().split(/\s+/);

  // Check if it follows BIP39 word list (basic check)
  if (words.length >= 12 && words.length <= 24) {
    return { likelyCoin: 'litecoin', confidence: 'medium' };
  }

  return { likelyCoin: 'unknown', confidence: 'low' };
}
