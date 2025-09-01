import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useAuthState } from '../useAuthState';
import { AuthStorageService } from '../../services/storage/AuthStorageService';
import { AuthValidationService } from '../../services/validation/AuthValidationService';
import { authLogger } from '../../../utils/auth/authLogger';
import type { AuthState } from '../../types/auth';

// Mock all dependencies
vi.mock('../../services/storage/AuthStorageService');
vi.mock('../../services/validation/AuthValidationService');
vi.mock('../../../utils/auth/authLogger');

const mockAuthStorageService = vi.mocked(AuthStorageService);
const mockAuthValidationService = vi.mocked(AuthValidationService);
const mockAuthLogger = vi.mocked(authLogger);

describe('useAuthState Hook', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock performance.now for consistent timing tests
    vi.spyOn(performance, 'now').mockReturnValue(1000);

    // Default mock implementations
    mockAuthStorageService.loadAuthState.mockReturnValue(null);
    mockAuthValidationService.validateAndCorrectAuthState.mockImplementation(
      (state) => ({
        isValid: true,
        errors: [],
        corrected: state,
      })
    );
    mockAuthStorageService.getDebugData.mockReturnValue({
      hasData: false,
      authData: null,
    });
  });

  describe('Initialization', () => {
    test('initializes with default state when no saved state exists', () => {
      mockAuthStorageService.loadAuthState.mockReturnValue(null);

      const { result } = renderHook(() => useAuthState());

      expect(result.current.authState).toEqual({
        method: null,
        status: 'unauthenticated',
        isPasskeySupported: false,
        isPWA: false,
      });
      expect(result.current.sessionAuthenticated).toBe(false);
      expect(mockAuthStorageService.loadAuthState).toHaveBeenCalledTimes(1);
      expect(mockAuthLogger.debug).toHaveBeenCalledWith(
        'useAuthState: Initializing auth state'
      );
    });

    test('restores and validates saved state from AuthStorageService', () => {
      const savedState: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'test-credential',
      };

      const validatedState: AuthState = {
        ...savedState,
        status: 'authenticated', // corrected by validation
      };

      mockAuthStorageService.loadAuthState.mockReturnValue(savedState);
      mockAuthValidationService.validateAndCorrectAuthState.mockReturnValue({
        isValid: true,
        errors: [],
        corrected: validatedState,
      });

      const { result } = renderHook(() => useAuthState());

      expect(result.current.authState).toEqual(validatedState);
      expect(
        mockAuthValidationService.validateAndCorrectAuthState
      ).toHaveBeenCalledWith(savedState);
      expect(mockAuthLogger.debug).toHaveBeenCalledWith(
        'useAuthState: Restored auth state from storage',
        savedState
      );
    });

    test('handles initialization errors gracefully', () => {
      mockAuthStorageService.loadAuthState.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => useAuthState());

      expect(result.current.authState).toEqual({
        method: null,
        status: 'unauthenticated',
        isPasskeySupported: false,
        isPWA: false,
      });
      expect(mockAuthLogger.error).toHaveBeenCalledWith(
        'useAuthState: Error during state initialization',
        expect.any(Error)
      );
    });

    test('logs default state usage when no saved state', () => {
      mockAuthStorageService.loadAuthState.mockReturnValue(null);

      renderHook(() => useAuthState());

      expect(mockAuthLogger.debug).toHaveBeenCalledWith(
        'useAuthState: No saved auth state found, using default state'
      );
      expect(mockAuthLogger.debug).toHaveBeenCalledWith(
        'useAuthState: Using default auth state',
        expect.any(Object)
      );
    });
  });

  describe('setAuthState callback', () => {
    test('updates state directly with validation', () => {
      const newState: AuthState = {
        method: 'pin',
        status: 'authenticated',
        isPasskeySupported: false,
        isPWA: true,
      };

      const validatedState: AuthState = {
        ...newState,
        status: 'authenticated', // validated
      };

      mockAuthValidationService.validateAndCorrectAuthState.mockReturnValue({
        isValid: true,
        errors: [],
        corrected: validatedState,
      });

      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.setAuthState(newState);
      });

      expect(result.current.authState).toEqual(validatedState);
      expect(
        mockAuthValidationService.validateAndCorrectAuthState
      ).toHaveBeenCalledWith(newState);
      expect(mockAuthLogger.debug).toHaveBeenCalledWith(
        'useAuthState: Auth state updated directly',
        {
          isValid: true,
          errors: [],
          corrected: validatedState,
        }
      );
      expect(mockAuthLogger.performance).toHaveBeenCalledWith(
        'useAuthState.setAuthState.direct',
        0
      );
    });

    test('updates state using function with validation', () => {
      const { result } = renderHook(() => useAuthState());

      const updateFunction = (prev: AuthState) => ({
        ...prev,
        method: 'passkey' as const,
        status: 'authenticating' as const,
      });

      const expectedState: AuthState = {
        method: 'passkey',
        status: 'authenticating',
        isPasskeySupported: false,
        isPWA: false,
      };

      mockAuthValidationService.validateAndCorrectAuthState.mockReturnValue({
        isValid: true,
        errors: [],
        corrected: expectedState,
      });

      act(() => {
        result.current.setAuthState(updateFunction);
      });

      expect(result.current.authState).toEqual(expectedState);
      expect(
        mockAuthValidationService.validateAndCorrectAuthState
      ).toHaveBeenCalledWith(expectedState);
      expect(mockAuthLogger.debug).toHaveBeenCalledWith(
        'useAuthState: setAuthState called',
        {
          hasFunction: true,
        }
      );
      expect(mockAuthLogger.performance).toHaveBeenCalledWith(
        'useAuthState.setAuthState.function',
        0
      );
    });

    test('resets session authentication when state becomes unauthenticated', () => {
      const { result } = renderHook(() => useAuthState());

      // Set session as authenticated initially
      act(() => {
        result.current.setSessionAuthenticated(true);
      });

      expect(result.current.sessionAuthenticated).toBe(true);

      // Update to unauthenticated state
      const unauthenticatedState: AuthState = {
        method: null,
        status: 'unauthenticated',
        isPasskeySupported: false,
        isPWA: false,
      };

      mockAuthValidationService.validateAndCorrectAuthState.mockReturnValue({
        isValid: true,
        errors: [],
        corrected: unauthenticatedState,
      });

      act(() => {
        result.current.setAuthState(unauthenticatedState);
      });

      expect(result.current.sessionAuthenticated).toBe(false);
      expect(result.current.authState.status).toBe('unauthenticated');
    });

    test('handles validation errors gracefully', () => {
      mockAuthValidationService.validateAndCorrectAuthState.mockImplementation(
        () => {
          throw new Error('Validation error');
        }
      );

      const { result } = renderHook(() => useAuthState());

      const newState: AuthState = {
        method: 'pin',
        status: 'authenticated',
        isPasskeySupported: false,
        isPWA: false,
      };

      expect(() => {
        act(() => {
          result.current.setAuthState(newState);
        });
      }).toThrow('Validation error');

      expect(mockAuthLogger.error).toHaveBeenCalledWith(
        'useAuthState: Error in setAuthState',
        expect.any(Error)
      );
      expect(mockAuthLogger.performance).toHaveBeenCalledWith(
        'useAuthState.setAuthState.error',
        0
      );
    });
  });

  describe('Session Authentication', () => {
    test('can set and get session authentication state', () => {
      const { result } = renderHook(() => useAuthState());

      expect(result.current.sessionAuthenticated).toBe(false);

      act(() => {
        result.current.setSessionAuthenticated(true);
      });

      expect(result.current.sessionAuthenticated).toBe(true);

      act(() => {
        result.current.setSessionAuthenticated(false);
      });

      expect(result.current.sessionAuthenticated).toBe(false);
    });
  });

  describe('Debug Information', () => {
    test('returns comprehensive debug information', () => {
      const testState: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'test-id',
      };

      mockAuthStorageService.getDebugData.mockReturnValue({
        hasData: true,
        authData: 'test-data',
      });

      const { result } = renderHook(() => useAuthState());

      // Set test state
      mockAuthValidationService.validateAndCorrectAuthState.mockReturnValue({
        isValid: true,
        errors: [],
        corrected: testState,
      });

      act(() => {
        result.current.setAuthState(testState);
        result.current.setSessionAuthenticated(true);
      });

      const debugInfo = result.current.getDebugInfo();

      expect(debugInfo).toEqual({
        authState: testState,
        sessionAuthenticated: true,
        storageData: {
          hasData: true,
          authData: 'test-data',
        },
        timestamp: expect.any(String),
      });

      expect(debugInfo.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      let callCount = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => {
        callCount++;
        return callCount * 100; // 100ms, 200ms, 300ms, etc.
      });
    });

    test('logs performance for direct state updates', () => {
      const { result } = renderHook(() => useAuthState());

      const newState: AuthState = {
        method: 'pin',
        status: 'authenticated',
        isPasskeySupported: false,
        isPWA: false,
      };

      mockAuthValidationService.validateAndCorrectAuthState.mockReturnValue({
        isValid: true,
        errors: [],
        corrected: newState,
      });

      act(() => {
        result.current.setAuthState(newState);
      });

      expect(mockAuthLogger.performance).toHaveBeenCalledWith(
        'useAuthState.setAuthState.direct',
        100
      );
    });

    test('logs performance for function-based updates', () => {
      const { result } = renderHook(() => useAuthState());

      const updateFunction = (prev: AuthState) => ({
        ...prev,
        status: 'authenticating' as const,
      });

      mockAuthValidationService.validateAndCorrectAuthState.mockReturnValue({
        isValid: true,
        errors: [],
        corrected: {
          method: null,
          status: 'authenticating',
          isPasskeySupported: false,
          isPWA: false,
        },
      });

      act(() => {
        result.current.setAuthState(updateFunction);
      });

      expect(mockAuthLogger.performance).toHaveBeenCalledWith(
        'useAuthState.setAuthState.function',
        100
      );
    });
  });

  describe('Offline Compatibility', () => {
    test('works completely offline - no external API calls', () => {
      // Mock window and navigator to simulate offline environment
      Object.defineProperty(window, 'navigator', {
        value: { onLine: false },
        writable: true,
      });

      // Ensure no fetch calls are made
      const fetchSpy = vi.spyOn(window, 'fetch');
      fetchSpy.mockImplementation(() => Promise.reject(new Error('Offline')));

      const { result } = renderHook(() => useAuthState());

      // Should work without any network calls
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result.current.authState).toBeDefined();

      // Test state updates work offline
      const newState: AuthState = {
        method: 'pin',
        status: 'authenticated',
        isPasskeySupported: false,
        isPWA: false,
      };

      mockAuthValidationService.validateAndCorrectAuthState.mockReturnValue({
        isValid: true,
        errors: [],
        corrected: newState,
      });

      act(() => {
        result.current.setAuthState(newState);
      });

      expect(result.current.authState).toEqual(newState);
    });
  });

  describe('Error Recovery', () => {
    test('maintains stable state when validation fails', () => {
      const { result } = renderHook(() => useAuthState());

      // Make validation fail
      mockAuthValidationService.validateAndCorrectAuthState.mockReturnValue({
        isValid: false,
        errors: ['Invalid state'],
        corrected: null,
      });

      const invalidState: AuthState = {
        method: 'pin',
        status: 'authenticated',
        isPasskeySupported: false,
        isPWA: false,
      };

      // Should not crash, should handle error gracefully
      expect(() => {
        act(() => {
          result.current.setAuthState(invalidState);
        });
      }).not.toThrow();

      // State should remain unchanged or be handled appropriately
      expect(result.current.authState).toBeDefined();
    });
  });
});
