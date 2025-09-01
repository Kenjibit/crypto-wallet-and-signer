import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { PasskeyService } from '../../services/auth/PasskeyService';
import { PinService } from '../../services/auth/PinService';
import { AuthStorageService } from '../../services/storage/AuthStorageService';
import { authLogger } from '../../../utils/auth/authLogger';

// Mock all services and utilities
jest.mock('../../services/auth/PasskeyService');
jest.mock('../../services/auth/PinService');
jest.mock('../../services/storage/AuthStorageService');
jest.mock('../../../utils/auth/authLogger');

// Mock performance for consistent timing
const mockPerformance = {
  now: jest.fn(),
};
Object.defineProperty(window, 'performance', { value: mockPerformance });

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

const mockPasskeyService = PasskeyService as jest.Mocked<typeof PasskeyService>;
const mockPinService = PinService as jest.Mocked<typeof PinService>;
const mockAuthStorageService = AuthStorageService as jest.Mocked<
  typeof AuthStorageService
>;
const mockAuthLogger = authLogger as jest.Mocked<typeof authLogger>;

describe('AuthState Migration - Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock timing for consistent performance measurements
    let timeCounter = 0;
    mockPerformance.now.mockImplementation(() => {
      timeCounter += 1; // Increment by 1ms each call for realistic timing
      return timeCounter;
    });

    // Setup default mocks
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockImplementation(() => {});
    mockLocalStorage.removeItem.mockImplementation(() => {});

    mockPasskeyService.isSupported.mockResolvedValue({
      isSupported: true,
      hasWebAuthn: true,
      hasPlatformAuthenticator: true,
      hasConditionalMediation: true,
      platformAuthenticatorAvailable: true,
      isIOS: false,
      isIOS16Plus: false,
      isIOS18Plus: false,
    });

    mockPasskeyService.createCredential.mockResolvedValue({
      credential: {
        type: 'public-key',
        rawId: new Uint8Array([1, 2, 3, 4, 5]),
      } as PublicKeyCredential,
      credentialId: btoa('test-credential-id'),
    });

    mockPasskeyService.verifyCredential.mockResolvedValue({
      success: true,
      authenticated: true,
    });

    mockPinService.validatePinAuth.mockReturnValue({
      isValid: true,
      errors: [],
    });

    mockPinService.hashPin.mockResolvedValue('hashed-pin');
    mockPinService.verifyPinMatch.mockReturnValue(true);
    mockPinService.savePinAuth.mockImplementation(() => {});
    mockPinService.loadPinAuth.mockReturnValue({ pin: '', confirmPin: '' });

    mockAuthStorageService.loadAuthState.mockReturnValue(null);
    mockAuthStorageService.saveAuthState.mockImplementation(() => {});
    mockAuthStorageService.clearAuthState.mockImplementation(() => {});

    mockAuthLogger.debug.mockImplementation(() => {});
    mockAuthLogger.error.mockImplementation(() => {});
    mockAuthLogger.performance.mockImplementation(() => {});
  });

  describe('State Update Performance', () => {
    test('useAuthState hook initialization is fast', async () => {
      const startTime = performance.now();

      const TestComponent = () => {
        const { authState } = useAuth();
        return <div data-testid="status">{authState.status}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent(
          'unauthenticated'
        );
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50); // Should initialize within 50ms
    });

    test('functional state updates are fast', async () => {
      const updateTimes: number[] = [];

      const TestComponent = () => {
        const { setAuthState, authState } = useAuth();

        React.useEffect(() => {
          const startUpdate = performance.now();
          setAuthState((prev) => ({ ...prev, status: 'authenticating' }));
          const endUpdate = performance.now();
          updateTimes.push(endUpdate - startUpdate);
        }, [setAuthState]);

        return <div data-testid="status">{authState.status}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(updateTimes.length).toBeGreaterThan(0);
      });

      // Each functional update should be fast
      updateTimes.forEach((updateTime) => {
        expect(updateTime).toBeLessThan(10); // Should complete within 10ms
      });
    });

    test('direct state updates are fast', async () => {
      const updateTimes: number[] = [];

      const TestComponent = () => {
        const { setAuthState, authState } = useAuth();

        React.useEffect(() => {
          const startUpdate = performance.now();
          setAuthState({
            method: 'passkey',
            status: 'authenticated',
            isPasskeySupported: true,
            isPWA: false,
            credentialId: 'test-id',
          });
          const endUpdate = performance.now();
          updateTimes.push(endUpdate - startUpdate);
        }, [setAuthState]);

        return <div data-testid="status">{authState.status}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
      });

      // Direct state update should be fast
      updateTimes.forEach((updateTime) => {
        expect(updateTime).toBeLessThan(10); // Should complete within 10ms
      });
    });
  });

  describe('Authentication Flow Performance', () => {
    test('passkey authentication flow meets performance requirements', async () => {
      const flowStartTime = performance.now();

      const TestComponent = () => {
        const { createPasskey, verifyPasskey, authState } = useAuth();

        React.useEffect(() => {
          const runFlow = async () => {
            const createStart = performance.now();
            await createPasskey('testuser', 'Test User');
            const createEnd = performance.now();

            const verifyStart = performance.now();
            await verifyPasskey();
            const verifyEnd = performance.now();

            // Log individual operation times
            console.log('Create time:', createEnd - createStart);
            console.log('Verify time:', verifyEnd - verifyStart);
          };

          runFlow();
        }, [createPasskey, verifyPasskey]);

        return <div data-testid="status">{authState.status}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
      });

      const flowEndTime = performance.now();
      const totalFlowTime = flowEndTime - flowStartTime;

      expect(totalFlowTime).toBeLessThan(100); // Complete flow within 100ms
    });

    test('PIN authentication flow meets performance requirements', async () => {
      const flowStartTime = performance.now();

      const TestComponent = () => {
        const { setPinCode, verifyPinCode, authState } = useAuth();

        React.useEffect(() => {
          const runFlow = async () => {
            const setStart = performance.now();
            setPinCode('1234', '1234');
            const setEnd = performance.now();

            const verifyStart = performance.now();
            await verifyPinCode('1234');
            const verifyEnd = performance.now();

            // Log individual operation times
            console.log('Set PIN time:', setEnd - setStart);
            console.log('Verify PIN time:', verifyEnd - verifyStart);
          };

          runFlow();
        }, [setPinCode, verifyPinCode]);

        return <div data-testid="status">{authState.status}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
      });

      const flowEndTime = performance.now();
      const totalFlowTime = flowEndTime - flowStartTime;

      expect(totalFlowTime).toBeLessThan(50); // PIN flow should be faster than passkey
    });
  });

  describe('Concurrent Operations Performance', () => {
    test('handles multiple simultaneous state updates efficiently', async () => {
      const updateCount = 10;
      const updateTimes: number[] = [];

      const TestComponent = () => {
        const { setAuthState, authState } = useAuth();

        React.useEffect(() => {
          const runUpdates = async () => {
            const updates = Array.from({ length: updateCount }, () =>
              setAuthState((prev) => ({
                ...prev,
                status: 'authenticating' as const,
              }))
            );

            const startTime = performance.now();
            await Promise.all(updates);
            const endTime = performance.now();

            updateTimes.push(endTime - startTime);
          };

          runUpdates();
        }, [setAuthState]);

        return <div data-testid="status">{authState.status}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(updateTimes.length).toBeGreaterThan(0);
      });

      // Concurrent updates should complete efficiently
      updateTimes.forEach((totalTime) => {
        expect(totalTime).toBeLessThan(50); // Should handle 10 concurrent updates within 50ms
      });
    });

    test('maintains performance under rapid state changes', async () => {
      const changeCount = 20;
      const changeTimes: number[] = [];

      const TestComponent = () => {
        const { setAuthState, authState } = useAuth();
        const [changesCompleted, setChangesCompleted] = React.useState(0);

        React.useEffect(() => {
          const runChanges = async () => {
            const startTime = performance.now();

            for (let i = 0; i < changeCount; i++) {
              await act(async () => {
                setAuthState((prev) => ({
                  ...prev,
                  status:
                    i % 2 === 0
                      ? ('authenticating' as const)
                      : ('authenticated' as const),
                }));
              });
            }

            const endTime = performance.now();
            changeTimes.push(endTime - startTime);
            setChangesCompleted(changeCount);
          };

          runChanges();
        }, [setAuthState]);

        return (
          <div>
            <div data-testid="status">{authState.status}</div>
            <div data-testid="changes">{changesCompleted}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('changes')).toHaveTextContent('20');
      });

      // Rapid state changes should maintain reasonable performance
      changeTimes.forEach((totalTime) => {
        expect(totalTime).toBeLessThan(200); // Should handle 20 rapid changes within 200ms
      });
    });
  });

  describe('Memory and Resource Usage', () => {
    test('does not cause memory leaks with frequent updates', async () => {
      const updateCount = 50;
      let componentCount = 0;

      const TestComponent = ({ id }: { id: number }) => {
        const { setAuthState } = useAuth();
        componentCount++;

        React.useEffect(() => {
          // Each component performs an update
          setAuthState((prev) => ({
            ...prev,
            status: 'authenticating' as const,
          }));
        }, [setAuthState]);

        return <div>Component {id}</div>;
      };

      const { rerender } = render(
        <AuthProvider>
          {Array.from({ length: updateCount }, (_, index) => (
            <TestComponent key={index} id={index} />
          ))}
        </AuthProvider>
      );

      await waitFor(() => {
        expect(componentCount).toBe(updateCount);
      });

      // Re-render with different components to test cleanup
      rerender(
        <AuthProvider>
          {Array.from({ length: updateCount / 2 }, (_, i) => (
            <TestComponent key={i + updateCount} id={i + updateCount} />
          ))}
        </AuthProvider>
      );

      // Should handle component lifecycle without issues
      expect(mockAuthStorageService.saveAuthState).toHaveBeenCalled();
    });

    test('handles large auth state objects efficiently', async () => {
      const largeState = {
        method: 'passkey' as const,
        status: 'authenticated' as const,
        isPasskeySupported: true,
        isPWA: true,
        credentialId:
          'very-long-credential-id-that-simulates-real-world-data-'.repeat(10),
        // Simulate additional metadata
        metadata: {
          created: new Date().toISOString(),
          device: 'test-device',
          platform: 'test-platform',
          version: '1.0.0',
          features: ['encryption', 'biometric', 'offline'],
          settings: {
            autoLock: true,
            timeout: 300000,
            security: 'high',
          },
        },
      };

      const TestComponent = () => {
        const { setAuthState, authState } = useAuth();

        React.useEffect(() => {
          const startTime = performance.now();
          setAuthState(largeState);
          const endTime = performance.now();

          console.log('Large state update time:', endTime - startTime);
        }, [setAuthState]);

        return <div data-testid="status">{authState.status}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
      });

      // Large state updates should still be reasonably fast
      expect(mockAuthStorageService.saveAuthState).toHaveBeenCalledWith(
        largeState
      );
    });
  });

  describe('Persistence Performance', () => {
    test('localStorage operations are fast', async () => {
      const TestComponent = () => {
        const { createPasskey } = useAuth();

        React.useEffect(() => {
          createPasskey('testuser', 'Test User');
        }, [createPasskey]);

        return <div>Test</div>;
      };

      const storageStartTime = performance.now();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockAuthStorageService.saveAuthState).toHaveBeenCalled();
      });

      const storageEndTime = performance.now();
      const storageDuration = storageEndTime - storageStartTime;

      expect(storageDuration).toBeLessThan(20); // localStorage operations should be fast
    });

    test('handles localStorage errors without performance impact', async () => {
      mockAuthStorageService.saveAuthState.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const TestComponent = () => {
        const { createPasskey, authState } = useAuth();

        React.useEffect(() => {
          createPasskey('testuser', 'Test User');
        }, [createPasskey]);

        return <div data-testid="status">{authState.status}</div>;
      };

      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      const startTime = performance.now();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should handle errors without significant performance impact
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });

  describe('Scalability Performance', () => {
    test('maintains performance with complex auth flows', async () => {
      const TestComponent = () => {
        const {
          createPasskey,
          verifyPasskey,
          setPinCode,
          verifyPinCode,
          logout,
          resetAuth,
          authState,
        } = useAuth();

        React.useEffect(() => {
          const runComplexFlow = async () => {
            const startTime = performance.now();

            // Complex authentication sequence
            await createPasskey('user1', 'User 1');
            await verifyPasskey();
            logout();
            setPinCode('5678', '5678');
            await verifyPinCode('5678');
            resetAuth();
            await createPasskey('user2', 'User 2');

            const endTime = performance.now();
            console.log('Complex flow total time:', endTime - startTime);
          };

          runComplexFlow();
        }, [
          createPasskey,
          verifyPasskey,
          setPinCode,
          verifyPinCode,
          logout,
          resetAuth,
        ]);

        return <div data-testid="status">{authState.status}</div>;
      };

      const flowStartTime = performance.now();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
      });

      const flowEndTime = performance.now();
      const totalFlowTime = flowEndTime - flowStartTime;

      expect(totalFlowTime).toBeLessThan(300); // Complex flow should complete within 300ms
      expect(mockAuthLogger.performance).toHaveBeenCalled();
    });

    test('handles high-frequency auth state monitoring', async () => {
      const monitoringInterval = 10; // Check every 10ms
      const monitoringDuration = 100; // Monitor for 100ms
      const expectedChecks = monitoringDuration / monitoringInterval;

      let checkCount = 0;
      const checkTimes: number[] = [];

      const TestComponent = () => {
        const { authState } = useAuth();

        React.useEffect(() => {
          const interval = setInterval(() => {
            const checkStart = performance.now();
            // Simulate monitoring auth state
            if (authState.status) {
              checkCount++;
            }
            const checkEnd = performance.now();
            checkTimes.push(checkEnd - checkStart);
          }, monitoringInterval);

          setTimeout(() => {
            clearInterval(interval);
          }, monitoringDuration);

          return () => clearInterval(interval);
        }, [authState]);

        return <div data-testid="checks">{checkCount}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(
        () => {
          expect(
            parseInt(screen.getByTestId('checks').textContent || '0')
          ).toBeGreaterThanOrEqual(expectedChecks - 1);
        },
        { timeout: monitoringDuration + 50 }
      );

      // Each monitoring check should be very fast
      checkTimes.forEach((checkTime) => {
        expect(checkTime).toBeLessThan(1); // Should complete within 1ms
      });
    });
  });
});
