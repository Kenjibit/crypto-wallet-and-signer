import {
  PasskeyService,
  PasskeySupportInfo,
  PasskeyCreationResult,
  PasskeyVerificationResult,
} from '../PasskeyService';

// Mock the WebAuthn API
const mockWebAuthn = {
  create: vi.fn(),
  get: vi.fn(),
  isUserVerifyingPlatformAuthenticatorAvailable: vi.fn(),
  isConditionalMediationAvailable: vi.fn(),
};

// Mock navigator
Object.defineProperty(navigator, 'credentials', {
  value: mockWebAuthn,
  writable: true,
});

// Mock PublicKeyCredential
Object.defineProperty(window, 'PublicKeyCredential', {
  value: {
    isUserVerifyingPlatformAuthenticatorAvailable:
      mockWebAuthn.isUserVerifyingPlatformAuthenticatorAvailable,
    isConditionalMediationAvailable:
      mockWebAuthn.isConditionalMediationAvailable,
  },
  writable: true,
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'test.example.com',
    protocol: 'https:',
    origin: 'https://test.example.com',
  },
  writable: true,
});

// Mock crypto
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: vi.fn(),
    subtle: {
      digest: vi.fn(),
      importKey: vi.fn(),
      deriveKey: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    },
  },
  writable: true,
});

// Mock performance
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(),
  },
  writable: true,
});

// Setup mocks before each test
beforeEach(() => {
  vi.clearAllMocks();

  // Default mock implementations
  mockWebAuthn.create.mockResolvedValue(null);
  mockWebAuthn.get.mockResolvedValue(null);
  mockWebAuthn.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(
    true
  );
  mockWebAuthn.isConditionalMediationAvailable.mockResolvedValue(true);

  (
    crypto.getRandomValues as vi.MockedFunction<typeof crypto.getRandomValues>
  ).mockImplementation((array: Uint8Array) => {
    // Fill with predictable values for testing
    for (let i = 0; i < array.length; i++) {
      array[i] = i % 256;
    }
    return array;
  });

  (
    crypto.subtle.digest as vi.MockedFunction<typeof crypto.subtle.digest>
  ).mockResolvedValue(new Uint8Array(32));
  (
    crypto.subtle.importKey as vi.MockedFunction<typeof crypto.subtle.importKey>
  ).mockResolvedValue({});
  (
    crypto.subtle.deriveKey as vi.MockedFunction<typeof crypto.subtle.deriveKey>
  ).mockResolvedValue({});
  (
    crypto.subtle.encrypt as vi.MockedFunction<typeof crypto.subtle.encrypt>
  ).mockResolvedValue(new Uint8Array(32));
  (
    crypto.subtle.decrypt as vi.MockedFunction<typeof crypto.subtle.decrypt>
  ).mockResolvedValue(new Uint8Array(16));

  (
    performance.now as vi.MockedFunction<typeof performance.now>
  ).mockReturnValue(1000);
});

describe('PasskeyService', () => {
  describe('isSupported', () => {
    test('returns full support info when all APIs are available', async () => {
      // Mock iOS user agent
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        writable: true,
      });

      const result: PasskeySupportInfo = await PasskeyService.isSupported();

      expect(result).toEqual({
        isSupported: true,
        hasWebAuthn: true,
        hasPlatformAuthenticator: true,
        hasConditionalMediation: true,
        platformAuthenticatorAvailable: true,
        isIOS: true,
        isIOS16Plus: true,
        isIOS18Plus: false,
      });
    });

    test('returns limited support when platform authenticator is not available', async () => {
      mockWebAuthn.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(
        false
      );

      const result: PasskeySupportInfo = await PasskeyService.isSupported();

      expect(result.isSupported).toBe(false);
      expect(result.platformAuthenticatorAvailable).toBe(false);
    });

    test('handles platform authenticator check failure gracefully', async () => {
      mockWebAuthn.isUserVerifyingPlatformAuthenticatorAvailable.mockRejectedValue(
        new Error('API not supported')
      );

      const result: PasskeySupportInfo = await PasskeyService.isSupported();

      expect(result.isSupported).toBe(false);
      expect(result.platformAuthenticatorAvailable).toBe(false);
    });

    test('detects non-iOS devices correctly', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        writable: true,
      });

      const result: PasskeySupportInfo = await PasskeyService.isSupported();

      expect(result.isIOS).toBe(false);
      expect(result.isIOS16Plus).toBe(false);
      expect(result.isIOS18Plus).toBe(false);
    });

    test('returns false when WebAuthn is not available', async () => {
      // Temporarily remove WebAuthn support
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: undefined,
        writable: true,
      });

      const result: PasskeySupportInfo = await PasskeyService.isSupported();

      expect(result.hasWebAuthn).toBe(false);
      expect(result.isSupported).toBe(false);

      // Restore WebAuthn for other tests
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: {
          isUserVerifyingPlatformAuthenticatorAvailable:
            mockWebAuthn.isUserVerifyingPlatformAuthenticatorAvailable,
          isConditionalMediationAvailable:
            mockWebAuthn.isConditionalMediationAvailable,
        },
        writable: true,
      });
    });
  });

  describe('createCredential', () => {
    test('creates passkey successfully', async () => {
      const mockCredential = {
        type: 'public-key',
        rawId: new Uint8Array([1, 2, 3, 4, 5]),
      };
      mockWebAuthn.create.mockResolvedValue(mockCredential);

      const result: PasskeyCreationResult =
        await PasskeyService.createCredential('testuser', 'Test User');

      expect(mockWebAuthn.create).toHaveBeenCalledWith({
        publicKey: expect.objectContaining({
          challenge: expect.any(Uint8Array),
          rp: {
            name: 'LTC Signer',
            id: 'test.example.com',
          },
          user: expect.objectContaining({
            name: 'testuser',
            displayName: 'Test User',
            id: expect.any(Uint8Array),
          }),
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        }),
      });

      expect(result.credential).toBe(mockCredential);
      expect(result.credentialId).toBe(btoa('\x01\x02\x03\x04\x05'));
    });

    test('throws error when no credential is returned', async () => {
      mockWebAuthn.create.mockResolvedValue(null);

      await expect(
        PasskeyService.createCredential('testuser', 'Test User')
      ).rejects.toThrow(
        'No credential returned from navigator.credentials.create'
      );
    });

    test('throws error when credential has no rawId', async () => {
      const mockCredential = {
        type: 'public-key',
        // Missing rawId
      };
      mockWebAuthn.create.mockResolvedValue(mockCredential);

      await expect(
        PasskeyService.createCredential('testuser', 'Test User')
      ).rejects.toThrow(
        'No credential returned from navigator.credentials.create'
      );
    });

    test('throws error for empty credentialId', async () => {
      const mockCredential = {
        type: 'public-key',
        rawId: new Uint8Array([]), // Empty rawId
      };
      mockWebAuthn.create.mockResolvedValue(mockCredential);

      await expect(
        PasskeyService.createCredential('testuser', 'Test User')
      ).rejects.toThrow('Invalid credential ID generated');
    });

    test('handles user cancellation (NotAllowedError)', async () => {
      const error = new Error('User cancelled');
      error.name = 'NotAllowedError';
      mockWebAuthn.create.mockRejectedValue(error);

      await expect(
        PasskeyService.createCredential('testuser', 'Test User')
      ).rejects.toThrow(error);
    });

    test('handles timeout errors', async () => {
      const error = new Error('Timeout');
      error.name = 'AbortError';
      mockWebAuthn.create.mockRejectedValue(error);

      await expect(
        PasskeyService.createCredential('testuser', 'Test User')
      ).rejects.toThrow(error);
    });
  });

  describe('verifyCredential', () => {
    test('verifies passkey successfully', async () => {
      const mockAssertion = {
        type: 'public-key',
        response: {
          signature: new Uint8Array([1, 2, 3]),
          clientDataJSON: new Uint8Array([4, 5, 6]),
          authenticatorData: new Uint8Array([7, 8, 9]),
        },
      };
      mockWebAuthn.get.mockResolvedValue(mockAssertion);

      const result: PasskeyVerificationResult =
        await PasskeyService.verifyCredential('test-credential-id');

      expect(result.success).toBe(true);
      expect(result.authenticated).toBe(true);

      expect(mockWebAuthn.get).toHaveBeenCalledWith({
        publicKey: expect.objectContaining({
          challenge: expect.any(Uint8Array),
          rpId: 'test.example.com',
          userVerification: 'required',
          timeout: 60000,
          allowCredentials: [
            expect.objectContaining({
              id: expect.any(Uint8Array),
              type: 'public-key',
            }),
          ],
        }),
      });
    });

    test('verifies passkey without specific credential ID', async () => {
      const mockAssertion = {
        type: 'public-key',
        response: {
          signature: new Uint8Array([1, 2, 3]),
          clientDataJSON: new Uint8Array([4, 5, 6]),
          authenticatorData: new Uint8Array([7, 8, 9]),
        },
      };
      mockWebAuthn.get.mockResolvedValue(mockAssertion);

      const result: PasskeyVerificationResult =
        await PasskeyService.verifyCredential();

      expect(result.success).toBe(true);
      expect(result.authenticated).toBe(true);

      const callArgs = mockWebAuthn.get.mock.calls[0][0];
      expect(callArgs.publicKey.allowCredentials).toBeUndefined();
    });

    test('returns false when no assertion is returned', async () => {
      mockWebAuthn.get.mockResolvedValue(null);

      const result: PasskeyVerificationResult =
        await PasskeyService.verifyCredential();

      expect(result.success).toBe(false);
      expect(result.authenticated).toBe(false);
    });

    test('handles verification errors', async () => {
      const error = new Error('Verification failed');
      error.name = 'InvalidStateError';
      mockWebAuthn.get.mockRejectedValue(error);

      await expect(
        PasskeyService.verifyCredential('test-credential-id')
      ).rejects.toThrow(error);
    });

    test('handles user cancellation during verification', async () => {
      const error = new Error('User cancelled verification');
      error.name = 'NotAllowedError';
      mockWebAuthn.get.mockRejectedValue(error);

      await expect(
        PasskeyService.verifyCredential('test-credential-id')
      ).rejects.toThrow(error);
    });
  });

  describe('verifyCredentialExists', () => {
    test('returns true when credential exists', async () => {
      const mockAssertion = {
        type: 'public-key',
        response: {
          signature: new Uint8Array([1, 2, 3]),
          clientDataJSON: new Uint8Array([4, 5, 6]),
          authenticatorData: new Uint8Array([7, 8, 9]),
        },
      };
      mockWebAuthn.get.mockResolvedValue(mockAssertion);

      const result = await PasskeyService.verifyCredentialExists(
        'test-credential-id'
      );

      expect(result).toBe(true);
    });

    test('returns false when no credential ID is provided', async () => {
      const result = await PasskeyService.verifyCredentialExists('');

      expect(result).toBe(false);
      expect(mockWebAuthn.get).not.toHaveBeenCalled();
    });

    test('returns false for user cancellation', async () => {
      const error = new Error('User cancelled');
      error.name = 'NotAllowedError';
      mockWebAuthn.get.mockRejectedValue(error);

      const result = await PasskeyService.verifyCredentialExists(
        'test-credential-id'
      );

      expect(result).toBe(false);
    });

    test('returns false when credential does not exist', async () => {
      const error = new Error('Credential not found');
      error.name = 'InvalidStateError';
      mockWebAuthn.get.mockRejectedValue(error);

      const result = await PasskeyService.verifyCredentialExists(
        'test-credential-id'
      );

      expect(result).toBe(false);
    });

    test('returns false for timeout errors', async () => {
      const error = new Error('Timeout');
      error.name = 'AbortError';
      mockWebAuthn.get.mockRejectedValue(error);

      const result = await PasskeyService.verifyCredentialExists(
        'test-credential-id'
      );

      expect(result).toBe(false);
    });

    test('handles unknown errors gracefully', async () => {
      const error = new Error('Unknown error');
      mockWebAuthn.get.mockRejectedValue(error);

      const result = await PasskeyService.verifyCredentialExists(
        'test-credential-id'
      );

      expect(result).toBe(false);
    });
  });
});
