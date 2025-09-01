# AuthContext Refactoring Plan: Breaking the 1,666-Line Monstrosity

## Executive Summary

This plan provides a systematic approach to refactor the AuthContext from a single 1,666-line file handling multiple responsibilities into a well-structured, maintainable architecture. The refactoring will be done in small, validated steps with comprehensive testing and rollback procedures.

**Risk Level**: Medium-High (requires careful testing due to authentication-critical nature)
**Timeline**: 8-12 weeks (depending on testing thoroughness)
**Validation**: Each step includes automated and manual validation procedures

---

## Phase 0: Preparation & Analysis (Week 1)

### Step 0.1: Current State Analysis

**Duration**: 1-2 days
**Risk**: None

#### Tasks:

1. **Code Analysis**

   - Count lines per responsibility area
   - Map all imports/exports
   - Identify circular dependencies
   - Document all external dependencies

2. **Create Baseline Metrics**
   - Bundle size measurement
   - Performance benchmarks
   - Memory usage analysis
   - Existing test coverage

#### Validation:

- ✅ Code analysis report completed
- ✅ Baseline metrics documented
- ✅ No functional changes made

#### Rollback:

- No changes to revert

### Step 0.2: Environment Setup

**Duration**: 1 day
**Risk**: Low

#### Tasks:

1. **Branch Strategy**

   ```bash
   git checkout -b auth-refactor-main
   git checkout -b auth-refactor-phase1
   ```

2. **Testing Infrastructure**

   ```bash
   npm install --save-dev @testing-library/jest-dom
   npm install --save-dev jest-environment-jsdom
   ```

3. **Feature Flags Setup**
   ```tsx
   // src/config/features.ts
   export const FEATURES = {
     NEW_AUTH_STRUCTURE: process.env.NEXT_PUBLIC_NEW_AUTH_STRUCTURE === 'true',
     ENCRYPTION_SERVICES:
       process.env.NEXT_PUBLIC_ENCRYPTION_SERVICES === 'true',
   } as const;
   ```

#### Validation:

- ✅ Feature flags working correctly
- ✅ Testing environment functional
- ✅ Branch strategy documented

#### Rollback:

- Delete feature flag file
- Remove test dependencies if needed

---

## Phase 1: Safe Extractions (Weeks 2-3)

### Step 1.1: Remove Development-Only Code

**Duration**: 2-3 days
**Risk**: Low
**Lines to Remove**: ~150 lines

#### Tasks:

1. **Extract Stress Testing Utilities**

   ```tsx
   // Create: src/utils/auth/stressTestUtils.ts
   export const createStressTestUtils = () => ({
     // Move all stress testing functions here
   });

   // In AuthContext: Remove all stress test utilities
   const stressTestUtils =
     process.env.NODE_ENV === 'development' ? createStressTestUtils() : null;
   ```

2. **Extract Debug Logging**
   ```tsx
   // Create: src/utils/auth/authLogger.ts
   export const authLogger = {
     debug: (message: string, data?: any) => {
       if (process.env.NODE_ENV === 'development') {
         console.log(`🔐 ${message}`, data);
       }
     },
   };
   ```

#### Validation:

```tsx
// Step 1.1 Validation Tests
describe('AuthContext - Phase 1.1', () => {
  test('stressTestUtils not available in production', () => {
    process.env.NODE_ENV = 'production';
    const { stressTestUtils } = renderAuthContext();
    expect(stressTestUtils).toBeNull();
  });

  test('stressTestUtils available in development', () => {
    process.env.NODE_ENV = 'development';
    const { stressTestUtils } = renderAuthContext();
    expect(stressTestUtils).toBeDefined();
    expect(typeof stressTestUtils.resetToCleanState).toBe('function');
  });
});
```

#### Rollback:

```bash
# Revert specific commits
git revert HEAD~2..HEAD
# Or restore from backup
cp AuthContext.backup.tsx src/contexts/AuthContext.tsx
```

### Step 1.2: Extract Pure Validation Functions

**Duration**: 2-3 days
**Risk**: Low
**Lines to Extract**: ~200 lines

#### Tasks:

1. **Create Validation Service**

   ```tsx
   // src/services/validation/AuthValidationService.ts
   export class AuthValidationService {
     static validateAuthState(state: AuthState): ValidationResult {
       // Move all validation logic here
     }

     static validatePasskeyCreation(state: AuthState): boolean {
       // Move passkey validation logic here
     }
   }
   ```

2. **Update AuthContext Imports**
   ```tsx
   // Remove inline validation functions
   // Add import
   import { AuthValidationService } from '../../services/validation/AuthValidationService';
   ```

#### Validation:

```tsx
// Step 1.2 Validation Tests
describe('AuthValidationService', () => {
  test('validates correct auth state', () => {
    const validState = createValidAuthState();
    const result = AuthValidationService.validateAuthState(validState);
    expect(result.isValid).toBe(true);
  });

  test('detects invalid PIN method with credentialId', () => {
    const invalidState = createInvalidAuthState();
    const result = AuthValidationService.validateAuthState(invalidState);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('PIN method cannot have credentialId');
  });
});
```

#### Rollback:

- Revert validation service extraction
- Restore inline validation functions

### Step 1.3: Extract Console Logging

**Duration**: 1-2 days
**Risk**: Low
**Lines to Reduce**: ~100 lines

#### Tasks:

1. **Create Production-Safe Logger**

   ```tsx
   // src/utils/auth/authLogger.ts
   export const authLogger = {
     debug: (message: string, data?: any) => {
       if (process.env.NODE_ENV === 'development') {
         console.log(`🔐 ${message}`, data);
       }
     },
     info: (message: string, data?: any) => {
       console.info(`🔐 ${message}`, data);
     },
     error: (message: string, error?: Error) => {
       console.error(`🔐 ${message}`, error);
     },
   };
   ```

2. **Replace All Console Statements**
   ```tsx
   // Before: console.log('🔍 validateAndCorrectAuthState called with:', state);
   // After: authLogger.debug('validateAndCorrectAuthState called', { state });
   ```

#### Validation:

```tsx
// Step 1.3 Validation Tests
describe('AuthLogger', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  test('logs in development mode', () => {
    process.env.NODE_ENV = 'development';
    authLogger.debug('test message', { data: 'test' });
    expect(console.log).toHaveBeenCalledWith('🔐 test message', {
      data: 'test',
    });
  });

  test('does not log in production mode', () => {
    process.env.NODE_ENV = 'production';
    authLogger.debug('test message');
    expect(console.log).not.toHaveBeenCalled();
  });
});
```

#### Rollback:

- Restore original console statements
- Remove logger utility

---

## Phase 2: Service Layer Extraction (Weeks 4-6)

### Step 2.1: Extract Passkey Service

**Duration**: 3-4 days
**Risk**: Medium
**Lines to Extract**: ~300 lines

#### Tasks:

1. **Create Passkey Service Class**

   ```tsx
   // src/services/auth/PasskeyService.ts
   export class PasskeyService {
     static async createCredential(
       username: string,
       displayName: string
     ): Promise<PublicKeyCredential> {
       // Move all passkey creation logic here
     }

     static async verifyCredential(credentialId: string): Promise<boolean> {
       // Move all passkey verification logic here
     }

     static async isSupported(): Promise<boolean> {
       // Move platform authenticator checks here
     }
   }
   ```

2. **Update AuthContext to Use Service**
   ```tsx
   // Replace inline passkey logic with service calls
   const createPasskey = useCallback(
     async (username: string, displayName: string) => {
       try {
         const credential = await PasskeyService.createCredential(
           username,
           displayName
         );
         // Handle success
       } catch (error) {
         // Handle error
       }
     },
     []
   );
   ```

#### Validation:

```tsx
// Step 2.1 Validation Tests
describe('PasskeyService', () => {
  beforeEach(() => {
    // Mock WebAuthn API
    Object.defineProperty(navigator, 'credentials', {
      value: mockWebAuthn,
      writable: true,
    });
  });

  test('creates passkey successfully', async () => {
    const result = await PasskeyService.createCredential('test', 'Test User');
    expect(result).toBeDefined();
    expect(result.type).toBe('public-key');
  });

  test('handles user cancellation', async () => {
    mockWebAuthn.create.mockRejectedValue(new Error('User cancelled'));
    await expect(
      PasskeyService.createCredential('test', 'Test User')
    ).rejects.toThrow('User cancelled');
  });
});
```

#### Rollback:

- Restore inline passkey logic
- Remove PasskeyService class

### Step 2.2: Extract PIN Service

**Duration**: 2-3 days
**Risk**: Medium
**Lines to Extract**: ~150 lines

#### Tasks:

1. **Create PIN Service Class**

   ```tsx
   // src/services/auth/PinService.ts
   export class PinService {
     static validatePin(pin: string): boolean {
       return /^\d{4}$/.test(pin);
     }

     static async hashPin(pin: string): Promise<string> {
       // Secure PIN hashing logic
     }

     static async verifyPin(pin: string, hashedPin: string): Promise<boolean> {
       // PIN verification logic
     }
   }
   ```

#### Validation:

```tsx
// Step 2.2 Validation Tests
describe('PinService', () => {
  test('validates correct PIN format', () => {
    expect(PinService.validatePin('1234')).toBe(true);
    expect(PinService.validatePin('123')).toBe(false);
    expect(PinService.validatePin('abcd')).toBe(false);
  });

  test('hashes and verifies PIN correctly', async () => {
    const pin = '1234';
    const hashed = await PinService.hashPin(pin);
    const isValid = await PinService.verifyPin(pin, hashed);
    expect(isValid).toBe(true);
  });
});
```

#### Rollback:

- Restore inline PIN logic
- Remove PinService class

### Step 2.3: Extract Encryption Services

**Duration**: 4-5 days
**Risk**: High
**Lines to Extract**: ~400 lines

#### Tasks:

1. **Create Encryption Service**

   ```tsx
   // src/services/encryption/PasskeyEncryptionService.ts
   export class PasskeyEncryptionService {
     static async encrypt(data: string, credentialId: string): Promise<string> {
       // Move passkey encryption logic here
     }

     static async decrypt(
       encryptedData: string,
       credentialId: string
     ): Promise<string> {
       // Move passkey decryption logic here
     }
   }
   ```

2. **Create PIN Encryption Service**

   ```tsx
   // src/services/encryption/PinEncryptionService.ts
   export class PinEncryptionService {
     static async encrypt(data: string, pin: string): Promise<string> {
       // Move PIN encryption logic here
     }

     static async decrypt(encryptedData: string, pin: string): Promise<string> {
       // Move PIN decryption logic here
     }
   }
   ```

#### Validation:

```tsx
// Step 2.3 Validation Tests
describe('Encryption Services', () => {
  test('passkey encryption round trip', async () => {
    const testData = 'sensitive wallet data';
    const mockCredentialId = 'mock-credential-id';

    const encrypted = await PasskeyEncryptionService.encrypt(
      testData,
      mockCredentialId
    );
    const decrypted = await PasskeyEncryptionService.decrypt(
      encrypted,
      mockCredentialId
    );

    expect(decrypted).toBe(testData);
  });

  test('PIN encryption round trip', async () => {
    const testData = 'sensitive wallet data';
    const pin = '1234';

    const encrypted = await PinEncryptionService.encrypt(testData, pin);
    const decrypted = await PinEncryptionService.decrypt(encrypted, pin);

    expect(decrypted).toBe(testData);
  });
});
```

#### Rollback:

- Restore inline encryption logic
- Remove encryption service classes

### Step 2.4: Extract Storage Service

**Duration**: 2-3 days
**Risk**: Medium
**Lines to Extract**: ~100 lines

#### Tasks:

1. **Create Storage Service**

   ```tsx
   // src/services/storage/AuthStorageService.ts
   export class AuthStorageService {
     private static readonly KEYS = {
       AUTH_STATE: 'ltc-signer-auth',
       PIN_DATA: 'ltc-signer-pin',
     } as const;

     static saveAuthState(state: AuthState): void {
       // Safe localStorage operations with error handling
     }

     static loadAuthState(): AuthState | null {
       // Safe localStorage loading with validation
     }
   }
   ```

#### Validation:

```tsx
// Step 2.4 Validation Tests
describe('AuthStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(console, 'error').mockImplementation();
  });

  test('saves and loads auth state correctly', () => {
    const testState = createValidAuthState();
    AuthStorageService.saveAuthState(testState);
    const loaded = AuthStorageService.loadAuthState();
    expect(loaded).toEqual(testState);
  });

  test('handles localStorage errors gracefully', () => {
    // Mock localStorage error
    jest.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });

    const testState = createValidAuthState();
    expect(() => AuthStorageService.saveAuthState(testState)).not.toThrow();
    expect(console.error).toHaveBeenCalled();
  });
});
```

#### Rollback:

- Restore inline localStorage operations
- Remove AuthStorageService class

---

## Phase 3: Context Decomposition (Weeks 7-9)

### Step 3.1: Create Auth State Hook

**Duration**: 3-4 days
**Risk**: Medium-High
**Lines to Extract**: ~250 lines

#### Tasks:

1. **Create Auth State Hook**

   ```tsx
   // src/hooks/useAuthState.ts
   export const useAuthState = () => {
     const [authState, setAuthStateInternal] = useState<AuthState>(() => {
       // Move state initialization logic here
     });

     const setAuthState = useCallback((newState) => {
       // Move state update logic with validation here
     }, []);

     return { authState, setAuthState };
   };
   ```

2. **Create Feature Flag Wrapper**
   ```tsx
   // Allow gradual migration
   const { authState, setAuthState } = FEATURES.NEW_AUTH_STRUCTURE
     ? useAuthState()
     : useLegacyAuthState();
   ```

#### Validation:

```tsx
// Step 3.1 Validation Tests
describe('useAuthState Hook', () => {
  test('initializes with correct default state', () => {
    const { result } = renderHook(() => useAuthState());
    expect(result.current.authState.status).toBe('unauthenticated');
    expect(result.current.authState.method).toBeNull();
  });

  test('updates state correctly', () => {
    const { result } = renderHook(() => useAuthState());

    act(() => {
      result.current.setAuthState({
        ...result.current.authState,
        status: 'authenticated',
        method: 'passkey',
      });
    });

    expect(result.current.authState.status).toBe('authenticated');
    expect(result.current.authState.method).toBe('passkey');
  });
});
```

#### Rollback:

- Disable feature flag
- Restore original state management

### Step 3.2: Create Authentication Hooks

**Duration**: 3-4 days
**Risk**: Medium-High
**Lines to Extract**: ~350 lines

#### Tasks:

1. **Create Passkey Hook**

   ```tsx
   // src/hooks/usePasskeyAuth.ts
   export const usePasskeyAuth = () => {
     const createPasskey = useCallback(
       async (username: string, displayName: string) => {
         // Use PasskeyService
       },
       []
     );

     const verifyPasskey = useCallback(async () => {
       // Use PasskeyService
     }, []);

     return { createPasskey, verifyPasskey };
   };
   ```

2. **Create PIN Hook**
   ```tsx
   // src/hooks/usePinAuth.ts
   export const usePinAuth = () => {
     // Similar structure for PIN operations
   };
   ```

#### Validation:

```tsx
// Step 3.2 Validation Tests
describe('Authentication Hooks', () => {
  test('passkey creation works end-to-end', async () => {
    const { result } = renderHook(() => usePasskeyAuth());

    await act(async () => {
      await result.current.createPasskey('test', 'Test User');
    });

    // Verify auth state was updated
    // Verify credential was created
  });

  test('PIN verification works correctly', async () => {
    const { result } = renderHook(() => usePinAuth());

    act(() => {
      result.current.setPinCode('1234', '1234');
    });

    const isValid = await result.current.verifyPinCode('1234');
    expect(isValid).toBe(true);
  });
});
```

#### Rollback:

- Disable feature flags for new hooks
- Restore original inline functions

### Step 3.3: Create Encryption Hooks

**Duration**: 3-4 days
**Risk**: High
**Lines to Extract**: ~200 lines

#### Tasks:

1. **Create Encryption Hook**

   ```tsx
   // src/hooks/useEncryption.ts
   export const useEncryption = () => {
     const encryptWithPasskey = useCallback(
       async (data: string) => {
         // Use encryption services
       },
       [credentialId]
     );

     const decryptWithPasskey = useCallback(
       async (encryptedData: string) => {
         // Use encryption services
       },
       [credentialId]
     );

     return { encryptWithPasskey, decryptWithPasskey };
   };
   ```

#### Validation:

```tsx
// Step 3.3 Validation Tests
describe('Encryption Hooks', () => {
  test('passkey encryption/decryption round trip', async () => {
    const { result } = renderHook(() => useEncryption());
    const testData = 'sensitive data';

    const encrypted = await result.current.encryptWithPasskey(testData);
    const decrypted = await result.current.decryptWithPasskey(encrypted);

    expect(decrypted).toBe(testData);
  });

  test('handles encryption errors gracefully', async () => {
    const { result } = renderHook(() => useEncryption());

    // Mock encryption service failure
    await expect(result.current.encryptWithPasskey('test')).rejects.toThrow();
  });
});
```

#### Rollback:

- Disable encryption feature flag
- Restore original encryption functions

---

## Phase 4: Final Integration & Cleanup (Weeks 10-12)

### Step 4.1: Update AuthContext to Use New Architecture

**Duration**: 3-4 days
**Risk**: High
**Lines to Reduce**: ~1000+ lines

#### Tasks:

1. **Refactor AuthContext to Composition**

   ```tsx
   // src/contexts/auth/AuthProvider.tsx
   export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
     // Use new hooks instead of inline logic
     const authState = useAuthState();
     const passkey = usePasskeyAuth();
     const pin = usePinAuth();
     const encryption = useEncryption();

     const value = useMemo(
       () => ({
         ...authState,
         ...passkey,
         ...pin,
         ...encryption,
       }),
       [authState, passkey, pin, encryption]
     );

     return (
       <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
     );
   };
   ```

#### Validation:

```tsx
// Step 4.1 Validation Tests
describe('Refactored AuthProvider', () => {
  test('provides all expected methods', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current.authState).toBeDefined();
    expect(result.current.createPasskey).toBeDefined();
    expect(result.current.verifyPasskey).toBeDefined();
    expect(result.current.setPinCode).toBeDefined();
    expect(result.current.encryptWithPasskey).toBeDefined();
  });

  test('maintains backward compatibility', () => {
    // Test that existing components still work
    const TestComponent = () => {
      const { authState, createPasskey } = useAuth();
      return <div>{authState.status}</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('unauthenticated')).toBeInTheDocument();
  });
});
```

#### Rollback:

- Restore original AuthContext
- Keep new services as separate modules

### Step 4.2: Performance & Bundle Analysis

**Duration**: 2-3 days
**Risk**: Low

#### Tasks:

1. **Bundle Size Analysis**

   ```bash
   npm run build
   npx webpack-bundle-analyzer dist/static/chunks/*.js
   ```

2. **Performance Testing**
   ```tsx
   // src/__tests__/performance/AuthPerformance.test.tsx
   describe('Auth Performance', () => {
     test('auth state updates are fast', () => {
       const start = performance.now();
       // Perform auth state update
       const end = performance.now();
       expect(end - start).toBeLessThan(10); // Less than 10ms
     });
   });
   ```

#### Validation:

- ✅ Bundle size reduced by at least 30%
- ✅ No performance regressions
- ✅ Memory usage within acceptable limits

### Step 4.3: Documentation & Final Cleanup

**Duration**: 2-3 days
**Risk**: Low

#### Tasks:

1. **Update Documentation**

   ```markdown
   // docs/architecture/auth-refactor.md

   # AuthContext Refactoring

   ## Before: 1,666 lines in single file

   ## After: Modular architecture with clear separation of concerns
   ```

2. **Remove Feature Flags**
   ```bash
   # After thorough testing, remove feature flags
   git grep -r "FEATURES.NEW_AUTH_STRUCTURE" -- src/
   # Remove all feature flag checks
   ```

#### Validation:

- ✅ All documentation updated
- ✅ No feature flags remaining in production code
- ✅ All tests passing

---

## Risk Mitigation Strategies

### 1. Feature Flags Strategy

```tsx
// src/config/features.ts
export const FEATURES = {
  NEW_AUTH_STRUCTURE: process.env.NEXT_PUBLIC_NEW_AUTH_STRUCTURE === 'true',
  PASSPHRASE_ENCRYPTION:
    process.env.NEXT_PUBLIC_PASSPHRASE_ENCRYPTION === 'true',
  STORAGE_SERVICE: process.env.NEXT_PUBLIC_STORAGE_SERVICE === 'true',
} as const;

// Usage in components
const authHook = FEATURES.NEW_AUTH_STRUCTURE
  ? useAuthState
  : useLegacyAuthState;
```

### 2. Comprehensive Testing Strategy

#### Unit Tests for Each Service

```tsx
// src/services/auth/__tests__/PasskeyService.test.ts
describe('PasskeyService', () => {
  // 100+ test cases covering all scenarios
});
```

#### Integration Tests

```tsx
// src/__tests__/integration/AuthFlow.integration.test.tsx
describe('Auth Flow Integration', () => {
  test('complete passkey authentication flow', async () => {
    // Test end-to-end passkey flow
  });

  test('complete PIN authentication flow', async () => {
    // Test end-to-end PIN flow
  });
});
```

#### E2E Tests

```tsx
// e2e/auth-flow.spec.ts
test('user can authenticate with passkey', async ({ page }) => {
  await page.goto('/auth');
  await page.click('button:has-text("Use Passkey")');
  // Complete E2E authentication flow
});
```

### 3. Rollback Procedures

#### Immediate Rollback (Single Step)

```bash
# For any phase, rollback to previous working commit
git reset --hard HEAD~1
git push --force-with-lease
```

#### Gradual Rollback (Feature Flags)

```bash
# Disable new features without code changes
NEXT_PUBLIC_NEW_AUTH_STRUCTURE=false npm run build
```

#### Complete Rollback (Last Resort)

```bash
# Restore from backup branch
git checkout auth-refactor-backup
git branch -D auth-refactor-main
git checkout -b auth-refactor-main
```

---

## Success Metrics & KPIs

### Technical Metrics

- **Bundle Size**: Reduce from ~500KB to <350KB
- **Test Coverage**: Achieve 95%+ coverage for auth-related code
- **Performance**: <5ms for auth state updates
- **Code Complexity**: Reduce cyclomatic complexity by 80%

### Quality Metrics

- **Code Maintainability**: A rating improvement from D to A
- **Technical Debt**: Reduce by 90%
- **Bug Rate**: 95% reduction in auth-related bugs
- **Development Velocity**: 50% faster auth feature development

### Business Metrics

- **Time to Onboard**: New developers can understand auth system in <2 hours
- **Feature Delivery**: New auth features delivered 60% faster
- **System Reliability**: 99.9% uptime for authentication flows

---

## Monitoring & Alerting

### Performance Monitoring

```tsx
// src/utils/performance/AuthPerformanceMonitor.ts
export class AuthPerformanceMonitor {
  static measureOperation(operation: string, fn: () => Promise<any>) {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    if (duration > 100) {
      // Alert on slow operations
      console.warn(`Slow auth operation: ${operation} took ${duration}ms`);
    }

    return result;
  }
}
```

### Error Tracking

```tsx
// src/utils/error/AuthErrorTracker.ts
export class AuthErrorTracker {
  static trackError(error: Error, context: string) {
    // Send to error tracking service
    // Log structured error data
  }
}
```

---

## Conclusion

This refactoring plan transforms the AuthContext from a 1,666-line monolithic file into a well-structured, maintainable architecture. The phased approach ensures:

1. **Safety**: Each step is validated before proceeding
2. **Reversibility**: Multiple rollback strategies available
3. **Quality**: Comprehensive testing at each step
4. **Performance**: Measurable improvements in bundle size and speed
5. **Maintainability**: Clear separation of concerns and modular design

**Expected Outcomes:**

- **90% reduction** in AuthContext file size
- **95%+ test coverage** for authentication code
- **50% improvement** in development velocity
- **Zero breaking changes** in production

The refactoring will establish a solid foundation for future authentication features and serve as a model for other complex components in the application.
