import { renderHook, act } from '@testing-library/react';
import { useAuthState } from '../../hooks/useAuthState';
import { AuthStorageService } from '../../services/storage/AuthStorageService';
import { AuthValidationService } from '../../services/validation/AuthValidationService';
import { authLogger } from '../../../utils/auth/authLogger';

// Mock all dependencies
jest.mock('../../services/storage/AuthStorageService');
jest.mock('../../services/validation/AuthValidationService');
jest.mock('../../../utils/auth/authLogger');

const mockAuthStorageService = AuthStorageService as jest.Mocked<
  typeof AuthStorageService
>;
const mockAuthValidationService = AuthValidationService as jest.Mocked<
  typeof AuthValidationService
>;
const mockAuthLogger = authLogger as jest.Mocked<typeof authLogger>;

describe('useAuthState Hook - Migration Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset localStorage mock
    const mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

    // Default mocks
    mockAuthStorageService.loadAuthState.mockReturnValue(null);
    mockAuthStorageService.saveAuthState.mockImplementation(() => {});
    mockAuthStorageService.clearAuthState.mockImplementation(() => {});

    mockAuthValidationService.validateAndCorrectAuthState.mockImplementation(
      (state) => ({
        corrected: state,
        errors: [],
      })
    );

    mockAuthLogger.debug.mockImplementation(() => {});
    mockAuthLogger.error.mockImplementation(() => {});
    mockAuthLogger.performance.mockImplementation(() => {});
  });

  describe('Hook Initialization', () => {
    test('initializes with default state when no persisted state exists', () => {
      mockAuthStorageService.loadAuthState.mockReturnValue(null);

      const { result } = renderHook(() => useAuthState());

      expect(result.current.authState).toEqual({
        method: null,
        status: 'unauthenticated',
        isPasskeySupported: false,
        isPWA: false,
      });
      expect(result.current.sessionAuthenticated).toBe(false);
      expect(mockAuthStorageService.loadAuthState).toHaveBeenCalled();
    });

    test('loads and validates persisted auth state', () => {
      const persistedState = {
        method: 'passkey' as const,
        status: 'authenticated' as const,
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'persisted-credential-id',
      };

      const validatedState = {
        ...persistedState,
        isPWA: true, // Simulating validation correction
      };

      mockAuthStorageService.loadAuthState.mockReturnValue(persistedState);
      mockAuthValidationService.validateAndCorrectAuthState.mockReturnValue({
        corrected: validatedState,
        errors: [],
      });

      const { result } = renderHook(() => useAuthState());

      expect(mockAuthStorageService.loadAuthState).toHaveBeenCalled();
      expect(
        mockAuthValidationService.validateAndCorrectAuthState
      ).toHaveBeenCalledWith(persistedState);
      expect(result.current.authState).toEqual(validatedState);
    });

    test('handles initialization errors gracefully', () => {
      mockAuthStorageService.loadAuthState.mockImplementation(() => {
        throw new Error('Storage unavailable');
      });

      const { result } = renderHook(() => useAuthState());

      expect(result.current.authState).toEqual({
        method: null,
        status: 'unauthenticated',
        isPasskeySupported: false,
        isPWA: false,
      });
      expect(mockAuthLogger.error).toHaveBeenCalled();
    });
  });

  describe('setAuthState Functionality', () => {
    test('handles functional state updates correctly', () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.setAuthState((prev) => ({
          ...prev,
          status: 'authenticating',
          method: 'passkey',
        }));
      });

      expect(result.current.authState.status).toBe('authenticating');
      expect(result.current.authState.method).toBe('passkey');
      expect(
        mockAuthValidationService.validateAndCorrectAuthState
      ).toHaveBeenCalled();
      expect(mockAuthStorageService.saveAuthState).toHaveBeenCalled();
    });

    test('handles direct state updates correctly', () => {
      const { result } = renderHook(() => useAuthState());

      const newState = {
        method: 'pin' as const,
        status: 'authenticated' as const,
        isPasskeySupported: false,
        isPWA: true,
        credentialId: 'test-credential-id',
      };

      act(() => {
        result.current.setAuthState(newState);
      });

      expect(result.current.authState).toEqual(newState);
      expect(
        mockAuthValidationService.validateAndCorrectAuthState
      ).toHaveBeenCalledWith(newState);
      expect(mockAuthStorageService.saveAuthState).toHaveBeenCalled();
    });

    test('applies validation corrections to state updates', () => {
      const originalState = {
        method: 'passkey' as const,
        status: 'authenticated' as const,
        isPasskeySupported: true,
        isPWA: false,
      };

      const correctedState = {
        ...originalState,
        method: 'pin', // Validation correction
      };

      mockAuthValidationService.validateAndCorrectAuthState.mockReturnValue({
        corrected: correctedState,
        errors: ['Invalid method for current state'],
      });

      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.setAuthState(originalState);
      });

      expect(result.current.authState).toEqual(correctedState);
      expect(
        mockAuthValidationService.validateAndCorrectAuthState
      ).toHaveBeenCalledWith(originalState);
    });

    test('resets session authentication for invalid states', () => {
      const { result } = renderHook(() => useAuthState());

      // Set initial authenticated state with session
      act(() => {
        result.current.setAuthState({
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
          credentialId: 'test-id',
        });
      });

      expect(result.current.sessionAuthenticated).toBe(false); // Initially false

      // Now set to invalid state
      mockAuthValidationService.validateAndCorrectAuthState.mockReturnValue({
        corrected: {
          method: null,
          status: 'unauthenticated',
          isPasskeySupported: true,
          isPWA: false,
        },
        errors: [],
      });

      act(() => {
        result.current.setAuthState({
          method: null,
          status: 'unauthenticated',
          isPasskeySupported: true,
          isPWA: false,
        });
      });

      expect(result.current.sessionAuthenticated).toBe(false);
    });

    test('handles setAuthState errors gracefully', () => {
      mockAuthValidationService.validateAndCorrectAuthState.mockImplementation(
        () => {
          throw new Error('Validation failed');
        }
      );

      const { result } = renderHook(() => useAuthState());

      expect(() => {
        act(() => {
          result.current.setAuthState({
            method: 'passkey',
            status: 'authenticated',
            isPasskeySupported: true,
            isPWA: false,
          });
        });
      }).toThrow('Validation failed');

      expect(mockAuthLogger.error).toHaveBeenCalled();
    });
  });

  describe('Session Authentication Management', () => {
    test('setSessionAuthenticated updates session state', () => {
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

    test('session authentication resets on invalid state transitions', () => {
      const { result } = renderHook(() => useAuthState());

      // Set authenticated session
      act(() => {
        result.current.setSessionAuthenticated(true);
      });
      expect(result.current.sessionAuthenticated).toBe(true);

      // Set invalid state that should reset session
      mockAuthValidationService.validateAndCorrectAuthState.mockReturnValue({
        corrected: {
          method: null,
          status: 'unauthenticated',
          isPasskeySupported: true,
          isPWA: false,
        },
        errors: [],
      });

      act(() => {
        result.current.setAuthState({
          method: null,
          status: 'unauthenticated',
          isPasskeySupported: true,
          isPWA: false,
        });
      });

      expect(result.current.sessionAuthenticated).toBe(false);
    });
  });

  describe('Storage Integration', () => {
    test('saves state changes to localStorage', () => {
      const { result } = renderHook(() => useAuthState());

      const newState = {
        method: 'passkey' as const,
        status: 'authenticated' as const,
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'test-credential-id',
      };

      act(() => {
        result.current.setAuthState(newState);
      });

      expect(mockAuthStorageService.saveAuthState).toHaveBeenCalledWith(
        newState
      );
    });

    test('handles localStorage save errors gracefully', () => {
      mockAuthStorageService.saveAuthState.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const { result } = renderHook(() => useAuthState());

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      act(() => {
        result.current.setAuthState({
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
        });
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'useAuthState: Error in setAuthState',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('only saves valid authenticated states', () => {
      const { result } = renderHook(() => useAuthState());

      // Should not save unauthenticated state
      act(() => {
        result.current.setAuthState({
          method: null,
          status: 'unauthenticated',
          isPasskeySupported: true,
          isPWA: false,
        });
      });

      expect(mockAuthStorageService.saveAuthState).not.toHaveBeenCalled();

      // Should save authenticated state
      act(() => {
        result.current.setAuthState({
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
          credentialId: 'test-id',
        });
      });

      expect(mockAuthStorageService.saveAuthState).toHaveBeenCalled();
    });
  });

  describe('Performance and Logging', () => {
    test('logs performance metrics for state operations', () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.setAuthState({
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
        });
      });

      expect(mockAuthLogger.performance).toHaveBeenCalledWith(
        'useAuthState.setAuthState.direct',
        expect.any(Number)
      );
    });

    test('logs debug information for state changes', () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.setAuthState((prev) => ({
          ...prev,
          status: 'authenticating',
        }));
      });

      expect(mockAuthLogger.debug).toHaveBeenCalledWith(
        'useAuthState: setAuthState called',
        { hasFunction: true }
      );

      expect(mockAuthLogger.debug).toHaveBeenCalledWith(
        'useAuthState: Auth state updated via function',
        expect.any(Object)
      );
    });

    test('logs initialization events', () => {
      renderHook(() => useAuthState());

      expect(mockAuthLogger.debug).toHaveBeenCalledWith(
        'useAuthState: Initializing auth state'
      );

      expect(mockAuthLogger.debug).toHaveBeenCalledWith(
        'useAuthState: No saved auth state found, using default state'
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles malformed state objects gracefully', () => {
      const malformedState = {
        method: 'invalid-method' as const,
        status: 'invalid-status' as const,
        isPasskeySupported: 'not-a-boolean' as const,
        isPWA: null as const,
      };

      mockAuthValidationService.validateAndCorrectAuthState.mockReturnValue({
        corrected: {
          method: null,
          status: 'unauthenticated',
          isPasskeySupported: false,
          isPWA: false,
        },
        errors: [
          'Invalid method',
          'Invalid status',
          'Invalid isPasskeySupported',
        ],
      });

      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.setAuthState(malformedState);
      });

      expect(result.current.authState).toEqual({
        method: null,
        status: 'unauthenticated',
        isPasskeySupported: false,
        isPWA: false,
      });
    });

    test('handles validation service failures', () => {
      mockAuthValidationService.validateAndCorrectAuthState.mockImplementation(
        () => {
          throw new Error('Validation service unavailable');
        }
      );

      const { result } = renderHook(() => useAuthState());

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      act(() => {
        result.current.setAuthState({
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
        });
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('handles rapid consecutive state updates', () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        // Multiple rapid updates
        result.current.setAuthState({
          method: null,
          status: 'authenticating',
          isPasskeySupported: true,
          isPWA: false,
        });
        result.current.setAuthState({
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
          credentialId: 'id1',
        });
        result.current.setAuthState({
          method: 'pin',
          status: 'failed',
          isPasskeySupported: true,
          isPWA: false,
        });
      });

      // Should handle all updates without issues
      expect(
        mockAuthValidationService.validateAndCorrectAuthState
      ).toHaveBeenCalledTimes(3);
      expect(mockAuthStorageService.saveAuthState).toHaveBeenCalledTimes(3);
    });

    test('maintains state consistency during errors', () => {
      const { result } = renderHook(() => useAuthState());

      // Set initial valid state
      act(() => {
        result.current.setAuthState({
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
          credentialId: 'initial-id',
        });
      });

      const initialState = result.current.authState;

      // Attempt update that fails
      mockAuthValidationService.validateAndCorrectAuthState.mockImplementationOnce(
        () => {
          throw new Error('Temporary validation failure');
        }
      );

      expect(() => {
        act(() => {
          result.current.setAuthState({
            method: 'pin',
            status: 'authenticated',
            isPasskeySupported: true,
            isPWA: false,
          });
        });
      }).toThrow();

      // State should remain unchanged after failed update
      expect(result.current.authState).toEqual(initialState);
    });
  });

  describe('Memory and Cleanup', () => {
    test('does not cause memory leaks with frequent updates', () => {
      const { result, unmount } = renderHook(() => useAuthState());

      // Perform many updates
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.setAuthState((prev) => ({
            ...prev,
            status:
              i % 2 === 0
                ? ('authenticating' as const)
                : ('authenticated' as const),
          }));
        });
      }

      // Cleanup
      unmount();

      // Should have handled all operations without memory issues
      expect(
        mockAuthValidationService.validateAndCorrectAuthState
      ).toHaveBeenCalledTimes(100);
    });

    test('handles hook unmounting gracefully', () => {
      const { result, unmount } = renderHook(() => useAuthState());

      // Set some state
      act(() => {
        result.current.setAuthState({
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
        });
      });

      // Unmount
      unmount();

      // Should not cause any issues
      expect(result.current.authState.status).toBe('authenticated');
    });
  });
});
