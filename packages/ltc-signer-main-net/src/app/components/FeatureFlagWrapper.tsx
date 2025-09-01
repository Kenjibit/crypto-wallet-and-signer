import React, { ReactNode } from 'react';
import { FEATURES } from '../config/features';

/**
 * Props for FeatureFlagWrapper component
 */
interface FeatureFlagWrapperProps {
  /** Feature flag to check */
  feature: keyof typeof FEATURES;
  /** Content to render when feature is enabled */
  children: ReactNode;
  /** Fallback content to render when feature is disabled */
  fallback?: ReactNode;
  /** Whether to show a warning when feature is disabled */
  showWarning?: boolean;
}

/**
 * Feature Flag Wrapper Component
 *
 * Conditionally renders content based on feature flags for gradual migration.
 * Perfect for air-gapped wallet where we need to ensure features work offline.
 *
 * Usage:
 * ```tsx
 * <FeatureFlagWrapper
 *   feature="USE_AUTH_STATE_HOOK"
 *   fallback={<LegacyAuthComponent />}
 *   showWarning={process.env.NODE_ENV === 'development'}
 * >
 *   <NewAuthComponent />
 * </FeatureFlagWrapper>
 * ```
 */
export const FeatureFlagWrapper: React.FC<FeatureFlagWrapperProps> = ({
  feature,
  children,
  fallback = null,
  showWarning = false,
}) => {
  const isEnabled = FEATURES[feature];

  // Show warning in development when feature is disabled
  if (showWarning && !isEnabled && process.env.NODE_ENV === 'development') {
    console.warn(
      `⚠️ Feature "${feature}" is disabled. Showing fallback content.`
    );
  }

  return isEnabled ? <>{children}</> : <>{fallback}</>;
};

/**
 * Hook-based feature flag wrapper
 *
 * Alternative API for more complex conditional rendering logic.
 *
 * Usage:
 * ```tsx
 * const MyComponent = () => {
 *   const featureEnabled = useFeatureFlag('USE_AUTH_STATE_HOOK');
 *
 *   if (featureEnabled) {
 *     return <NewAuthComponent />;
 *   }
 *
 *   return <LegacyAuthComponent />;
 * };
 * ```
 */
export const useFeatureFlag = (feature: keyof typeof FEATURES): boolean => {
  return FEATURES[feature];
};

/**
 * Multiple feature flags checker
 *
 * Useful when you need multiple features to be enabled.
 *
 * Usage:
 * ```tsx
 * const allFeaturesReady = useFeatureFlags(['USE_AUTH_STATE_HOOK', 'AUTH_PERFORMANCE_MONITORING']);
 * ```
 */
export const useFeatureFlags = (
  features: (keyof typeof FEATURES)[]
): boolean => {
  return features.every((feature) => FEATURES[feature]);
};

/**
 * Feature flag debug component
 *
 * Shows current feature flag status for debugging in air-gapped wallet.
 * Only renders in development mode.
 */
export const FeatureFlagDebug: React.FC = () => {
  // Only show in development and when explicitly enabled
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!FEATURES.AUTH_PERFORMANCE_MONITORING) {
    return null;
  }

  const featureStatus = Object.entries(FEATURES).map(([key, value]) => ({
    name: key,
    enabled: value,
  }));

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        maxWidth: '300px',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
        🔧 Feature Flags (Air-Gapped Wallet)
      </div>
      {featureStatus.map(({ name, enabled }) => (
        <div
          key={name}
          style={{ display: 'flex', justifyContent: 'space-between' }}
        >
          <span>{name}:</span>
          <span style={{ color: enabled ? '#4ade80' : '#f87171' }}>
            {enabled ? '✓' : '✗'}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * Air-gapped wallet specific feature flag utilities
 */
export const AirGappedFeatureUtils = {
  /**
   * Check if wallet is ready for air-gapped operation
   */
  isWalletReady: () => {
    return (
      FEATURES.USE_AUTH_STATE_HOOK &&
      FEATURES.AIR_GAPPED_OPTIMIZATIONS &&
      FEATURES.ENHANCED_AUTH_ERROR_HANDLING
    );
  },

  /**
   * Get air-gapped compatibility status
   */
  getCompatibilityStatus: () => ({
    isReady: AirGappedFeatureUtils.isWalletReady(),
    missingFeatures: Object.entries(FEATURES)
      .filter(([key, enabled]) => {
        const criticalFeatures = [
          'USE_AUTH_STATE_HOOK',
          'AIR_GAPPED_OPTIMIZATIONS',
          'ENHANCED_AUTH_ERROR_HANDLING',
        ];
        return criticalFeatures.includes(key) && !enabled;
      })
      .map(([key]) => key),
  }),
};
