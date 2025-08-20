# 🧪 Testing System Documentation

## 📋 Overview

The Litecoin Signer application includes a comprehensive testing framework for validating authentication systems, stress testing, and ensuring robustness. This document covers all testing capabilities, usage instructions, and expected behaviors.

## 🎯 Test Control Panel

### **Location & Access**
- **Position**: Top-right corner of the main screen
- **Button**: "🧪 Tests" (minimized state)
- **Z-Index**: 9999 (above all other content)

### **Interface States**

#### **1. Minimized State**
```
🧪 Tests
```
- Simple button in top-right corner
- Click to expand the full test panel

#### **2. Test Suite Selection**
- **🧪 General Auth Tests** (Orange theme)
  - State validation, corruption detection, network failures, recovery
- **🔑 Passkey Tests** (Blue theme)  
  - WebAuthn API, platform authenticator, credentials management

#### **3. Test Execution**
- **Run Tests** button - executes all tests in selected suite
- **Clear** button - resets test results
- **Debug** button - shows auth state in console
- **← Back** button - returns to suite selection

## 🧪 Test Suites

### **General Auth Tests**

#### **Test 1: State Validation**
- **Purpose**: Tests authentication state validation rules
- **Function**: `stressTestUtils.testValidation()`
- **Expected**: PASS - Validates state consistency rules

#### **Test 2: PIN Corruption**
- **Purpose**: Tests PIN data corruption detection
- **Function**: `stressTestUtils.corruptPinData()`
- **Expected**: PASS - Detects and reports corruption

#### **Test 3: Network Failure**
- **Purpose**: Tests network failure simulation and recovery
- **Function**: `stressTestUtils.simulateNetworkFailure()`
- **Expected**: PASS - Successfully simulates network issues

#### **Test 4: State Corruption**
- **Purpose**: Tests authentication state corruption recovery
- **Function**: `stressTestUtils.corruptAuthState()`
- **Expected**: PASS - Recovers from corrupted states

### **Passkey Tests**

#### **Test 1: WebAuthn API**
- **Purpose**: Checks browser WebAuthn support
- **Validation**: `'PublicKeyCredential' in window`
- **Expected**: PASS - WebAuthn API available

#### **Test 2: Platform Authenticator**
- **Purpose**: Checks biometric authenticator availability
- **Validation**: `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()`
- **Expected**: PASS - Platform authenticator available

#### **Test 3: Credentials API**
- **Purpose**: Checks navigator.credentials functionality
- **Validation**: `navigator.credentials.create` and `navigator.credentials.get`
- **Expected**: PASS - Credentials API fully functional

#### **Test 4: User Verification**
- **Purpose**: Tests user verification configuration
- **Validation**: Authenticator selection and user verification options
- **Expected**: PASS - User verification properly configured

## 📊 Results Display

### **Success Rate Calculation**
- **Formula**: `(passed tests / total tests) × 100`
- **Color Coding**:
  - 🟢 **80-100%**: Green (Excellent)
  - 🟡 **60-79%**: Yellow (Good)
  - 🔴 **0-59%**: Red (Needs attention)

### **Result Format**
```json
{
  "name": "Test Name",
  "status": "pass|fail",
  "details": "Detailed description with result"
}
```

### **Visual Indicators**
- **Pass**: Green background with green border
- **Fail**: Red background with red border
- **Status Badge**: PASS/FAIL indicator

## 🔧 Debug Information

### **Console Output**
The Debug button provides comprehensive information in the browser console:

#### **Auth State Table**
```javascript
{
  method: 'passkey|pin|null',
  status: 'authenticated|unauthenticated|authenticating|failed',
  isPasskeySupported: boolean,
  isPWA: boolean,
  credentialId: string|undefined
}
```

#### **Validation Rules Table**
```javascript
{
  "PIN method with credentialId": "OK|VIOLATION",
  "Authenticated passkey without credentialId": "OK|VIOLATION", 
  "Failed status": "OK|VIOLATION"
}
```

### **Debug Info Structure**
```javascript
{
  authState: { /* current auth state */ },
  pinAuth: { /* PIN authentication data */ },
  localStorage: { /* stored authentication data */ },
  validationRules: { /* validation rule status */ }
}
```

## 🛡️ State Validation Rules

### **Rule 1: PIN Method Consistency**
- **Rule**: PIN method should never have credentialId
- **Validation**: Ensures PIN and Passkey methods don't mix
- **Auto-Correction**: Removes credentialId if violation detected

### **Rule 2: Passkey Credential Consistency**
- **Rule**: Authenticated passkey must have credentialId
- **Validation**: Ensures passkey authentication is complete
- **Auto-Correction**: Resets to unauthenticated if violation detected

### **Rule 3: Status Consistency**
- **Rule**: Failed status should reset to unauthenticated
- **Validation**: Prevents stuck failed states
- **Auto-Correction**: Automatically resets failed status

## 🚀 Usage Instructions

### **Running Tests**
1. **Access**: Click "🧪 Tests" in top-right corner
2. **Select Suite**: Choose General Auth or Passkey tests
3. **Execute**: Click "Run Tests" button
4. **Monitor**: Watch real-time results as tests execute
5. **Review**: Analyze pass/fail results and success rate

### **Debugging Issues**
1. **Run Tests**: Execute test suite to identify failures
2. **Check Console**: Use Debug button for detailed state information
3. **Analyze Results**: Review failed test details and error messages
4. **Validate State**: Check validation rules for any violations

### **Best Practices**
- **Run tests after authentication changes** to validate state
- **Use Debug button** to investigate authentication issues
- **Clear results** between test runs for clean analysis
- **Monitor success rates** to identify system degradation

## 🔍 Troubleshooting

### **Common Issues**

#### **Tests Not Running**
- **Check**: Browser console for JavaScript errors
- **Verify**: Authentication context is properly loaded
- **Ensure**: Test utilities are available in development mode

#### **Unexpected Failures**
- **Review**: Test result details for specific error messages
- **Check**: Debug information for state inconsistencies
- **Validate**: Authentication state against validation rules

#### **Rendering Issues**
- **Verify**: Test Control Panel is visible (z-index: 9999)
- **Check**: No CSS conflicts or positioning issues
- **Ensure**: Component is properly mounted

### **Debug Commands**
```javascript
// In browser console
console.log('Auth State:', authState);
console.log('Test Utils:', stressTestUtils);
console.log('Validation Rules:', validationRules);
```

## 📈 Performance Metrics

### **Test Execution Time**
- **General Auth Tests**: ~800ms (4 tests × 200ms each)
- **Passkey Tests**: ~400ms (4 tests × 100ms each)
- **Total Suite Time**: Varies based on test complexity

### **Memory Usage**
- **Test Results Storage**: Minimal (JSON objects)
- **State Validation**: Efficient rule checking
- **Cleanup**: Automatic result clearing and state reset

## 🔒 Security Considerations

### **Test Environment**
- **Development Only**: Tests are only available in development mode
- **No Production**: Test utilities are stripped in production builds
- **Local Testing**: All tests run locally, no external calls

### **Data Handling**
- **No Persistence**: Test results are not stored permanently
- **State Isolation**: Tests don't affect production authentication state
- **Clean Recovery**: Failed tests automatically reset to clean state

## 📝 Maintenance

### **Adding New Tests**
1. **Define Test**: Add test object to appropriate suite
2. **Implement Function**: Create test execution logic
3. **Add Validation**: Include proper error handling
4. **Update Documentation**: Document new test purpose and expected results

### **Modifying Test Logic**
1. **Update Function**: Modify test execution in TestControlPanel
2. **Test Changes**: Run affected test suite to validate
3. **Update Docs**: Reflect changes in this documentation
4. **Version Control**: Commit changes with clear descriptions

---

## 🎯 Summary

The testing system provides:
- **Comprehensive validation** of authentication states
- **Stress testing** for system robustness
- **Real-time feedback** on test execution
- **Debug information** for troubleshooting
- **Clean, intuitive interface** for developers

**This testing framework ensures the Litecoin Signer authentication system is robust, reliable, and ready for production use.** 🚀✨
