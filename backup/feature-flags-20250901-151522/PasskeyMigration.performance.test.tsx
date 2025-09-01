import React from 'react';
import { render, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { usePasskeyAuth } from '../../hooks/usePasskeyAuth';
import { PasskeyService } from '../../services/auth/PasskeyService';

// Mock all dependencies
jest.mock('../../services/auth/PasskeyService');
jest.mock('../../hooks/usePasskeyAuth');
jest.mock('../../../utils/auth/authLogger');

const mockPasskeyService = PasskeyService as jest.Mocked<typeof PasskeyService>;
const mockUsePasskeyAuth = usePasskeyAuth as jest.MockedFunction<
  typeof usePasskeyAuth
>;

describe('Passkey Migration - Performance Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });

    // Mock PasskeyService
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
      credential: {} as PublicKeyCredential,
      credentialId: 'test-credential-id',
    });

    mockPasskeyService.verifyCredential.mockResolvedValue({
      success: true,
      authenticated: true,
    });
  });

  describe('Hook Performance vs Legacy Performance', () => {
    test('hook implementation should be performant under load', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';

      // Mock fast hook implementation
      const mockHook = {
        createPasskey: jest.fn().mockResolvedValue(true),
        verifyPasskey: jest.fn().mockResolvedValue(true),
        verifyCredentialExists: jest.fn().mockResolvedValue(true),
        encryptWithPasskey: jest.fn().mockResolvedValue('encrypted'),
        decryptWithPasskey: jest.fn().mockResolvedValue('decrypted'),
        testPasskeyEncryption: jest.fn().mockResolvedValue(true),
        isLoading: false,
        error: null,
        clearError: jest.fn(),
      };
      mockUsePasskeyAuth.mockReturnValue(mockHook);

      const TestComponent = () => {
        const { createPasskey } = useAuth();
        const [operations, setOperations] = React.useState(0);

        const runOperations = async () => {
          const startTime = performance.now();

          // Run multiple operations
          for (let i = 0; i < 10; i++) {
            await createPasskey(`user${i}`, `User ${i}`);
          }

          const endTime = performance.now();
          const duration = endTime - startTime;

          setOperations(10);
          // Store duration for assertion
          (window as unknown as Record<string, unknown>).testDuration =
            duration;
        };

        return (
          <div>
            <div data-testid="operations">{operations}</div>
            <button onClick={runOperations} data-testid="run-btn">
              Run Operations
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        // Click to run operations
        const button = document.querySelector('[data-testid="run-btn"]');
        if (button) {
          (button as HTMLButtonElement).click();
        }
      });

      // Verify operations completed
      expect(mockHook.createPasskey).toHaveBeenCalledTimes(10);

      // Performance should be reasonable (< 100ms per operation on average)
      const duration = (window as unknown as Record<string, unknown>)
        .testDuration as number;
      expect(duration).toBeLessThan(1000); // Less than 1 second for 10 operations

      process.env = originalEnv;
    });

    test('legacy implementation performance baseline', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'false';

      // Mock fast service implementation
      mockPasskeyService.createCredential.mockResolvedValue({
        credential: {} as PublicKeyCredential,
        credentialId: 'test-credential-id',
      });

      const TestComponent = () => {
        const { createPasskey } = useAuth();
        const [operations, setOperations] = React.useState(0);

        const runOperations = async () => {
          const startTime = performance.now();

          // Run multiple operations
          for (let i = 0; i < 10; i++) {
            await createPasskey(`user${i}`, `User ${i}`);
          }

          const endTime = performance.now();
          const duration = endTime - startTime;

          setOperations(10);
          // Store duration for assertion
          (window as unknown as Record<string, unknown>).testDuration =
            duration;
        };

        return (
          <div>
            <div data-testid="operations">{operations}</div>
            <button onClick={runOperations} data-testid="run-btn">
              Run Operations
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        // Click to run operations
        const button = document.querySelector('[data-testid="run-btn"]');
        if (button) {
          (button as HTMLButtonElement).click();
        }
      });

      // Verify operations completed
      expect(mockPasskeyService.createCredential).toHaveBeenCalledTimes(10);

      // Performance should be reasonable (< 100ms per operation on average)
      const duration = (window as unknown as Record<string, unknown>)
        .testDuration as number;
      expect(duration).toBeLessThan(1000); // Less than 1 second for 10 operations

      process.env = originalEnv;
    });
  });

  describe('Memory Usage and Cleanup', () => {
    test('hook cleanup should prevent memory leaks', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';

      const mockHook = {
        createPasskey: jest.fn().mockResolvedValue(true),
        verifyPasskey: jest.fn().mockResolvedValue(true),
        verifyCredentialExists: jest.fn().mockResolvedValue(true),
        encryptWithPasskey: jest.fn().mockResolvedValue('encrypted'),
        decryptWithPasskey: jest.fn().mockResolvedValue('decrypted'),
        testPasskeyEncryption: jest.fn().mockResolvedValue(true),
        isLoading: false,
        error: null,
        clearError: jest.fn(),
      };
      mockUsePasskeyAuth.mockReturnValue(mockHook);

      let componentMounted = true;

      const TestComponent = () => {
        const { createPasskey } = useAuth();

        React.useEffect(() => {
          return () => {
            componentMounted = false;
          };
        }, []);

        const handleCreate = async () => {
          if (componentMounted) {
            await createPasskey('testuser', 'Test User');
          }
        };

        return (
          <button onClick={handleCreate} data-testid="create-btn">
            Create
          </button>
        );
      };

      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        const button = document.querySelector('[data-testid="create-btn"]');
        if (button) {
          (button as HTMLButtonElement).click();
        }
      });

      // Unmount component
      unmount();

      // Verify hook was called but component cleanup worked
      expect(mockHook.createPasskey).toHaveBeenCalledTimes(1);
      expect(componentMounted).toBe(false);

      process.env = originalEnv;
    });
  });

  describe('Concurrent Operations', () => {
    test('multiple concurrent passkey operations should work correctly', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';

      const mockHook = {
        createPasskey: jest.fn().mockImplementation(async () => {
          // Simulate different response times
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 100)
          );
          return true;
        }),
        verifyPasskey: jest.fn().mockResolvedValue(true),
        verifyCredentialExists: jest.fn().mockResolvedValue(true),
        encryptWithPasskey: jest.fn().mockResolvedValue('encrypted'),
        decryptWithPasskey: jest.fn().mockResolvedValue('decrypted'),
        testPasskeyEncryption: jest.fn().mockResolvedValue(true),
        isLoading: false,
        error: null,
        clearError: jest.fn(),
      };
      mockUsePasskeyAuth.mockReturnValue(mockHook);

      const TestComponent = () => {
        const { createPasskey } = useAuth();
        const [completed, setCompleted] = React.useState(0);

        const runConcurrent = async () => {
          const promises = [];
          for (let i = 0; i < 5; i++) {
            promises.push(
              createPasskey(`user${i}`, `User ${i}`).then(() => {
                setCompleted((prev) => prev + 1);
              })
            );
          }
          await Promise.all(promises);
        };

        return (
          <div>
            <div data-testid="completed">{completed}</div>
            <button onClick={runConcurrent} data-testid="run-btn">
              Run Concurrent
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        const button = document.querySelector('[data-testid="run-btn"]');
        if (button) {
          (button as HTMLButtonElement).click();
        }
      });

      // All operations should complete
      expect(mockHook.createPasskey).toHaveBeenCalledTimes(5);

      process.env = originalEnv;
    });
  });

  describe('Scalability Testing', () => {
    test('hook should handle rapid successive operations', async () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION = 'true';

      const mockHook = {
        createPasskey: jest.fn().mockResolvedValue(true),
        verifyPasskey: jest.fn().mockResolvedValue(true),
        verifyCredentialExists: jest.fn().mockResolvedValue(true),
        encryptWithPasskey: jest.fn().mockResolvedValue('encrypted'),
        decryptWithPasskey: jest.fn().mockResolvedValue('decrypted'),
        testPasskeyEncryption: jest.fn().mockResolvedValue(true),
        isLoading: false,
        error: null,
        clearError: jest.fn(),
      };
      mockUsePasskeyAuth.mockReturnValue(mockHook);

      const TestComponent = () => {
        const { createPasskey } = useAuth();
        const [operations, setOperations] = React.useState(0);

        const rapidFire = async () => {
          const startTime = performance.now();

          // Rapid succession of operations
          const promises = [];
          for (let i = 0; i < 20; i++) {
            promises.push(createPasskey(`user${i}`, `User ${i}`));
          }

          await Promise.all(promises);
          setOperations(20);

          const endTime = performance.now();
          const duration = endTime - startTime;

          // Should complete within reasonable time
          expect(duration).toBeLessThan(2000); // Less than 2 seconds for 20 operations
        };

        return (
          <div>
            <div data-testid="operations">{operations}</div>
            <button onClick={rapidFire} data-testid="rapid-btn">
              Rapid Fire
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        const button = document.querySelector('[data-testid="rapid-btn"]');
        if (button) {
          (button as HTMLButtonElement).click();
        }
      });

      expect(mockHook.createPasskey).toHaveBeenCalledTimes(20);

      process.env = originalEnv;
    });
  });
});
