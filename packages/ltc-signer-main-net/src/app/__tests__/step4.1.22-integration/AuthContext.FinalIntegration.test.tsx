/**
 * AuthContext Final Integration Tests
 *
 * Comprehensive integration testing for the complete AuthContext system
 * Tests all authentication methods, encryption, and error scenarios
 *
 * @version 4.1.22
 * @since Phase 4 Integration
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, test, beforeEach, expect } from 'vitest';

// Mock all the hooks and services
vi.mock('../../../app/hooks/useAuthState', () => ({
  useAuthState: vi.fn(),
}));

vi.mock('../../../app/hooks/usePasskeyAuth', () => ({
  usePasskeyAuth: vi.fn(),
}));

vi.mock('../../../app/hooks/usePinAuth', () => ({
  usePinAuth: vi.fn(),
}));

vi.mock('../../../app/hooks/useEncryption', () => ({
  useConditionalEncryption: vi.fn(),
}));

vi.mock('../../../app/services/auth/PasskeyService', () => ({
  PasskeyService: {
    createCredential: vi.fn(),
    verifyCredential: vi.fn(),
    verifyCredentialExists: vi.fn(),
  },
}));

vi.mock('../../../app/services/auth/PinService', () => ({
  PinService: {
    validatePinAuth: vi.fn(),
    verifyPinMatch: vi.fn(),
    savePinAuth: vi.fn(),
    clearPinAuth: vi.fn(),
    loadPinAuth: vi.fn(),
  },
}));

vi.mock('../../../app/services/encryption/PasskeyEncryptionService', () => ({
  PasskeyEncryptionService: {
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    testEncryption: vi.fn(),
  },
}));

vi.mock('../../../app/services/encryption/PinEncryptionService', () => ({
  PinEncryptionService: {
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  },
}));

vi.mock('../../../app/services/storage/AuthStorageService', () => ({
  AuthStorageService: {
    hasAuthData: vi.fn(),
    forceClearAuthData: vi.fn(),
    getDebugData: vi.fn(),
    saveAuthState: vi.fn(),
    clearAuthState: vi.fn(),
  },
}));

vi.mock('../../../utils/auth/authLogger', () => ({
  authLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    performance: vi.fn(),
  },
}));

// Import the mocked modules
import { useAuthState } from '../../../app/hooks/useAuthState';
import { usePasskeyAuth } from '../../../app/hooks/usePasskeyAuth';
import { usePinAuth } from '../../../app/hooks/usePinAuth';
import { useConditionalEncryption } from '../../../app/hooks/useEncryption';
import { PasskeyService } from '../../../app/services/auth/PasskeyService';
import { PinService } from '../../../app/services/auth/PinService';
import { PasskeyEncryptionService } from '../../../app/services/encryption/PasskeyEncryptionService';
import { PinEncryptionService } from '../../../app/services/encryption/PinEncryptionService';
import { AuthStorageService } from '../../../app/services/storage/AuthStorageService';
import { authLogger } from '../../../utils/auth/authLogger';

// Import the AuthContext and provider
import { AuthProvider, useAuth } from '../../../app/contexts/AuthContext';

// Test component that uses the AuthContext
const TestComponent: React.FC = () => {
  const {
    authState,
    pinAuth,
    sessionAuthenticated,
    createPasskey,
    verifyPasskey,
    setPinCode,
    verifyPinCode,
    encryptData,
    decryptData,
    resetAuth,
  } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">{authState.status}</div>
      <div data-testid="auth-method">{authState.method || 'none'}</div>
      <div data-testid="session-auth">
        {sessionAuthenticated ? 'true' : 'false'}
      </div>
      <div data-testid="pin-code">{pinAuth.pin}</div>
      <div data-testid="pin-confirm">{pinAuth.confirmPin}</div>
      <button
        data-testid="create-passkey"
        onClick={() => createPasskey('test', 'Test User')}
      />
      <button data-testid="verify-passkey" onClick={() => verifyPasskey()} />
      <button
        data-testid="set-pin"
        onClick={() => setPinCode('1234', '1234')}
      />
      <button data-testid="verify-pin" onClick={() => verifyPinCode('1234')} />
      <button
        data-testid="encrypt"
        onClick={() => encryptData('test data', '1234')}
      />
      <button
        data-testid="decrypt"
        onClick={() => decryptData('encrypted', '1234')}
      />
      <button data-testid="reset" onClick={() => resetAuth()} />
    </div>
  );
};

// Mock implementations
const mockUseAuthState = useAuthState as jest.MockedFunction<
  typeof useAuthState
>;
const mockUsePasskeyAuth = usePasskeyAuth as jest.MockedFunction<
  typeof usePasskeyAuth
>;
const mockUsePinAuth = usePinAuth as jest.MockedFunction<typeof usePinAuth>;
const mockUseConditionalEncryption =
  useConditionalEncryption as jest.MockedFunction<
    typeof useConditionalEncryption
  >;

describe('AuthContext - Final Integration', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockUseAuthState.mockReturnValue({
      authState: {
        method: null,
        status: 'unauthenticated',
        isPasskeySupported: true,
        isPWA: true,
      },
      setAuthState: vi.fn(),
      sessionAuthenticated: false,
      setSessionAuthenticated: vi.fn(),
    });

    mockUsePasskeyAuth.mockReturnValue({
      createPasskey: vi.fn().mockResolvedValue(true),
      verifyPasskey: vi.fn().mockResolvedValue(true),
      encryptWithPasskey: vi.fn().mockResolvedValue('encrypted-passkey'),
      decryptWithPasskey: vi.fn().mockResolvedValue('decrypted-passkey'),
      testPasskeyEncryption: vi.fn().mockResolvedValue(true),
      verifyCredentialExists: vi.fn().mockResolvedValue(true),
    });

    mockUsePinAuth.mockReturnValue({
      setPinCode: vi.fn().mockReturnValue(true),
      verifyPinCode: vi.fn().mockReturnValue(true),
      encryptWithPin: vi.fn().mockResolvedValue('encrypted-pin'),
      decryptWithPin: vi.fn().mockResolvedValue('decrypted-pin'),
    });

    mockUseConditionalEncryption.mockReturnValue({
      encryptWithPasskey: vi.fn().mockResolvedValue('encrypted-passkey'),
      decryptWithPasskey: vi.fn().mockResolvedValue('decrypted-passkey'),
      encryptWithPin: vi.fn().mockResolvedValue('encrypted-pin'),
      decryptWithPin: vi.fn().mockResolvedValue('decrypted-pin'),
      testPasskeyEncryption: vi.fn().mockResolvedValue(true),
    });

    // Setup service mocks
    (
      PasskeyService.createCredential as jest.MockedFunction<
        typeof PasskeyService.createCredential
      >
    ).mockResolvedValue({
      credential: {},
      credentialId: 'test-credential-id',
    });

    (
      PasskeyService.verifyCredential as jest.MockedFunction<
        typeof PasskeyService.verifyCredential
      >
    ).mockResolvedValue({
      success: true,
      authenticated: true,
    });

    (
      PinService.validatePinAuth as jest.MockedFunction<
        typeof PinService.validatePinAuth
      >
    ).mockReturnValue({
      isValid: true,
      errors: [],
    });

    (
      PinService.verifyPinMatch as jest.MockedFunction<
        typeof PinService.verifyPinMatch
      >
    ).mockReturnValue(true);

    (
      PasskeyEncryptionService.encrypt as jest.MockedFunction<
        typeof PasskeyEncryptionService.encrypt
      >
    ).mockResolvedValue('legacy-encrypted');
    (
      PasskeyEncryptionService.decrypt as jest.MockedFunction<
        typeof PasskeyEncryptionService.decrypt
      >
    ).mockResolvedValue('legacy-decrypted');
    (
      PasskeyEncryptionService.testEncryption as jest.MockedFunction<
        typeof PasskeyEncryptionService.testEncryption
      >
    ).mockResolvedValue(true);

    (
      PinEncryptionService.encrypt as jest.MockedFunction<
        typeof PinEncryptionService.encrypt
      >
    ).mockResolvedValue('legacy-pin-encrypted');
    (
      PinEncryptionService.decrypt as jest.MockedFunction<
        typeof PinEncryptionService.decrypt
      >
    ).mockResolvedValue('legacy-pin-decrypted');

    (
      AuthStorageService.hasAuthData as jest.MockedFunction<
        typeof AuthStorageService.hasAuthData
      >
    ).mockReturnValue(false);

    // Add loadPinAuth mock
    (
      PinService.loadPinAuth as jest.MockedFunction<
        typeof PinService.loadPinAuth
      >
    ).mockReturnValue({ pin: '', confirmPin: '' });

    // Add AuthStorageService method mocks
    (
      AuthStorageService.saveAuthState as jest.MockedFunction<
        typeof AuthStorageService.saveAuthState
      >
    ).mockImplementation(() => {});
    (
      AuthStorageService.clearAuthState as jest.MockedFunction<
        typeof AuthStorageService.clearAuthState
      >
    ).mockImplementation(() => {});
  });

  describe('Complete Authentication Flow', () => {
    test('should handle complete passkey authentication flow', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Initial state should be unauthenticated
      expect(screen.getByTestId('auth-status')).toHaveTextContent(
        'unauthenticated'
      );
      expect(screen.getByTestId('auth-method')).toHaveTextContent('none');
      expect(screen.getByTestId('session-auth')).toHaveTextContent('false');

      // Click create passkey
      const createButton = screen.getByTestId('create-passkey');
      await act(async () => {
        createButton.click();
      });

      // Verify passkey creation was called
      await waitFor(() => {
        expect(mockUsePasskeyAuth().createPasskey).toHaveBeenCalledWith(
          'test',
          'Test User'
        );
      });

      // Click verify passkey
      const verifyButton = screen.getByTestId('verify-passkey');
      await act(async () => {
        verifyButton.click();
      });

      // Verify passkey verification was called
      await waitFor(() => {
        expect(mockUsePasskeyAuth().verifyPasskey).toHaveBeenCalledWith(
          undefined
        );
      });
    });

    test('should handle complete PIN authentication flow', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Click set PIN
      const setPinButton = screen.getByTestId('set-pin');
      await act(async () => {
        setPinButton.click();
      });

      // Verify PIN setup was called
      await waitFor(() => {
        expect(mockUsePinAuth().setPinCode).toHaveBeenCalledWith(
          '1234',
          '1234'
        );
      });

      // Click verify PIN
      const verifyPinButton = screen.getByTestId('verify-pin');
      await act(async () => {
        verifyPinButton.click();
      });

      // Verify PIN verification was called
      await waitFor(() => {
        expect(mockUsePinAuth().verifyPinCode).toHaveBeenCalledWith('1234');
      });
    });

    test('should handle encryption/decryption flow', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Click encrypt
      const encryptButton = screen.getByTestId('encrypt');
      await act(async () => {
        encryptButton.click();
      });

      // Verify encryption was attempted
      await waitFor(() => {
        // This will use the unified encryption interface
        expect(
          mockUseConditionalEncryption().encryptWithPin
        ).toHaveBeenCalledWith('test data', '1234');
      });

      // Click decrypt
      const decryptButton = screen.getByTestId('decrypt');
      await act(async () => {
        decryptButton.click();
      });

      // Verify decryption was attempted
      await waitFor(() => {
        expect(
          mockUseConditionalEncryption().decryptWithPin
        ).toHaveBeenCalledWith('encrypted', '1234');
      });
    });

    test('should handle auth reset flow', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Click reset
      const resetButton = screen.getByTestId('reset');
      await act(async () => {
        resetButton.click();
      });

      // Verify reset functions were called
      await waitFor(() => {
        expect(PinService.clearPinAuth).toHaveBeenCalled();
        expect(AuthStorageService.forceClearAuthData).toHaveBeenCalled();
      });
    });
  });

  describe('All Auth Methods Integration', () => {
    test('should support passkey authentication with encryption', async () => {
      // Setup passkey authenticated state
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'passkey',
          status: 'authenticated',
          credentialId: 'test-credential-id',
          isPasskeySupported: true,
          isPWA: true,
        },
        setAuthState: vi.fn(),
        sessionAuthenticated: true,
        setSessionAuthenticated: vi.fn(),
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Verify state
      expect(screen.getByTestId('auth-method')).toHaveTextContent('passkey');
      expect(screen.getByTestId('session-auth')).toHaveTextContent('true');

      // Test encryption with passkey
      const encryptButton = screen.getByTestId('encrypt');
      await act(async () => {
        encryptButton.click();
      });

      await waitFor(() => {
        expect(
          mockUseConditionalEncryption().encryptWithPasskey
        ).toHaveBeenCalledWith('test data');
      });
    });

    test('should support PIN authentication with encryption', async () => {
      // Setup PIN authenticated state
      mockUseAuthState.mockReturnValue({
        authState: {
          method: 'pin',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: true,
        },
        setAuthState: vi.fn(),
        sessionAuthenticated: true,
        setSessionAuthenticated: vi.fn(),
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Verify state
      expect(screen.getByTestId('auth-method')).toHaveTextContent('pin');

      // Test encryption with PIN
      const encryptButton = screen.getByTestId('encrypt');
      await act(async () => {
        encryptButton.click();
      });

      await waitFor(() => {
        expect(
          mockUseConditionalEncryption().encryptWithPin
        ).toHaveBeenCalledWith('test data', '1234');
      });
    });
  });

  describe('Error Scenarios and Recovery', () => {
    test('should handle passkey creation failure gracefully', async () => {
      // Mock passkey creation failure
      mockUsePasskeyAuth.mockReturnValue({
        createPasskey: vi.fn().mockResolvedValue(false),
        verifyPasskey: vi.fn().mockResolvedValue(true),
        encryptWithPasskey: vi.fn().mockResolvedValue('encrypted'),
        decryptWithPasskey: vi.fn().mockResolvedValue('decrypted'),
        testPasskeyEncryption: vi.fn().mockResolvedValue(true),
        verifyCredentialExists: vi.fn().mockResolvedValue(true),
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Click create passkey
      const createButton = screen.getByTestId('create-passkey');
      await act(async () => {
        createButton.click();
      });

      // Should handle failure gracefully
      await waitFor(() => {
        expect(mockUsePasskeyAuth().createPasskey).toHaveBeenCalled();
      });

      // Status should remain unchanged or show failure
      expect(screen.getByTestId('auth-status')).toHaveTextContent(
        'unauthenticated'
      );
    });

    test('should handle PIN verification failure', async () => {
      // Mock PIN verification failure
      mockUsePinAuth.mockReturnValue({
        setPinCode: vi.fn().mockReturnValue(false),
        verifyPinCode: vi.fn().mockReturnValue(false),
        encryptWithPin: vi.fn().mockResolvedValue('encrypted'),
        decryptWithPin: vi.fn().mockResolvedValue('decrypted'),
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Click verify PIN
      const verifyButton = screen.getByTestId('verify-pin');
      await act(async () => {
        verifyButton.click();
      });

      // Should handle failure gracefully
      await waitFor(() => {
        expect(mockUsePinAuth().verifyPinCode).toHaveBeenCalledWith('1234');
      });
    });

    test('should handle encryption service failures', async () => {
      // Mock encryption failure
      mockUseConditionalEncryption.mockReturnValue({
        encryptWithPin: vi
          .fn()
          .mockRejectedValue(new Error('Encryption failed')),
        decryptWithPin: vi.fn().mockResolvedValue('decrypted'),
        encryptWithPasskey: vi.fn().mockResolvedValue('encrypted'),
        decryptWithPasskey: vi.fn().mockResolvedValue('decrypted'),
        testPasskeyEncryption: vi.fn().mockResolvedValue(true),
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Click encrypt - should handle error gracefully
      const encryptButton = screen.getByTestId('encrypt');
      await act(async () => {
        encryptButton.click();
      });

      // Error should be logged
      await waitFor(() => {
        expect(authLogger.error).toHaveBeenCalled();
      });
    });
  });

  describe('Performance Requirements', () => {
    test('should complete authentication operations within 100ms', async () => {
      const startTime = performance.now();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Click create passkey
      const createButton = screen.getByTestId('create-passkey');
      await act(async () => {
        createButton.click();
      });

      // Wait for completion
      await waitFor(() => {
        expect(mockUsePasskeyAuth().createPasskey).toHaveBeenCalled();
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within 100ms
      expect(duration).toBeLessThan(100);
    });

    test('should handle rapid successive operations', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Rapidly click multiple operations
      const createButton = screen.getByTestId('create-passkey');
      const setPinButton = screen.getByTestId('set-pin');
      const encryptButton = screen.getByTestId('encrypt');

      await act(async () => {
        createButton.click();
        setPinButton.click();
        encryptButton.click();
      });

      // All operations should be called
      await waitFor(() => {
        expect(mockUsePasskeyAuth().createPasskey).toHaveBeenCalled();
        expect(mockUsePinAuth().setPinCode).toHaveBeenCalled();
        expect(
          mockUseConditionalEncryption().encryptWithPin
        ).toHaveBeenCalled();
      });
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain API compatibility', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // All expected methods should be available
      expect(screen.getByTestId('create-passkey')).toBeInTheDocument();
      expect(screen.getByTestId('verify-passkey')).toBeInTheDocument();
      expect(screen.getByTestId('set-pin')).toBeInTheDocument();
      expect(screen.getByTestId('verify-pin')).toBeInTheDocument();
      expect(screen.getByTestId('encrypt')).toBeInTheDocument();
      expect(screen.getByTestId('decrypt')).toBeInTheDocument();
      expect(screen.getByTestId('reset')).toBeInTheDocument();
    });

    test('should handle legacy service fallbacks', async () => {
      // Mock hook failures to test legacy fallbacks
      mockUsePasskeyAuth.mockReturnValue({
        createPasskey: vi.fn().mockResolvedValue(false), // Hook fails
        verifyPasskey: vi.fn().mockResolvedValue(false), // Hook fails
        encryptWithPasskey: vi.fn().mockRejectedValue(new Error('Hook failed')),
        decryptWithPasskey: vi.fn().mockResolvedValue('decrypted'),
        testPasskeyEncryption: vi.fn().mockResolvedValue(true),
        verifyCredentialExists: vi.fn().mockResolvedValue(true),
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Test that legacy services are called as fallback
      const createButton = screen.getByTestId('create-passkey');
      await act(async () => {
        createButton.click();
      });

      // Legacy service should be called
      await waitFor(() => {
        expect(PasskeyService.createCredential).toHaveBeenCalledWith(
          'test',
          'Test User'
        );
      });
    });
  });

  describe('Security Requirements', () => {
    test('should properly handle sensitive data', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Test PIN data handling
      expect(screen.getByTestId('pin-code')).toHaveTextContent('');
      expect(screen.getByTestId('pin-confirm')).toHaveTextContent('');

      // Test encryption operations
      const encryptButton = screen.getByTestId('encrypt');
      await act(async () => {
        encryptButton.click();
      });

      // Should use secure encryption methods
      await waitFor(() => {
        expect(
          mockUseConditionalEncryption().encryptWithPin
        ).toHaveBeenCalledWith('test data', '1234');
      });
    });

    test('should clear sensitive data on reset', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Click reset
      const resetButton = screen.getByTestId('reset');
      await act(async () => {
        resetButton.click();
      });

      // Should clear all sensitive data
      await waitFor(() => {
        expect(PinService.clearPinAuth).toHaveBeenCalled();
        expect(AuthStorageService.forceClearAuthData).toHaveBeenCalled();
      });
    });
  });
});
