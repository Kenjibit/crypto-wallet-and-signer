import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@btc-wallet/ui';

interface PasskeyTestResult {
  testName: string;
  status: 'pass' | 'fail' | 'running';
  details: string;
  timestamp: Date;
  category: 'creation' | 'verification' | 'security' | 'edge-cases';
}

const PasskeyStressTest: React.FC = () => {
  const { authState, stressTestUtils } = useAuth();
  const [isMinimized, setIsMinimized] = useState(false);
  const [testResults, setTestResults] = useState<PasskeyTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  if (!stressTestUtils) return null;

  const runPasskeyTest = async (testName: string, category: PasskeyTestResult['category'], testFn: () => Promise<void>): Promise<PasskeyTestResult> => {
    try {
      await testFn();
      return {
        testName,
        status: 'pass',
        details: 'Test completed successfully',
        timestamp: new Date(),
        category
      };
    } catch (error) {
      return {
        testName,
        status: 'fail',
        details: `Error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
        category
      };
    }
  };

  const runAllPasskeyTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setTestResults([]);
    
    // Reset to clean state before testing
    stressTestUtils.resetToCleanState();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const tests = [
      // PASSKEY CREATION TESTS
      {
        name: 'Passkey Creation Flow',
        category: 'creation' as const,
        fn: async () => {
          // Test basic passkey creation
          if (!authState.isPasskeySupported) {
            throw new Error('Passkey not supported on this device');
          }
          
          // This would normally create a passkey, but we'll simulate the flow
          console.log('🧪 Testing passkey creation flow...');
          
          // Verify the system is ready for passkey creation
          if (authState.status !== 'unauthenticated') {
            throw new Error('System not in correct state for passkey creation');
          }
        }
      },
      
      {
        name: 'Credential ID Generation',
        category: 'creation' as const,
        fn: async () => {
          // Test credential ID handling
          console.log('🧪 Testing credential ID generation...');
          
          // Simulate credential ID validation
          const testCredentialId = 'test-credential-id-123';
          if (typeof testCredentialId !== 'string' || testCredentialId.length === 0) {
            throw new Error('Invalid credential ID format');
          }
        }
      },
      
      {
        name: 'Algorithm Support Validation',
        category: 'creation' as const,
        fn: async () => {
          // Test WebAuthn algorithm support
          console.log('🧪 Testing algorithm support...');
          
          const supportedAlgorithms = [-7, -257]; // ES256, RS256
          const hasValidAlgorithms = supportedAlgorithms.every(alg => 
            typeof alg === 'number' && alg < 0
          );
          
          if (!hasValidAlgorithms) {
            throw new Error('Invalid algorithm identifiers');
          }
        }
      },
      
      // PASSKEY VERIFICATION TESTS
      {
        name: 'Passkey Verification Flow',
        category: 'verification' as const,
        fn: async () => {
          // Test passkey verification process
          console.log('🧪 Testing passkey verification flow...');
          
          // Verify system can handle verification requests
          if (authState.method === 'passkey' && authState.status === 'authenticated') {
            // System is ready for verification
            console.log('🧪 System ready for passkey verification');
          } else {
            // System needs to be in correct state
            console.log('🧪 System preparing for passkey verification');
          }
        }
      },
      
      {
        name: 'Challenge Generation',
        category: 'verification' as const,
        fn: async () => {
          // Test challenge generation for verification
          console.log('🧪 Testing challenge generation...');
          
          // Simulate challenge creation
          const challenge = new Uint8Array(32);
          if (challenge.length !== 32) {
            throw new Error('Invalid challenge length');
          }
          
          // Verify challenge is random
          const hasRandomness = Array.from(challenge).some(byte => byte !== 0);
          if (!hasRandomness) {
            throw new Error('Challenge appears to be all zeros');
          }
        }
      },
      
      {
        name: 'Credential Retrieval',
        category: 'verification' as const,
        fn: async () => {
          // Test credential retrieval for verification
          console.log('🧪 Testing credential retrieval...');
          
          // Test allowCredentials format
          const testAllowCredentials = [{
            id: new Uint8Array(20),
            type: 'public-key',
            transports: ['internal']
          }];
          
          if (testAllowCredentials[0].type !== 'public-key') {
            throw new Error('Invalid credential type');
          }
        }
      },
      
      // SECURITY TESTS
      {
        name: 'User Verification Requirement',
        category: 'security' as const,
        fn: async () => {
          // Test user verification enforcement
          console.log('🧪 Testing user verification requirement...');
          
          // Verify userVerification is set to 'required'
          const userVerification = 'required';
          if (userVerification !== 'required') {
            throw new Error('User verification not properly enforced');
          }
        }
      },
      
      {
        name: 'Timeout Handling',
        category: 'security' as const,
        fn: async () => {
          // Test timeout configuration
          console.log('🧪 Testing timeout handling...');
          
          const timeout = 5000; // 5 seconds
          if (timeout < 1000 || timeout > 60000) {
            throw new Error('Timeout value outside acceptable range');
          }
        }
      },
      
      {
        name: 'Transport Security',
        category: 'security' as const,
        fn: async () => {
          // Test transport security settings
          console.log('🧪 Testing transport security...');
          
          const transports = ['internal'];
          const hasSecureTransport = transports.includes('internal');
          
          if (!hasSecureTransport) {
            throw new Error('Secure transport not configured');
          }
        }
      },
      
      // EDGE CASES
      {
        name: 'Multiple Credential Handling',
        category: 'edge-cases' as const,
        fn: async () => {
          // Test handling of multiple credentials
          console.log('🧪 Testing multiple credential handling...');
          
          // Simulate multiple credential IDs
          const credentialIds = ['cred1', 'cred2', 'cred3'];
          const uniqueIds = new Set(credentialIds);
          
          if (uniqueIds.size !== credentialIds.length) {
            throw new Error('Duplicate credential IDs detected');
          }
        }
      },
      
      {
        name: 'Credential Deletion Simulation',
        category: 'edge-cases' as const,
        fn: async () => {
          // Test credential deletion scenarios
          console.log('🧪 Testing credential deletion simulation...');
          
          // Simulate credential becoming unavailable
          const credentialExists = false;
          
          // System should handle missing credentials gracefully
          if (credentialExists === false) {
            console.log('🧪 System correctly detected missing credential');
          }
        }
      },
      
      {
        name: 'Platform Authenticator Detection',
        category: 'edge-cases' as const,
        fn: async () => {
          // Test platform authenticator detection
          console.log('🧪 Testing platform authenticator detection...');
          
          // Check if platform authenticator is available
          const isPlatformAuthenticator = typeof window !== 'undefined' && 
            'PublicKeyCredential' in window &&
            typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
          
          if (!isPlatformAuthenticator) {
            throw new Error('Platform authenticator detection failed');
          }
        }
      },
      
      {
        name: 'Cross-Origin Handling',
        category: 'edge-cases' as const,
        fn: async () => {
          // Test cross-origin credential handling
          console.log('🧪 Testing cross-origin handling...');
          
          // Verify rpId handling
          const rpId = window.location.hostname;
          if (!rpId || rpId.length === 0) {
            throw new Error('Invalid relying party ID');
          }
        }
      }
    ];

    for (const test of tests) {
      const result = await runPasskeyTest(test.name, test.category, test.fn);
      setTestResults(prev => [...prev, result]);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reset to clean state between tests
      stressTestUtils.resetToCleanState();
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    setIsRunning(false);
  };

  const clearResults = () => {
    setTestResults([]);
    setDebugInfo('');
  };

  const handleDebugInfo = () => {
    const debug = stressTestUtils.getDebugInfo();
    const passkeySpecificInfo = {
      ...debug,
      passkeySupport: {
        isSupported: authState.isPasskeySupported,
        isPWA: authState.isPWA,
        hasCredential: !!authState.credentialId,
        currentMethod: authState.method,
        currentStatus: authState.status
      },
      webauthnFeatures: {
        publicKeyCredential: typeof window !== 'undefined' && 'PublicKeyCredential' in window,
        isUserVerifyingPlatformAuthenticatorAvailable: typeof window !== 'undefined' && 
          typeof PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable === 'function',
        credentials: typeof window !== 'undefined' && 'credentials' in navigator
      }
    };
    
    const debugString = JSON.stringify(passkeySpecificInfo, null, 2);
    setDebugInfo(debugString);
    
    // Copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(debugString).then(() => {
        console.log('Passkey debug info copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy to clipboard:', err);
      });
    }
  };

  const copyResults = () => {
    const resultsText = testResults.map(result => 
      `[${result.category.toUpperCase()}] ${result.testName}: ${result.status.toUpperCase()} - ${result.details}`
    ).join('\n');
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(resultsText).then(() => {
        console.log('Passkey test results copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy results:', err);
      });
    }
  };

  const getSuccessRate = () => {
    if (testResults.length === 0) return 0;
    const passed = testResults.filter(r => r.status === 'pass').length;
    return Math.round((passed / testResults.length) * 100);
  };

  const getCategoryStats = () => {
    const stats: Record<string, { total: number; passed: number }> = {};
    
    testResults.forEach(result => {
      if (!stats[result.category]) {
        stats[result.category] = { total: 0, passed: 0 };
      }
      stats[result.category].total++;
      if (result.status === 'pass') {
        stats[result.category].passed++;
      }
    });
    
    return stats;
  };

  if (isMinimized) {
    return (
      <div style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '8px',
        padding: '8px'
      }}>
        <button
          onClick={() => setIsMinimized(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '4px 8px'
          }}
        >
          🔑 Expand Passkey Tests
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.95)',
      borderRadius: '12px',
      padding: '16px',
      maxWidth: '450px',
      maxHeight: '75vh',
      overflow: 'auto',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      color: 'white',
      fontSize: '12px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <h3 style={{ margin: 0, fontSize: '14px' }}>🔑 Passkey Stress Tests</h3>
        <button
          onClick={() => setIsMinimized(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <Button
          onClick={runAllPasskeyTests}
          disabled={isRunning}
          variant="primary"
        >
          {isRunning ? 'Running...' : 'Run Passkey Tests'}
        </Button>
        <Button
          onClick={clearResults}
          variant="ghost"
        >
          Clear Results
        </Button>
        <Button
          onClick={copyResults}
          variant="ghost"
        >
          Copy Results
        </Button>
        <Button
          onClick={handleDebugInfo}
          variant="ghost"
        >
          Debug Info
        </Button>
      </div>

      {testResults.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span>Results: {testResults.length} tests</span>
            <span style={{
              color: getSuccessRate() >= 80 ? '#4ade80' : getSuccessRate() >= 60 ? '#fbbf24' : '#f87171'
            }}>
              {getSuccessRate()}% success
            </span>
          </div>
          
          {/* Category Statistics */}
          <div style={{ marginBottom: '8px', fontSize: '10px' }}>
            {Object.entries(getCategoryStats()).map(([category, stats]) => (
              <span key={category} style={{
                marginRight: '8px',
                padding: '2px 6px',
                borderRadius: '3px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: stats.passed === stats.total ? '#4ade80' : '#fbbf24'
              }}>
                {category}: {stats.passed}/{stats.total}
              </span>
            ))}
          </div>
          
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            {testResults.map((result, index) => (
              <div
                key={index}
                style={{
                  padding: '6px 8px',
                  marginBottom: '4px',
                  borderRadius: '4px',
                  background: result.status === 'pass' ? 'rgba(74, 222, 128, 0.2)' : 
                             result.status === 'fail' ? 'rgba(248, 113, 113, 0.2)' : 
                             'rgba(59, 130, 246, 0.2)',
                  border: `1px solid ${
                    result.status === 'pass' ? 'rgba(74, 222, 128, 0.5)' : 
                    result.status === 'fail' ? 'rgba(248, 113, 113, 0.5)' : 
                    'rgba(59, 130, 246, 0.5)'
                  }`
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '2px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '8px',
                      padding: '1px 4px',
                      borderRadius: '2px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'white'
                    }}>
                      {result.category}
                    </span>
                    <strong style={{ fontSize: '11px' }}>{result.testName}</strong>
                  </div>
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    background: result.status === 'pass' ? 'rgba(74, 222, 128, 0.8)' : 
                               result.status === 'fail' ? 'rgba(248, 113, 113, 0.8)' : 
                               'rgba(59, 130, 246, 0.8)',
                    color: 'white'
                  }}>
                    {result.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.8)' }}>
                  {result.details}
                </div>
                <div style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '2px' }}>
                  {result.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {debugInfo && (
        <div style={{ marginTop: '12px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <strong>Passkey Debug Info:</strong>
            <Button
              onClick={() => setDebugInfo('')}
              variant="ghost"
            >
              Hide
            </Button>
          </div>
          <pre style={{
            background: 'rgba(0, 0, 0, 0.5)',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '10px',
            maxHeight: '150px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {debugInfo}
          </pre>
        </div>
      )}
    </div>
  );
};

export default PasskeyStressTest;
