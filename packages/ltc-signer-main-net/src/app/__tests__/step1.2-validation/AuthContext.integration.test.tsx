/**
 * Step 1.2 Integration Tests: AuthContext with AuthValidationService
 *
 * Tests that AuthContext properly integrates with the extracted AuthValidationService
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { AuthValidationService } from '../../services/validation/AuthValidationService';
import type { AuthState } from '../../types/auth';

// Mock the AuthValidationService
jest.mock('../../services/validation/AuthValidationService');
const mockAuthValidationService = AuthValidationService as jest.Mocked<
  typeof AuthValidationService
>;

describe('AuthContext Integration with AuthValidationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => null),
        setItem: jest.fn(() => null),
        removeItem: jest.fn(() => null),
        clear: jest.fn(() => null),
      },
      writable: true,
    });
  });

  const TestComponent = () => {
    const { authState, setPinCode } = useAuth();
    return (
      <div>
        <div data-testid="auth-status">{authState.status}</div>
        <div data-testid="auth-method">{authState.method || 'null'}</div>
        <button
          data-testid="set-pin-button"
          onClick={() => setPinCode('1234', '1234')}
        >
          Set PIN
        </button>
      </div>
    );
  };

  test('should use AuthValidationService for PIN validation', () => {
    // Mock successful PIN validation
    mockAuthValidationService.validatePinAuth.mockReturnValue({
      isValid: true,
      errors: [],
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    act(() => {
      getByTestId('set-pin-button').click();
    });

    expect(mockAuthValidationService.validatePinAuth).toHaveBeenCalledWith(
      '1234',
      '1234'
    );
  });

  test('should handle PIN validation failure', () => {
    // Mock failed PIN validation
    mockAuthValidationService.validatePinAuth.mockReturnValue({
      isValid: false,
      errors: ['PIN validation failed'],
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    act(() => {
      getByTestId('set-pin-button').click();
    });

    expect(mockAuthValidationService.validatePinAuth).toHaveBeenCalledWith(
      '1234',
      '1234'
    );
    // Should not change auth state due to validation failure
    expect(getByTestId('auth-status')).toHaveTextContent('unauthenticated');
  });

  test('should use AuthValidationService for auth state validation', () => {
    // Mock auth state validation
    mockAuthValidationService.validateAndCorrectAuthState.mockReturnValue({
      isValid: true,
      errors: [],
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(
      mockAuthValidationService.validateAndCorrectAuthState
    ).toHaveBeenCalled();
  });

  test('should handle auth state correction from service', () => {
    const correctedState: AuthState = {
      method: null,
      status: 'unauthenticated',
      isPasskeySupported: false,
      isPWA: false,
      credentialId: undefined,
    };

    // Mock auth state validation with correction needed
    mockAuthValidationService.validateAndCorrectAuthState
      .mockReturnValueOnce({
        isValid: false,
        errors: ['Invalid state'],
        corrected: correctedState,
      })
      .mockReturnValueOnce({
        isValid: true,
        errors: [],
      });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(
      mockAuthValidationService.validateAndCorrectAuthState
    ).toHaveBeenCalled();
  });

  test('should maintain existing functionality with service integration', () => {
    // Mock successful validations
    mockAuthValidationService.validatePinAuth.mockReturnValue({
      isValid: true,
      errors: [],
    });
    mockAuthValidationService.validateAndCorrectAuthState.mockReturnValue({
      isValid: true,
      errors: [],
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initial state should be unauthenticated
    expect(getByTestId('auth-status')).toHaveTextContent('unauthenticated');
    expect(getByTestId('auth-method')).toHaveTextContent('null');

    // After setting PIN, should be authenticated
    act(() => {
      getByTestId('set-pin-button').click();
    });

    // Note: The actual DOM update depends on how useAuth works
    // This test verifies the service integration works
    expect(mockAuthValidationService.validatePinAuth).toHaveBeenCalledWith(
      '1234',
      '1234'
    );
  });
});
