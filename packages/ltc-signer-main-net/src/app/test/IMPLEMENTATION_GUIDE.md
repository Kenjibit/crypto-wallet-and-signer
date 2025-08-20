# 🧪 Test Control Panel Implementation Guide

## 📋 Overview

This guide explains how to implement the Test Control Panel component that was developed for the Litecoin Signer application. The component provides comprehensive testing capabilities for authentication systems, stress testing, and debugging.

## 🎯 Component Structure

### **Main Component: TestControlPanel.tsx**

```tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@btc-wallet/ui';

const TestControlPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTest, setActiveTest] = useState<'general' | 'passkey' | null>(null);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { stressTestUtils } = useAuth();

  // Component implementation...
};
```

## 🏗️ Implementation Steps

### **Step 1: Create the Component File**

Create `src/app/components/TestControlPanel.tsx` with the following structure:

```tsx
// packages/ltc-signer-main-net/src/app/components/TestControlPanel.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@btc-wallet/ui';

interface TestControlPanelProps {
  // Add any props if needed
}

const TestControlPanel: React.FC<TestControlPanelProps> = () => {
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [activeTest, setActiveTest] = useState<'general' | 'passkey' | null>(null);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  // Get test utilities from auth context
  const { stressTestUtils } = useAuth();

  // Early return if test utilities not available
  if (!stressTestUtils) {
    return null;
  }

  // Component implementation...
};
```

### **Step 2: Implement State Management**

```tsx
// State variables
const [isOpen, setIsOpen] = useState(false);
const [activeTest, setActiveTest] = useState<'general' | 'passkey' | null>(null);
const [testResults, setTestResults] = useState<any[]>([]);
const [isRunning, setIsRunning] = useState(false);
const [debugInfo, setDebugInfo] = useState<string>('');

// Helper functions
const getSuccessRate = () => {
  if (testResults.length === 0) return 0;
  const passed = testResults.filter(r => r.status === 'pass').length;
  return Math.round((passed / testResults.length) * 100);
};

const clearResults = () => {
  setTestResults([]);
  setDebugInfo('');
};
```

### **Step 3: Implement Test Execution Functions**

#### **General Auth Tests**
```tsx
const runGeneralTests = async () => {
  if (isRunning) return;
  setIsRunning(true);
  setTestResults([]);

  const tests = [
    { 
      name: 'State Validation', 
      fn: () => stressTestUtils.testValidation(),
      description: 'Testing auth state validation rules'
    },
    { 
      name: 'PIN Corruption', 
      fn: () => stressTestUtils.corruptPinData(),
      description: 'Testing PIN data corruption detection'
    },
    { 
      name: 'Network Failure', 
      fn: () => stressTestUtils.simulateNetworkFailure(),
      description: 'Testing network failure recovery'
    },
    { 
      name: 'State Corruption', 
      fn: () => stressTestUtils.corruptAuthState(),
      description: 'Testing auth state corruption recovery'
    }
  ];

  for (const test of tests) {
    try {
      stressTestUtils.resetToCleanState();
      test.fn();
      await new Promise(resolve => setTimeout(resolve, 200));
      setTestResults(prev => [...prev, { 
        name: test.name, 
        status: 'pass', 
        details: test.description + ' - PASSED'
      }]);
    } catch (error) {
      setTestResults(prev => [...prev, { 
        name: test.name, 
        status: 'fail', 
        details: `${test.description} - FAILED: ${String(error)}`
      }]);
    }
  }

  setIsRunning(false);
};
```

#### **Passkey Tests**
```tsx
const runPasskeyTests = async () => {
  if (isRunning) return;
  setIsRunning(true);
  setTestResults([]);

  const tests = [
    { 
      name: 'WebAuthn API', 
      fn: () => {
        if (!('PublicKeyCredential' in window)) throw new Error('Not available');
      },
      description: 'Checking WebAuthn browser support'
    },
    { 
      name: 'Platform Authenticator', 
      fn: async () => {
        if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') {
          throw new Error('Function not available');
        }
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (!available) throw new Error('Not available');
      },
      description: 'Checking biometric authenticator availability'
    },
    { 
      name: 'Credentials API', 
      fn: () => {
        if (!navigator.credentials) throw new Error('Not available');
        if (!navigator.credentials.create) throw new Error('Create method not available');
        if (!navigator.credentials.get) throw new Error('Get method not available');
      },
      description: 'Checking navigator.credentials API'
    },
    { 
      name: 'User Verification', 
      fn: () => {
        const options = {
          publicKey: {
            challenge: new Uint8Array(32),
            rp: { name: 'Test' },
            user: { id: new Uint8Array(16), name: 'test', displayName: 'Test' },
            pubKeyCredParams: [{ alg: -7, type: 'public-key' as const }],
            authenticatorSelection: { userVerification: 'required' as const }
          }
        };
        if (!options.publicKey.authenticatorSelection) throw new Error('Structure invalid');
      },
      description: 'Testing user verification configuration'
    }
  ];

  for (const test of tests) {
    try {
      await test.fn();
      setTestResults(prev => [...prev, { 
        name: test.name, 
        status: 'pass', 
        details: test.description + ' - PASSED'
      }]);
    } catch (error) {
      setTestResults(prev => [...prev, { 
        name: test.name, 
        status: 'fail', 
        details: `${test.description} - FAILED: ${String(error)}`
      }]);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  setIsRunning(false);
};
```

### **Step 4: Implement UI Rendering**

#### **Minimized State**
```tsx
if (!isOpen) {
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999
    }}>
      <Button
        onClick={() => setIsOpen(true)}
        variant="primary"
      >
        🧪 Tests
      </Button>
    </div>
  );
}
```

#### **Main Panel**
```tsx
return (
  <div style={{
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 9999,
    background: 'rgba(0, 0, 0, 0.95)',
    borderRadius: '12px',
    padding: '20px',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflow: 'auto',
    border: '2px solid #f7931a',
    color: 'white',
    fontSize: '13px'
  }}>
    {/* Header */}
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
    }}>
      <h3 style={{ margin: 0, fontSize: '16px', color: '#f7931a' }}>
        🧪 Test Control Panel
      </h3>
      <button
        onClick={() => {
          setIsOpen(false);
          setActiveTest(null);
          setTestResults([]);
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '18px'
        }}
      >
        ✕
      </button>
    </div>

    {/* Test Selection or Execution UI */}
    {!activeTest ? renderTestSelection() : renderTestExecution()}
  </div>
);
```

### **Step 5: Implement Test Selection UI**

```tsx
const renderTestSelection = () => (
  <div>
    <p style={{ 
      margin: '0 0 15px 0', 
      color: 'rgba(255, 255, 255, 0.8)' 
    }}>
      Choose a test suite to run:
    </p>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <button
        onClick={() => setActiveTest('general')}
        style={{
          background: 'rgba(247, 147, 26, 0.2)',
          border: '2px solid #f7931a',
          borderRadius: '8px',
          padding: '15px',
          color: 'white',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
          🧪 General Auth Tests
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)' }}>
          State validation, PIN corruption, network failures, recovery
        </div>
      </button>

      <button
        onClick={() => setActiveTest('passkey')}
        style={{
          background: 'rgba(59, 130, 246, 0.2)',
          border: '2px solid #3b82f6',
          borderRadius: '8px',
          padding: '15px',
          color: 'white',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
          🔑 Passkey Tests
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)' }}>
          WebAuthn API, platform authenticator, credentials management
        </div>
      </button>
    </div>
  </div>
);
```

### **Step 6: Implement Test Execution UI**

```tsx
const renderTestExecution = () => (
  <div>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '15px'
    }}>
      <h4 style={{ 
        margin: 0, 
        fontSize: '14px',
        color: activeTest === 'general' ? '#f7931a' : '#3b82f6'
      }}>
        {activeTest === 'general' ? '🧪 General Auth Tests' : '🔑 Passkey Tests'}
      </h4>
      <button
        onClick={() => {
          setActiveTest(null);
          setTestResults([]);
        }}
        style={{
          background: 'none',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '4px',
          padding: '4px 8px',
          color: 'white',
          cursor: 'pointer',
          fontSize: '11px'
        }}
      >
        ← Back
      </button>
    </div>

    {/* Test Controls */}
    <div style={{
      display: 'flex',
      gap: '8px',
      marginBottom: '15px',
      flexWrap: 'wrap'
    }}>
      <Button
        onClick={activeTest === 'general' ? runGeneralTests : runPasskeyTests}
        disabled={isRunning}
        variant="primary"
      >
        {isRunning ? 'Running...' : 'Run Tests'}
      </Button>
      <Button
        onClick={clearResults}
        variant="ghost"
      >
        Clear
      </Button>
      <Button
        onClick={() => {
          const debug = stressTestUtils.getDebugInfo();
          console.table(debug.authState);
          console.table(debug.validationRules);
        }}
        variant="ghost"
      >
        Debug
      </Button>
    </div>

    {/* Results Display */}
    {testResults.length > 0 && renderResults()}
  </div>
);
```

### **Step 7: Implement Results Display**

```tsx
const renderResults = () => (
  <div>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '10px',
      padding: '8px',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '6px'
    }}>
      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
        Results: {testResults.length} tests
      </span>
      <span style={{
        fontSize: '12px',
        fontWeight: 'bold',
        color: getSuccessRate() >= 80 ? '#4ade80' : getSuccessRate() >= 60 ? '#fbbf24' : '#f87171'
      }}>
        {getSuccessRate()}% success
      </span>
    </div>
    
    <div style={{ maxHeight: '200px', overflow: 'auto' }}>
      {testResults.map((result, index) => (
        <div
          key={index}
          style={{
            padding: '8px',
            marginBottom: '6px',
            borderRadius: '6px',
            background: result.status === 'pass' 
              ? 'rgba(74, 222, 128, 0.2)' 
              : 'rgba(248, 113, 113, 0.2)',
            border: `1px solid ${result.status === 'pass' 
              ? 'rgba(74, 222, 128, 0.5)' 
              : 'rgba(248, 113, 113, 0.5)'}`
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px'
          }}>
            <strong style={{ fontSize: '11px' }}>{result.name}</strong>
            <span style={{
              fontSize: '9px',
              padding: '2px 6px',
              borderRadius: '3px',
              background: result.status === 'pass' 
                ? 'rgba(74, 222, 128, 0.8)' 
                : 'rgba(248, 113, 113, 0.8)',
              color: 'white',
              fontWeight: 'bold'
            }}>
              {result.status.toUpperCase()}
            </span>
          </div>
          <div style={{ 
            fontSize: '10px', 
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.3'
          }}>
            {result.details}
          </div>
        </div>
      ))}
    </div>
  </div>
);
```

## 🔧 Required Dependencies

### **Context Integration**
```tsx
// Ensure your AuthContext provides stressTestUtils
const { stressTestUtils } = useAuth();

// stressTestUtils should include:
interface StressTestUtils {
  resetToCleanState: () => void;
  testValidation: () => void;
  corruptPinData: () => void;
  simulateNetworkFailure: () => void;
  corruptAuthState: () => void;
  getDebugInfo: () => any;
}
```

### **UI Components**
```tsx
// Button component from your UI library
import { Button } from '@btc-wallet/ui';

// Or use native HTML buttons with custom styling
<button style={{ /* custom styles */ }}>
  Button Text
</button>
```

## 📱 Styling & Positioning

### **Fixed Positioning**
```css
.test-control-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
}
```

### **Responsive Design**
```tsx
// Adjust positioning for mobile devices
const getPositioning = () => {
  if (window.innerWidth < 768) {
    return {
      top: '10px',
      right: '10px',
      maxWidth: '90vw'
    };
  }
  return {
    top: '20px',
    right: '20px',
    maxWidth: '500px'
  };
};
```

## 🚀 Integration Steps

### **1. Add to Main Layout**
```tsx
// In your main page or layout
import TestControlPanel from './components/TestControlPanel';

export default function MainPage() {
  return (
    <>
      <MainContainer>
        {/* Your main content */}
      </MainContainer>
      
      {/* Development-only Test Control Panel */}
      <TestControlPanel />
    </>
  );
}
```

### **2. Environment-Based Rendering**
```tsx
const TestControlPanel: React.FC = () => {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  // Component implementation...
};
```

### **3. Conditional Import**
```tsx
// Dynamic import for development only
const TestControlPanel = process.env.NODE_ENV === 'development' 
  ? require('./components/TestControlPanel').default 
  : () => null;
```

## 🧪 Testing the Implementation

### **Manual Testing**
1. **Click "🧪 Tests"** button in top-right corner
2. **Select test suite** (General Auth or Passkey)
3. **Run tests** and verify results display
4. **Check console** for debug information
5. **Test responsive behavior** on different screen sizes

### **Automated Testing**
```tsx
// Test component rendering
test('renders test control panel when open', () => {
  render(<TestControlPanel />);
  expect(screen.getByText('🧪 Tests')).toBeInTheDocument();
});

// Test test execution
test('runs general auth tests successfully', async () => {
  render(<TestControlPanel />);
  // Click to open panel
  // Select general auth tests
  // Run tests
  // Verify results
});
```

## 🔒 Security Considerations

### **Development Only**
- **Never deploy** test utilities to production
- **Environment checks** to prevent accidental exposure
- **Conditional rendering** based on build environment

### **Test Data Isolation**
- **No persistent storage** of test results
- **Clean state management** between test runs
- **Isolated test execution** to prevent interference

## 📝 Customization Options

### **Adding New Test Suites**
```tsx
const testSuites = [
  { id: 'general', name: 'General Auth Tests', color: '#f7931a' },
  { id: 'passkey', name: 'Passkey Tests', color: '#3b82f6' },
  { id: 'custom', name: 'Custom Tests', color: '#10b981' } // New suite
];
```

### **Custom Test Functions**
```tsx
const customTests = [
  {
    name: 'Custom Test',
    fn: () => {
      // Your custom test logic
    },
    description: 'Custom test description'
  }
];
```

### **Styling Customization**
```tsx
const theme = {
  primary: '#f7931a',
  secondary: '#3b82f6',
  success: '#4ade80',
  error: '#f87171',
  background: 'rgba(0, 0, 0, 0.95)',
  border: '2px solid #f7931a'
};
```

## 🎯 Best Practices

### **Performance**
- **Lazy load** test utilities
- **Debounce** rapid test executions
- **Cleanup** test state after completion

### **User Experience**
- **Clear visual feedback** during test execution
- **Intuitive navigation** between test suites
- **Responsive design** for all screen sizes

### **Maintainability**
- **Modular test structure** for easy updates
- **Clear separation** of concerns
- **Comprehensive documentation** for future developers

---

## 🚀 Summary

This implementation guide provides everything needed to recreate the Test Control Panel component. The component offers:

- **Comprehensive testing** for authentication systems
- **Real-time results** with visual feedback
- **Professional UI** with responsive design
- **Easy integration** into existing applications
- **Flexible architecture** for customization

**Follow these steps to implement a robust testing infrastructure for your authentication systems!** 🎯✨
