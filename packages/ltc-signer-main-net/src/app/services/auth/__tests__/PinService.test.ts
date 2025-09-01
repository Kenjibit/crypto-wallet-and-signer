import { describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
 } from 'vitest';
import { PinService } from '../PinService';

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
  exportKey: vi.fn(),
  sign: vi.fn(),
};
Object.defineProperty(global.crypto, 'subtle', {
  value: mockCryptoSubtle,
  writable: true,
});

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
} as unknown as Storage;
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock performance.now
const mockPerformanceNow = vi.fn();
Object.defineProperty(window.performance, 'now', {
  value: mockPerformanceNow,
  writable: true,
});

describe('PinService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);

    // Reset localStorage mocks
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockImplementation(() => {});
    mockLocalStorage.removeItem.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('validatePin', () => {
    test('validates correct 4-digit PIN', () => {
      expect(PinService.validatePin('1234')).toBe(true);
      expect(PinService.validatePin('0000')).toBe(true);
      expect(PinService.validatePin('9999')).toBe(true);
    });

    test('rejects invalid PIN formats', () => {
      expect(PinService.validatePin('123')).toBe(false); // Too short
      expect(PinService.validatePin('12345')).toBe(false); // Too long
      expect(PinService.validatePin('abcd')).toBe(false); // Non-numeric
      expect(PinService.validatePin('12a4')).toBe(false); // Mixed
      expect(PinService.validatePin('')).toBe(false); // Empty
    });
  });

  describe('validatePinAuth', () => {
    test('validates matching PINs', () => {
      const result = PinService.validatePinAuth('1234', '1234');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects non-matching PINs', () => {
      const result = PinService.validatePinAuth('1234', '5678');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PIN and confirmation do not match');
    });

    test('rejects invalid PIN format', () => {
      const result = PinService.validatePinAuth('123', '123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PIN must be exactly 4 digits');
    });

    test('rejects empty PINs', () => {
      const result = PinService.validatePinAuth('', '');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PIN cannot be empty');
      expect(result.errors).toContain('PIN confirmation cannot be empty');
    });

    test('rejects weak PINs', () => {
      const repeatedResult = PinService.validatePinAuth('1111', '1111');
      expect(repeatedResult.isValid).toBe(false);
      expect(repeatedResult.errors).toContain(
        'PIN cannot be all the same digit'
      );

      const sequentialResult = PinService.validatePinAuth('1234', '1234');
      expect(sequentialResult.isValid).toBe(false);
      expect(sequentialResult.errors).toContain(
        'PIN cannot be sequential digits'
      );
    });
  });

  describe('hashPin', () => {
    beforeEach(() => {
      // Mock crypto operations
      mockGetRandomValues.mockImplementation((array: Uint8Array) => {
        // Fill with predictable values for testing
        for (let i = 0; i < array.length; i++) {
          array[i] = i;
        }
      });

      const mockKey = { type: 'secret' };
      const mockExportedKey = new Uint8Array([1, 2, 3, 4]);

      mockCryptoSubtle.importKey.mockResolvedValue(mockKey);
      mockCryptoSubtle.deriveKey.mockResolvedValue(mockKey);
      mockCryptoSubtle.exportKey.mockResolvedValue(mockExportedKey);
    });

    test('hashes valid PIN successfully', async () => {
      const result = await PinService.hashPin('1234');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('rejects invalid PIN format', async () => {
      await expect(PinService.hashPin('123')).rejects.toThrow(
        'Invalid PIN format'
      );
    });

    test('handles crypto operation failures', async () => {
      mockCryptoSubtle.importKey.mockRejectedValue(new Error('Crypto failed'));

      await expect(PinService.hashPin('1234')).rejects.toThrow(
        'PIN hashing failed'
      );
    });
  });

  describe('verifyPin', () => {
    beforeEach(() => {
      // Mock crypto operations for verification
      mockGetRandomValues.mockImplementation((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = i;
        }
      });

      const mockKey = { type: 'secret' };
      const mockExportedKey = new Uint8Array([1, 2, 3, 4]);

      mockCryptoSubtle.importKey.mockResolvedValue(mockKey);
      mockCryptoSubtle.deriveKey.mockResolvedValue(mockKey);
      mockCryptoSubtle.exportKey.mockResolvedValue(mockExportedKey);
    });

    test('verifies correct PIN against hash', async () => {
      // First hash a PIN
      const hashedPin = await PinService.hashPin('1234');

      // Then verify it
      const isValid = await PinService.verifyPin('1234', hashedPin);
      expect(isValid).toBe(true);
    });

    test('rejects incorrect PIN', async () => {
      const hashedPin = await PinService.hashPin('1234');

      const isValid = await PinService.verifyPin('5678', hashedPin);
      expect(isValid).toBe(false);
    });

    test('rejects invalid PIN format', async () => {
      const hashedPin = await PinService.hashPin('1234');

      const isValid = await PinService.verifyPin('123', hashedPin);
      expect(isValid).toBe(false);
    });

    test('handles invalid hash format', async () => {
      const isValid = await PinService.verifyPin('1234', 'invalid-hash');
      expect(isValid).toBe(false);
    });

    test('handles crypto operation failures gracefully', async () => {
      mockCryptoSubtle.importKey.mockRejectedValue(new Error('Crypto failed'));

      const hashedPin = await PinService.hashPin('1234');
      const isValid = await PinService.verifyPin('1234', hashedPin);
      expect(isValid).toBe(false);
    });
  });

  describe('savePinAuth', () => {
    test('saves PIN auth to localStorage', () => {
      const pinAuth = { pin: '1234', confirmPin: '1234' };

      PinService.savePinAuth(pinAuth);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ltc-signer-pin',
        JSON.stringify(pinAuth)
      );
    });

    test('handles localStorage errors', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const pinAuth = { pin: '1234', confirmPin: '1234' };

      expect(() => PinService.savePinAuth(pinAuth)).toThrow(
        'Failed to save PIN authentication data'
      );
    });

    test('handles window undefined gracefully', () => {
      // Temporarily remove window
      const originalWindow = (global as typeof globalThis & { window: Window })
        .window;
      delete (global as typeof globalThis & { window?: Window }).window;

      const pinAuth = { pin: '1234', confirmPin: '1234' };

      expect(() => PinService.savePinAuth(pinAuth)).not.toThrow();

      // Restore window
      (global as typeof globalThis & { window: Window }).window =
        originalWindow;
    });
  });

  describe('loadPinAuth', () => {
    test('loads PIN auth from localStorage', () => {
      const savedPinAuth = { pin: '1234', confirmPin: '1234' };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedPinAuth));

      const result = PinService.loadPinAuth();

      expect(result).toEqual(savedPinAuth);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('ltc-signer-pin');
    });

    test('returns default values when no data saved', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = PinService.loadPinAuth();

      expect(result).toEqual({ pin: '', confirmPin: '' });
    });

    test('handles invalid JSON gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      const result = PinService.loadPinAuth();

      expect(result).toEqual({ pin: '', confirmPin: '' });
    });

    test('handles localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const result = PinService.loadPinAuth();

      expect(result).toEqual({ pin: '', confirmPin: '' });
    });

    test('handles window undefined gracefully', () => {
      const originalWindow = (global as typeof globalThis & { window: Window })
        .window;
      delete (global as typeof globalThis & { window?: Window }).window;

      const result = PinService.loadPinAuth();

      expect(result).toEqual({ pin: '', confirmPin: '' });

      (global as typeof globalThis & { window: Window }).window =
        originalWindow;
    });
  });

  describe('clearPinAuth', () => {
    test('clears PIN auth from localStorage', () => {
      PinService.clearPinAuth();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        'ltc-signer-pin'
      );
    });

    test('handles localStorage errors gracefully', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      expect(() => PinService.clearPinAuth()).not.toThrow();
    });

    test('handles window undefined gracefully', () => {
      const originalWindow = (global as typeof globalThis & { window: Window })
        .window;
      delete (global as typeof globalThis & { window?: Window }).window;

      expect(() => PinService.clearPinAuth()).not.toThrow();

      (global as typeof globalThis & { window: Window }).window =
        originalWindow;
    });
  });

  describe('verifyPinMatch', () => {
    test('verifies matching PINs', () => {
      expect(PinService.verifyPinMatch('1234', '1234')).toBe(true);
      expect(PinService.verifyPinMatch('0000', '0000')).toBe(true);
    });

    test('rejects non-matching PINs', () => {
      expect(PinService.verifyPinMatch('1234', '5678')).toBe(false);
      expect(PinService.verifyPinMatch('1234', '1235')).toBe(false);
    });

    test('handles different lengths', () => {
      expect(PinService.verifyPinMatch('1234', '123')).toBe(false);
      expect(PinService.verifyPinMatch('123', '1234')).toBe(false);
    });
  });
});
