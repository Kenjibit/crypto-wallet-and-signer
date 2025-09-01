import { authLogger } from '../../../utils/auth/authLogger';

export interface PasskeyCreationResult {
  credential: PublicKeyCredential;
  credentialId: string;
}

export interface PasskeyVerificationResult {
  success: boolean;
  authenticated: boolean;
}

export interface PasskeySupportInfo {
  isSupported: boolean;
  hasWebAuthn: boolean;
  hasPlatformAuthenticator: boolean;
  hasConditionalMediation: boolean;
  platformAuthenticatorAvailable: boolean;
  isIOS: boolean;
  isIOS16Plus: boolean;
  isIOS18Plus: boolean;
}

/**
 * Service for handling WebAuthn passkey operations
 * Extracted from AuthContext to provide modular, testable passkey functionality
 */
export class PasskeyService {
  /**
   * Check if passkeys are supported on this device/browser
   */
  static async isSupported(): Promise<PasskeySupportInfo> {
    authLogger.debug(
      'PasskeyService.isSupported: Starting passkey support check'
    );

    // Check basic WebAuthn support
    const hasWebAuthn = !!(
      typeof window !== 'undefined' && window.PublicKeyCredential
    );
    authLogger.debug('WebAuthn support', { supported: hasWebAuthn });

    // Check platform authenticator support (this is what iOS 16+ provides)
    const hasPlatformAuthenticator =
      hasWebAuthn &&
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
        'function';
    authLogger.debug('Platform authenticator API', {
      available: hasPlatformAuthenticator,
    });

    // Check conditional mediation (iOS 16.1+ feature)
    const hasConditionalMediation =
      hasWebAuthn &&
      typeof PublicKeyCredential.isConditionalMediationAvailable === 'function';
    authLogger.debug('Conditional mediation API', {
      available: hasConditionalMediation,
    });

    // Detect iOS specifically with more comprehensive patterns
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isIOS16Plus =
      isIOS && /OS 1[6-9]|OS [2-9][0-9]/.test(navigator.userAgent);
    const isIOS18Plus =
      isIOS && /OS 1[8-9]|OS [2-9][0-9]/.test(navigator.userAgent);
    authLogger.debug('iOS detection', { isIOS, isIOS16Plus, isIOS18Plus });

    // Check if actually available (not just API presence)
    let platformAuthenticatorAvailable = false;
    if (hasPlatformAuthenticator) {
      try {
        authLogger.debug('Checking platform authenticator availability');
        platformAuthenticatorAvailable =
          await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        authLogger.debug('Platform authenticator available', {
          available: platformAuthenticatorAvailable,
        });
      } catch (error) {
        authLogger.warn(
          'Failed to check platform authenticator availability',
          error instanceof Error ? error : new Error(String(error))
        );
        platformAuthenticatorAvailable = false;
      }
    }

    // iOS 16+ supports passkeys with platform authenticator
    // Also check actual availability, not just API presence
    const isSupported =
      hasPlatformAuthenticator && platformAuthenticatorAvailable;
    authLogger.debug('Final passkey support', { supported: isSupported });

    // Log detection results for debugging
    if (typeof window !== 'undefined') {
      authLogger.debug('Passkey Support Detection', {
        hasWebAuthn,
        hasPlatformAuthenticator,
        hasConditionalMediation,
        platformAuthenticatorAvailable,
        isIOS,
        isIOS16Plus,
        isIOS18Plus,
        userAgent: navigator.userAgent,
        isSupported,
        // Additional debugging info
        location: {
          hostname: window.location.hostname,
          protocol: window.location.protocol,
          origin: window.location.origin,
        },
        // Check if credentials API is available
        credentialsAPI: {
          available: !!navigator.credentials,
          create: !!(navigator.credentials && navigator.credentials.create),
          get: !!(navigator.credentials && navigator.credentials.get),
        },
      });
    }

    return {
      isSupported,
      hasWebAuthn,
      hasPlatformAuthenticator,
      hasConditionalMediation,
      platformAuthenticatorAvailable,
      isIOS,
      isIOS16Plus,
      isIOS18Plus,
    };
  }

  /**
   * Create a new passkey credential
   */
  static async createCredential(
    username: string,
    displayName: string
  ): Promise<PasskeyCreationResult> {
    authLogger.debug('PasskeyService.createCredential called', {
      username,
      displayName,
    });

    try {
      // Generate a random challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      authLogger.debug(
        'Generated challenge, calling navigator.credentials.create'
      );

      // Create passkey with both ES256 and RS256 to avoid warnings
      const passkeyCreationStart = performance.now();
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'LTC Signer',
            id: window.location.hostname,
          },
          user: {
            id: new Uint8Array(16),
            name: username,
            displayName,
          },
          pubKeyCredParams: [
            {
              type: 'public-key',
              alg: -7, // ES256
            },
            {
              type: 'public-key',
              alg: -257, // RS256
            },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      });
      const passkeyCreationDuration = performance.now() - passkeyCreationStart;
      authLogger.performance(
        'navigator.credentials.create',
        passkeyCreationDuration
      );

      authLogger.debug('navigator.credentials.create completed', {
        hasCredential: !!credential,
        hasRawId: credential && 'rawId' in credential,
        credentialType: credential?.type,
      });

      if (credential && 'rawId' in credential) {
        // Store the credential ID for future reference
        const publicKeyCredential = credential as PublicKeyCredential;
        const credentialId = btoa(
          String.fromCharCode(...new Uint8Array(publicKeyCredential.rawId))
        );

        authLogger.debug('Credential ID generated', {
          length: credentialId.length,
          preview: credentialId.substring(0, 10) + '...',
        });

        // Validate that the credential is properly formed
        if (!credentialId || credentialId.length === 0) {
          const error = new Error('Invalid credential ID generated');
          authLogger.error('Invalid credential ID generated');
          throw error;
        }

        return {
          credential: publicKeyCredential,
          credentialId,
        };
      } else {
        authLogger.debug('No credential or rawId, passkey creation failed');
        throw new Error(
          'No credential returned from navigator.credentials.create'
        );
      }
    } catch (error) {
      authLogger.error(
        'Passkey creation failed',
        error instanceof Error ? error : new Error(String(error))
      );
      authLogger.debug('Error details', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack',
      });

      throw error;
    }
  }

  /**
   * Verify a passkey credential
   */
  static async verifyCredential(
    credentialId?: string
  ): Promise<PasskeyVerificationResult> {
    authLogger.debug('PasskeyService.verifyCredential called');
    authLogger.debug('Credential verification', {
      credentialId: credentialId ? 'provided' : 'none',
    });

    try {
      // Generate a random challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      authLogger.debug(
        'Generated challenge, calling navigator.credentials.get'
      );

      // Get passkey - use existing credential if available
      const credentialOptions = {
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: 'required' as UserVerificationRequirement,
          timeout: 60000,
          // If we have a stored credential ID, use it to find the specific credential
          ...(credentialId && {
            allowCredentials: [
              {
                id: Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0)),
                type: 'public-key' as const,
              },
            ],
          }),
        },
        // Remove conditional mediation - it can cause hangs in some browsers
        // mediation: 'conditional',
      };

      authLogger.debug('Credential options', {
        hasCredentialId: !!credentialId,
        challengeLength: challenge.length,
        timeout: credentialOptions.publicKey.timeout,
        userVerification: credentialOptions.publicKey.userVerification,
      });

      const passkeyVerificationStart = performance.now();
      const assertion = await navigator.credentials.get(credentialOptions);
      const passkeyVerificationDuration =
        performance.now() - passkeyVerificationStart;
      authLogger.performance(
        'navigator.credentials.get (verification)',
        passkeyVerificationDuration
      );

      authLogger.debug('navigator.credentials.get completed', {
        hasAssertion: !!assertion,
        assertionType: assertion?.type,
      });

      if (assertion) {
        authLogger.debug('Passkey verification successful');
        return {
          success: true,
          authenticated: true,
        };
      } else {
        authLogger.debug('No assertion returned from passkey verification');
        return {
          success: false,
          authenticated: false,
        };
      }
    } catch (error) {
      authLogger.error(
        'Passkey verification failed',
        error instanceof Error ? error : new Error(String(error))
      );
      authLogger.debug('Verification error details', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack',
      });

      // Handle specific error types
      if (error instanceof Error) {
        authLogger.debug('Error type analysis', {
          name: error.name,
          message: error.message,
          isNotAllowed: error.name === 'NotAllowedError',
          isInvalidState: error.name === 'InvalidStateError',
          isAbortError: error.name === 'AbortError',
          includesNotAllowed: error.message.includes('not allowed'),
          includesTimedOut: error.message.includes('timed out'),
          includesCancelled:
            error.message.includes('cancelled') ||
            error.message.includes('canceled'),
          includesAborted: error.message.includes('aborted'),
          includesUserCancelled:
            error.message.includes('user cancelled') ||
            error.message.includes('user canceled'),
        });
      }

      throw error;
    }
  }

  /**
   * Check if a credential exists and is valid
   */
  static async verifyCredentialExists(credentialId: string): Promise<boolean> {
    authLogger.debug('PasskeyService.verifyCredentialExists called');
    authLogger.debug('Credential verification', {
      credentialId: credentialId ? 'exists' : 'null',
    });

    if (!credentialId) {
      authLogger.debug('No credential ID to verify');
      return false;
    }

    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      await navigator.credentials.get({
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
        // Remove conditional mediation - it can cause hangs
        // mediation: 'conditional',
      });

      authLogger.debug('verifyCredentialExists: Credential found');
      return true;
    } catch (error) {
      authLogger.error(
        'verifyCredentialExists failed',
        error instanceof Error ? error : new Error(String(error))
      );
      authLogger.debug('Verification error details', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack',
      });

      if (error instanceof Error) {
        if (
          error.name === 'NotAllowedError' ||
          error.message.includes('not allowed') ||
          error.message.includes('timed out')
        ) {
          authLogger.debug(
            'verifyCredentialExists failed due to user cancellation or timeout'
          );
          return false;
        } else if (
          error.name === 'InvalidStateError' ||
          error.message.includes('credential not found')
        ) {
          authLogger.debug('verifyCredentialExists: Credential not found');
          return false;
        }
      }
      return false;
    }
  }
}
