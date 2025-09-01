/**
 * Feature flags for gradual migration during AuthContext refactoring
 *
 * These flags allow us to gradually roll out new features while maintaining
 * backward compatibility and the ability to quickly rollback if needed.
 *
 * For air-gapped wallet: All features should work completely offline.
 */

/**
 * Feature flags configuration
 *
 * Usage in components:
 * ```tsx
 * import { FEATURES } from '../config/features';
 *
 * const MyComponent = () => {
 *   const authHook = FEATURES.USE_AUTH_STATE_HOOK
 *     ? useAuthState
 *     : useLegacyAuthState;
 *
 *   const { authState, setAuthState } = authHook();
 *   // ... rest of component
 * };
 * ```
 */
export const FEATURES = {
  /**
   * Enable the new useAuthState hook architecture
   * - When false: Uses legacy inline state management
   * - When true: Uses new modular useAuthState hook with services
   */
  USE_AUTH_STATE_HOOK: process.env.NEXT_PUBLIC_USE_AUTH_STATE_HOOK === 'true',

  /**
   * Enable performance monitoring for auth operations
   * - When false: No performance logging
   * - When true: Logs timing for all auth operations
   */
  AUTH_PERFORMANCE_MONITORING:
    process.env.NEXT_PUBLIC_AUTH_PERFORMANCE_MONITORING === 'true',

  /**
   * Enable enhanced error handling and recovery
   * - When false: Basic error handling
   * - When true: Comprehensive error recovery and logging
   */
  ENHANCED_AUTH_ERROR_HANDLING:
    process.env.NEXT_PUBLIC_ENHANCED_AUTH_ERROR_HANDLING === 'true',

  /**
   * Enable offline wallet optimizations
   * - When false: Standard operation
   * - When true: Optimized for air-gapped usage with enhanced offline support
   */
  AIR_GAPPED_OPTIMIZATIONS:
    process.env.NEXT_PUBLIC_AIR_GAPPED_OPTIMIZATIONS === 'true',

  /**
   * Enable the new usePasskeyAuth hook
   * - When false: Uses inline passkey functions from AuthContext
   * - When true: Uses new modular usePasskeyAuth hook with PasskeyService
   */
  USE_PASSKEY_AUTH_HOOK:
    process.env.NEXT_PUBLIC_USE_PASSKEY_AUTH_HOOK === 'true',

  /**
   * Enable the new usePinAuth hook
   * - When false: Uses inline PIN functions from AuthContext
   * - When true: Uses new modular usePinAuth hook with PinService
   */
  USE_PIN_AUTH_HOOK: process.env.NEXT_PUBLIC_USE_PIN_AUTH_HOOK === 'true',

  /**
   * Enable the new useEncryption hook
   * - When false: Uses inline encryption functions from AuthContext
   * - When true: Uses new modular useEncryption hook with encryption services
   */
  USE_ENCRYPTION_HOOK: process.env.NEXT_PUBLIC_USE_ENCRYPTION_HOOK === 'true',

  /**
   * PHASE 4.1: AuthContext Hook Integration
   * Master flag to enable the complete AuthContext hook integration
   * - When false: Uses legacy AuthContext with inline logic
   * - When true: Uses new hook-based AuthContext architecture
   */
  AUTH_CONTEXT_HOOK_INTEGRATION:
    process.env.NEXT_PUBLIC_AUTH_CONTEXT_HOOK_INTEGRATION === 'true',

  /**
   * PHASE 4.1: Auth State Hook Migration
   * Enable migration to useAuthState hook in AuthContext
   * - When false: Uses legacy inline state management
   * - When true: Uses useAuthState hook with AuthStorageService
   * - STEP 4.1.4: Enabled for migration to new auth state hook
   */
  AUTH_STATE_HOOK_MIGRATION: true, // Enabled for Step 4.1.4 migration

  /**
   * PHASE 4.1: Passkey Hook Migration
   * Enable migration to usePasskeyAuth hook in AuthContext
   * - When false: Uses inline passkey functions
   * - When true: Uses usePasskeyAuth hook with PasskeyService
   * - STEP 4.1.8: Enabled for migration to new passkey auth hook
   */
  AUTH_PASSKEY_HOOK_MIGRATION: true, // Enabled for Step 4.1.8 migration

  /**
   * PHASE 4.1: PIN Hook Migration
   * Enable migration to usePinAuth hook in AuthContext
   * - When false: Uses inline PIN functions
   * - When true: Uses usePinAuth hook with PinService
   * - STEP 4.1.12: Enabled for migration to new PIN auth hook
   */
  AUTH_PIN_HOOK_MIGRATION: true, // Enabled for Step 4.1.12 migration

  /**
   * PHASE 4.1: Encryption Hook Migration
   * Enable migration to useEncryption hook in AuthContext
   * - When false: Uses inline encryption functions
   * - When true: Uses useEncryption hook with encryption services
   * - STEP 4.1.14: Enabled for migration to new encryption hook
   */
  AUTH_ENCRYPTION_HOOK_MIGRATION: true, // Enabled for Step 4.1.14 migration
} as const;

/**
 * Feature flag utilities for air-gapped wallet
 */
export const FeatureUtils = {
  /**
   * Check if running in air-gapped mode (no external network access)
   * This is always true for the wallet app
   */
  isAirGappedMode: () => true,

  /**
   * Check if all critical features are enabled for production
   */
  isProductionReady: () => {
    return (
      FEATURES.USE_AUTH_STATE_HOOK &&
      FEATURES.USE_PASSKEY_AUTH_HOOK &&
      FEATURES.USE_PIN_AUTH_HOOK &&
      FEATURES.USE_ENCRYPTION_HOOK &&
      FEATURES.AUTH_PERFORMANCE_MONITORING &&
      FEATURES.ENHANCED_AUTH_ERROR_HANDLING &&
      FEATURES.AIR_GAPPED_OPTIMIZATIONS &&
      // Phase 4.1 integration flags
      FEATURES.AUTH_CONTEXT_HOOK_INTEGRATION &&
      FEATURES.AUTH_STATE_HOOK_MIGRATION &&
      FEATURES.AUTH_PASSKEY_HOOK_MIGRATION &&
      FEATURES.AUTH_PIN_HOOK_MIGRATION &&
      FEATURES.AUTH_ENCRYPTION_HOOK_MIGRATION
    );
  },

  /**
   * Get current feature status for debugging
   */
  getFeatureStatus: () => ({
    // Phase 3 features
    useAuthStateHook: FEATURES.USE_AUTH_STATE_HOOK,
    usePasskeyAuthHook: FEATURES.USE_PASSKEY_AUTH_HOOK,
    usePinAuthHook: FEATURES.USE_PIN_AUTH_HOOK,
    useEncryptionHook: FEATURES.USE_ENCRYPTION_HOOK,
    performanceMonitoring: FEATURES.AUTH_PERFORMANCE_MONITORING,
    errorHandling: FEATURES.ENHANCED_AUTH_ERROR_HANDLING,
    airGappedOptimizations: FEATURES.AIR_GAPPED_OPTIMIZATIONS,
    // Phase 4.1 integration features
    authContextHookIntegration: FEATURES.AUTH_CONTEXT_HOOK_INTEGRATION,
    authStateHookMigration: FEATURES.AUTH_STATE_HOOK_MIGRATION,
    authPasskeyHookMigration: FEATURES.AUTH_PASSKEY_HOOK_MIGRATION,
    authPinHookMigration: FEATURES.AUTH_PIN_HOOK_MIGRATION,
    authEncryptionHookMigration: FEATURES.AUTH_ENCRYPTION_HOOK_MIGRATION,
    // Status
    isProductionReady: FeatureUtils.isProductionReady(),
    isAirGappedMode: FeatureUtils.isAirGappedMode(),
  }),
};

/**
 * Environment variable validation for air-gapped wallet
 */
export const validateEnvironment = () => {
  const issues: string[] = [];

  // Check for required environment variables in production
  if (process.env.NODE_ENV === 'production') {
    // Phase 3 features
    if (!FEATURES.USE_AUTH_STATE_HOOK) {
      issues.push('USE_AUTH_STATE_HOOK must be enabled in production');
    }
    if (!FEATURES.USE_ENCRYPTION_HOOK) {
      issues.push('USE_ENCRYPTION_HOOK must be enabled in production');
    }
    if (!FEATURES.AIR_GAPPED_OPTIMIZATIONS) {
      issues.push('AIR_GAPPED_OPTIMIZATIONS must be enabled for wallet');
    }
    // Phase 4.1 integration features
    if (!FEATURES.AUTH_CONTEXT_HOOK_INTEGRATION) {
      issues.push(
        'AUTH_CONTEXT_HOOK_INTEGRATION must be enabled in production'
      );
    }
    if (!FEATURES.AUTH_STATE_HOOK_MIGRATION) {
      issues.push('AUTH_STATE_HOOK_MIGRATION must be enabled in production');
    }
    if (!FEATURES.AUTH_PASSKEY_HOOK_MIGRATION) {
      issues.push('AUTH_PASSKEY_HOOK_MIGRATION must be enabled in production');
    }
    if (!FEATURES.AUTH_PIN_HOOK_MIGRATION) {
      issues.push('AUTH_PIN_HOOK_MIGRATION must be enabled in production');
    }
    if (!FEATURES.AUTH_ENCRYPTION_HOOK_MIGRATION) {
      issues.push(
        'AUTH_ENCRYPTION_HOOK_MIGRATION must be enabled in production'
      );
    }
  }

  // Validate air-gapped compatibility
  if (!FeatureUtils.isAirGappedMode()) {
    issues.push('Wallet must run in air-gapped mode');
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
};
