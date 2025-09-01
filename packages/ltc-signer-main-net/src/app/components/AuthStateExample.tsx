/**
 * Example component demonstrating useAuthState hook with feature flags
 *
 * This component shows how to use the new useAuthState hook with feature flags
 * for gradual migration in the air-gapped wallet.
 */

import React from 'react';
import { useAuthStateWithFeatureFlag } from '../hooks/useAuthState';
import { FeatureFlagWrapper, useFeatureFlag } from './FeatureFlagWrapper';
import type { AuthState } from '../types/auth';

/**
 * Main auth state example component
 */
export const AuthStateExample: React.FC = () => {
  const {
    authState,
    setAuthState,
    sessionAuthenticated,
    setSessionAuthenticated,
    getDebugInfo,
  } = useAuthStateWithFeatureFlag();

  // Check if new features are enabled
  const hasNewHook = useFeatureFlag('USE_AUTH_STATE_HOOK');
  const hasPerformanceMonitoring = useFeatureFlag(
    'AUTH_PERFORMANCE_MONITORING'
  );

  const handleStateChange = () => {
    const newState: AuthState = {
      method: authState.method === 'passkey' ? 'pin' : 'passkey',
      status: 'authenticated',
      isPasskeySupported: true,
      isPWA: false,
      credentialId: authState.method === 'passkey' ? 'new-cred-id' : undefined,
    };
    setAuthState(newState);
  };

  const handleSessionToggle = () => {
    setSessionAuthenticated(!sessionAuthenticated);
  };

  const showDebugInfo = () => {
    if (hasPerformanceMonitoring) {
      const debugInfo = getDebugInfo();
      console.log('🔧 Auth State Debug Info:', debugInfo);
      alert(`Debug info logged to console. Check browser dev tools.`);
    }
  };

  return (
    <div
      style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}
    >
      <h3>🔐 AuthState Hook Example (Air-Gapped Wallet)</h3>

      {/* Feature flag status */}
      <div
        style={{
          marginBottom: '15px',
          padding: '10px',
          background: '#f0f0f0',
          borderRadius: '4px',
        }}
      >
        <strong>Feature Flags:</strong>
        <div>New Hook: {hasNewHook ? '✅ Enabled' : '❌ Disabled'}</div>
        <div>
          Performance Monitoring:{' '}
          {hasPerformanceMonitoring ? '✅ Enabled' : '❌ Disabled'}
        </div>
      </div>

      {/* Current state display */}
      <div style={{ marginBottom: '15px' }}>
        <h4>Current Auth State:</h4>
        <pre
          style={{
            background: '#f5f5f5',
            padding: '10px',
            borderRadius: '4px',
          }}
        >
          {JSON.stringify(
            {
              status: authState.status,
              method: authState.method,
              isPasskeySupported: authState.isPasskeySupported,
              isPWA: authState.isPWA,
              credentialId: authState.credentialId,
              sessionAuthenticated,
            },
            null,
            2
          )}
        </pre>
      </div>

      {/* Action buttons */}
      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={handleStateChange}
          style={{
            padding: '8px 16px',
            marginRight: '10px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Toggle Auth Method
        </button>

        <button
          onClick={handleSessionToggle}
          style={{
            padding: '8px 16px',
            marginRight: '10px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Toggle Session
        </button>

        <FeatureFlagWrapper feature="AUTH_PERFORMANCE_MONITORING">
          <button
            onClick={showDebugInfo}
            style={{
              padding: '8px 16px',
              background: '#ffc107',
              color: 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Show Debug Info
          </button>
        </FeatureFlagWrapper>
      </div>

      {/* Feature-specific content */}
      <FeatureFlagWrapper
        feature="USE_AUTH_STATE_HOOK"
        fallback={
          <div
            style={{
              padding: '10px',
              background: '#fff3cd',
              borderRadius: '4px',
            }}
          >
            ⚠️ Using legacy auth state management. Enable USE_AUTH_STATE_HOOK
            feature flag for new implementation.
          </div>
        }
      >
        <div
          style={{
            padding: '10px',
            background: '#d4edda',
            borderRadius: '4px',
          }}
        >
          ✅ Using new useAuthState hook with service layer architecture!
        </div>
      </FeatureFlagWrapper>

      {/* Air-gapped wallet info */}
      <div
        style={{
          marginTop: '15px',
          padding: '10px',
          background: '#e7f3ff',
          borderRadius: '4px',
        }}
      >
        <strong>🛡️ Air-Gapped Wallet Status:</strong>
        <div>All operations work completely offline</div>
        <div>No external network dependencies</div>
        <div>localStorage used for persistence</div>
      </div>
    </div>
  );
};

/**
 * Simple hook usage example
 */
export const SimpleAuthStateExample: React.FC = () => {
  const { authState, setAuthState } = useAuthStateWithFeatureFlag();

  return (
    <div>
      <p>Status: {authState.status}</p>
      <p>Method: {authState.method || 'None'}</p>
      <button
        onClick={() => setAuthState({ ...authState, status: 'authenticated' })}
      >
        Authenticate
      </button>
    </div>
  );
};
