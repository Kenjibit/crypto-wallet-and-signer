/**
 * Step 3.1 Offline Validation Tests: useAuthState Hook
 *
 * Comprehensive validation that the useAuthState hook works completely offline
 * for air-gapped wallet requirements. Ensures no external dependencies.
 */

import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useAuthState } from '../../hooks/useAuthState';
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

describe('useAuthState Offline Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  describe('Complete Offline Operation', () => {
    test('works completely offline with no network dependencies', () => {
      // Mock offline environment
      Object.defineProperty(window.navigator, 'onLine', {
        value: false,
        writable: true,
      });

      // Mock fetch to fail (simulating no network)
      const fetchSpy = vi.spyOn(window, 'fetch');
      fetchSpy.mockImplementation(() =>
        Promise.reject(new Error('Network is offline'))
      );

      // Mock XMLHttpRequest to fail
      const xhrSpy = vi.spyOn(window, 'XMLHttpRequest');
      xhrSpy.mockImplementation(() => {
        throw new Error('Network unavailable');
      });

      const { result } = renderHook(() => useAuthState());

      // Should work without any network calls
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();

      // Should initialize with default state
      expect(result.current.authState).toEqual({
        method: null,
        status: 'unauthenticated',
        isPasskeySupported: false,
        isPWA: false,
      });

      // State updates should work offline
      act(() => {
        result.current.setAuthState({
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
          credentialId: 'offline-cred',
        });
      });

      expect(result.current.authState.status).toBe('authenticated');
      expect(result.current.authState.method).toBe('passkey');
    });

    test('handles network failures gracefully during initialization', () => {
      // Simulate network failure during storage access
      mockAuthStorageService.loadAuthState.mockImplementation(() => {
        // Simulate a network-dependent operation failing
        throw new Error('Storage access failed - network unavailable');
      });

      const { result } = renderHook(() => useAuthState());

      // Should fallback to default state despite storage failure
      expect(result.current.authState).toEqual({
        method: null,
        status: 'unauthenticated',
        isPasskeySupported: false,
        isPWA: false,
      });

      // Should log the error appropriately
      expect(mockAuthLogger.error).toHaveBeenCalledWith(
        'useAuthState: Error during state initialization',
        expect.any(Error)
      );
    });

    test('handles network failures during state updates', () => {
      const { result } = renderHook(() => useAuthState());

      // Simulate network failure during validation
      mockAuthValidationService.validateAndCorrectAuthState.mockImplementation(
        () => {
          throw new Error('Validation service network failure');
        }
      );

      const newState: AuthState = {
        method: 'pin',
        status: 'authenticated',
        isPasskeySupported: false,
        isPWA: false,
      };

      // Should handle the error gracefully
      expect(() => {
        act(() => {
          result.current.setAuthState(newState);
        });
      }).toThrow('Validation service network failure');

      // Should log the performance and error
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

  describe('localStorage Offline Operation', () => {
    test('uses only localStorage for persistence (no external APIs)', () => {
      const savedState: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
        credentialId: 'test-cred',
      };

      mockAuthStorageService.loadAuthState.mockReturnValue(savedState);

      const { result } = renderHook(() => useAuthState());

      // Should load from localStorage
      expect(mockAuthStorageService.loadAuthState).toHaveBeenCalledTimes(1);
      expect(result.current.authState).toEqual(savedState);

      // State updates should work with localStorage only
      act(() => {
        result.current.setAuthState({
          ...result.current.authState,
          status: 'authenticating',
        });
      });

      expect(result.current.authState.status).toBe('authenticating');
    });

    test('handles localStorage failures gracefully', () => {
      // Simulate localStorage quota exceeded
      mockAuthStorageService.loadAuthState.mockImplementation(() => {
        throw new Error('localStorage quota exceeded');
      });

      const { result } = renderHook(() => useAuthState());

      // Should fallback to default state
      expect(result.current.authState).toEqual({
        method: null,
        status: 'unauthenticated',
        isPasskeySupported: false,
        isPWA: false,
      });

      // Should log error but not crash
      expect(mockAuthLogger.error).toHaveBeenCalledWith(
        'useAuthState: Error during state initialization',
        expect.any(Error)
      );
    });

    test('works with localStorage disabled', () => {
      // Simulate localStorage being disabled/unavailable
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      });

      mockAuthStorageService.loadAuthState.mockImplementation(() => {
        throw new Error('localStorage is not available');
      });

      const { result } = renderHook(() => useAuthState());

      // Should still work with default state
      expect(result.current.authState).toEqual({
        method: null,
        status: 'unauthenticated',
        isPasskeySupported: false,
        isPWA: false,
      });

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });
  });

  describe('Browser API Offline Compatibility', () => {
    test('works with Web Crypto API offline', () => {
      // Mock crypto operations that might be used by services
      const cryptoSpy = vi.spyOn(window.crypto, 'getRandomValues');
      cryptoSpy.mockImplementation((array) => {
        // Fill with deterministic values for testing
        for (let i = 0; i < array.length; i++) {
          array[i] = i % 256;
        }
        return array;
      });

      const { result } = renderHook(() => useAuthState());

      // Should work with crypto API
      expect(result.current.authState).toBeDefined();
      expect(cryptoSpy).not.toHaveBeenCalled(); // Not called during basic initialization

      // State operations should work
      act(() => {
        result.current.setAuthState({
          method: 'pin',
          status: 'authenticated',
          isPasskeySupported: false,
          isPWA: false,
        });
      });

      expect(result.current.authState.status).toBe('authenticated');
    });

    test('handles crypto API unavailability', () => {
      // Simulate crypto API being unavailable
      const originalCrypto = window.crypto;
      Object.defineProperty(window, 'crypto', {
        value: undefined,
        writable: true,
      });

      const { result } = renderHook(() => useAuthState());

      // Should still work without crypto API
      expect(result.current.authState).toEqual({
        method: null,
        status: 'unauthenticated',
        isPasskeySupported: false,
        isPWA: false,
      });

      // Restore crypto API
      Object.defineProperty(window, 'crypto', {
        value: originalCrypto,
        writable: true,
      });
    });

    test('works with performance API offline', () => {
      const performanceSpy = vi.spyOn(performance, 'now');

      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.setAuthState({
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
        });
      });

      // Performance monitoring should work offline
      expect(performanceSpy).toHaveBeenCalled();
      expect(mockAuthLogger.performance).toHaveBeenCalledWith(
        'useAuthState.setAuthState.direct',
        0
      );
    });
  });

  describe('Air-Gapped Wallet Scenarios', () => {
    test('simulates complete air-gapped wallet workflow', () => {
      // Mock all external APIs as unavailable
      Object.defineProperty(window.navigator, 'onLine', {
        value: false,
        writable: true,
      });

      // Mock fetch failures
      const fetchSpy = vi.spyOn(window, 'fetch');
      fetchSpy.mockRejectedValue(new Error('No internet connection'));

      // Mock successful localStorage operation
      const savedState: AuthState = {
        method: 'pin',
        status: 'authenticated',
        isPasskeySupported: false,
        isPWA: true,
      };
      mockAuthStorageService.loadAuthState.mockReturnValue(savedState);

      const { result } = renderHook(() => useAuthState());

      // Should load from localStorage successfully
      expect(result.current.authState).toEqual(savedState);
      expect(fetchSpy).not.toHaveBeenCalled();

      // Should maintain session state offline
      act(() => {
        result.current.setSessionAuthenticated(true);
      });
      expect(result.current.sessionAuthenticated).toBe(true);

      // Should handle state updates offline
      act(() => {
        result.current.setAuthState({
          ...result.current.authState,
          status: 'authenticating',
        });
      });
      expect(result.current.authState.status).toBe('authenticating');

      // Should provide debug info offline
      const debugInfo = result.current.getDebugInfo();
      expect(debugInfo.authState.status).toBe('authenticating');
      expect(debugInfo.sessionAuthenticated).toBe(true);
    });

    test('handles complete offline authentication flow', () => {
      // Start with unauthenticated state
      const { result } = renderHook(() => useAuthState());

      expect(result.current.authState.status).toBe('unauthenticated');

      // Simulate PIN authentication (completely offline)
      act(() => {
        result.current.setAuthState({
          method: 'pin',
          status: 'authenticating',
          isPasskeySupported: false,
          isPWA: true,
        });
      });

      expect(result.current.authState.status).toBe('authenticating');
      expect(result.current.authState.method).toBe('pin');

      // Complete authentication
      act(() => {
        result.current.setAuthState({
          method: 'pin',
          status: 'authenticated',
          isPasskeySupported: false,
          isPWA: true,
          credentialId: undefined, // PIN doesn't use credentialId
        });
      });

      expect(result.current.authState.status).toBe('authenticated');
      expect(result.current.authState.method).toBe('pin');

      // Set session as authenticated
      act(() => {
        result.current.setSessionAuthenticated(true);
      });

      expect(result.current.sessionAuthenticated).toBe(true);
    });

    test('handles offline error recovery', () => {
      const { result } = renderHook(() => useAuthState());

      // Simulate a service failure during state update
      mockAuthValidationService.validateAndCorrectAuthState.mockImplementationOnce(
        () => {
          throw new Error('Service temporarily unavailable');
        }
      );

      const newState: AuthState = {
        method: 'passkey',
        status: 'authenticated',
        isPasskeySupported: true,
        isPWA: false,
      };

      // Should handle error gracefully
      expect(() => {
        act(() => {
          result.current.setAuthState(newState);
        });
      }).toThrow('Service temporarily unavailable');

      // Should log error appropriately
      expect(mockAuthLogger.error).toHaveBeenCalledWith(
        'useAuthState: Error in setAuthState',
        expect.any(Error)
      );

      // Hook should remain functional after error
      act(() => {
        result.current.setSessionAuthenticated(true);
      });
      expect(result.current.sessionAuthenticated).toBe(true);
    });
  });

  describe('No External Dependencies Validation', () => {
    test('does not depend on external APIs or services', () => {
      // Mock all potential external dependencies as unavailable
      const originalFetch = window.fetch;
      const originalXMLHttpRequest = window.XMLHttpRequest;
      const originalWebSocket = window.WebSocket;

      Object.defineProperty(window, 'fetch', {
        value: undefined,
        writable: true,
      });
      Object.defineProperty(window, 'XMLHttpRequest', {
        value: undefined,
        writable: true,
      });
      Object.defineProperty(window, 'WebSocket', {
        value: undefined,
        writable: true,
      });

      const { result } = renderHook(() => useAuthState());

      // Should work without any external APIs
      expect(result.current.authState).toBeDefined();

      // All operations should work
      act(() => {
        result.current.setAuthState({
          method: 'pin',
          status: 'authenticated',
          isPasskeySupported: false,
          isPWA: false,
        });
        result.current.setSessionAuthenticated(true);
      });

      expect(result.current.authState.status).toBe('authenticated');
      expect(result.current.sessionAuthenticated).toBe(true);

      // Restore original APIs
      Object.defineProperty(window, 'fetch', {
        value: originalFetch,
        writable: true,
      });
      Object.defineProperty(window, 'XMLHttpRequest', {
        value: originalXMLHttpRequest,
        writable: true,
      });
      Object.defineProperty(window, 'WebSocket', {
        value: originalWebSocket,
        writable: true,
      });
    });

    test('validates no network requests are made during operation', () => {
      const fetchSpy = vi.spyOn(window, 'fetch');
      const xhrSpy = vi.spyOn(window, 'XMLHttpRequest');

      const { result } = renderHook(() => useAuthState());

      // Perform various operations
      act(() => {
        result.current.setAuthState({
          method: 'passkey',
          status: 'authenticated',
          isPasskeySupported: true,
          isPWA: false,
        });
        result.current.setSessionAuthenticated(true);
      });

      const debugInfo = result.current.getDebugInfo();

      // No network requests should be made
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();

      // All operations should complete successfully
      expect(result.current.authState.status).toBe('authenticated');
      expect(result.current.sessionAuthenticated).toBe(true);
      expect(debugInfo).toBeDefined();
    });
  });

  describe('Performance in Offline Environment', () => {
    test('maintains good performance in offline mode', () => {
      const performanceSpy = vi.spyOn(performance, 'now');
      let callCount = 0;

      performanceSpy.mockImplementation(() => {
        callCount++;
        return callCount * 5; // 5ms increments for more realistic timing
      });

      const { result } = renderHook(() => useAuthState());

      // Measure performance of state updates
      const startTime = performance.now();

      act(() => {
        result.current.setAuthState({
          method: 'pin',
          status: 'authenticated',
          isPasskeySupported: false,
          isPWA: false,
        });
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should be reasonably fast (< 100ms for a state update in offline environment)
      expect(duration).toBeLessThan(100);

      // Performance should be logged
      expect(mockAuthLogger.performance).toHaveBeenCalledWith(
        'useAuthState.setAuthState.direct',
        5
      );
    });
  });
});
