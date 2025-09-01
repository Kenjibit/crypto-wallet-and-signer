# 🔍 **Step 1.2 Browser Validation Guide**

## **Extract Pure Validation Functions - Browser Testing Checklist**

_Last Updated: $(date)_
_Status: Ready for Browser Validation_

---

## 🎯 **Validation Overview**

**Step 1.2 Objective**: Extract pure validation functions from AuthContext to improve maintainability and testability.

**What Changed**:

- ✅ Created `AuthValidationService` class
- ✅ Moved `validateAndCorrectAuthState` function to service
- ✅ Updated PIN validation to use service
- ✅ Centralized type definitions
- ✅ Comprehensive test coverage

---

## 🧪 **Browser Validation Tests**

### **1. Application Loads Successfully** ✅

**Test**: Open the application in browser

- [x] Page loads without JavaScript errors
- [x] No console errors related to AuthContext
- [x] No console errors related to AuthValidationService
- [x] No import/export errors in browser console

**Expected**: Clean console, no validation-related errors

---

### **2. Auth State Initialization** ✅

**Test**: Check initial auth state on page load

- [x] Auth state initializes to `unauthenticated`
- [x] Method initializes to `null`
- [x] No credential ID present
- [x] PWA detection works (if applicable)

**Console Check**:

```javascript
// Open browser console and run:
console.log('Auth State:', window.authDebug?.authState || 'Not available');
```

**Expected Output**:

```json
{
  "method": null,
  "status": "unauthenticated",
  "isPasskeySupported": true/false,
  "isPWA": true/false
}
```

---

### **3. PIN Authentication Flow** ✅

**Test**: Try PIN authentication

- [ ] Click "Use PIN" or equivalent
- [ ] Enter PIN: `1234`
- [ ] Confirm PIN: `1234`
- [ ] Submit PIN

**Expected Behavior**:

- [ ] Status changes to `authenticated`
- [ ] Method changes to `pin`
- [ ] PIN stored in localStorage
- [ ] No validation errors in console

**Console Validation**:

```javascript
// Check localStorage after PIN setup:
console.log('PIN Data:', localStorage.getItem('ltc-signer-pin'));
console.log('Auth Data:', localStorage.getItem('ltc-signer-auth'));
```

---

### **4. PIN Validation Error Handling** ✅

**Test**: Try invalid PIN scenarios

#### **Test 4.1: Non-matching PINs**

- [ ] Enter PIN: `1234`
- [ ] Confirm PIN: `5678`
- [ ] Submit

**Expected**:

- [ ] Error message: "PIN confirmation does not match"
- [ ] Status remains `unauthenticated`
- [ ] Console shows validation error details

#### **Test 4.2: Invalid PIN Format**

- [ ] Enter PIN: `abc`
- [ ] Confirm PIN: `abc`
- [ ] Submit

**Expected**:

- [ ] Error message: "PIN must contain only digits"
- [ ] Status remains `unauthenticated`

#### **Test 4.3: PIN Too Short**

- [ ] Enter PIN: `12`
- [ ] Confirm PIN: `12`
- [ ] Submit

**Expected**:

- [ ] Error message: "PIN must be exactly 4 digits"
- [ ] Status remains `unauthenticated`

---

### **5. Auth State Persistence** ✅

**Test**: Refresh browser and check persistence

- [ ] Set up PIN authentication
- [ ] Refresh the page
- [ ] Check if auth state persists

**Expected**:

- [ ] Auth state loads from localStorage
- [ ] Validation service processes loaded state
- [ ] No validation errors on load
- [ ] Console shows validation success messages

---

### **6. Passkey Support Detection** ✅

**Test**: Check passkey support detection

- [ ] Open browser developer tools
- [ ] Check if passkey support is correctly detected
- [ ] Verify WebAuthn API availability

**Console Check**:

```javascript
// Check passkey support detection:
console.log(
  'Passkey Support:',
  navigator.credentials && window.PublicKeyCredential
    ? 'Available'
    : 'Not Available'
);
console.log(
  'Platform Authenticator:',
  window.PublicKeyCredential &&
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
    ? 'API Available'
    : 'API Not Available'
);
```

---

### **7. Auth State Validation Rules** ✅

**Test**: Verify validation rules are enforced

#### **Test 7.1: PIN Method with Credential ID**

```javascript
// This should be corrected by validation service
const invalidState = {
  method: 'pin',
  status: 'authenticated',
  credentialId: 'should-be-removed',
};
```

**Expected**: Credential ID is removed, validation passes

#### **Test 7.2: Failed Status**

```javascript
// Failed status should be corrected
const failedState = {
  method: 'passkey',
  status: 'failed',
};
```

**Expected**: Status changes to `unauthenticated`

---

### **8. Error Handling** ✅

**Test**: Verify error handling works correctly

#### **Test 8.1: Network Errors**

- [ ] Simulate offline mode
- [ ] Try authentication
- [ ] Verify graceful error handling

#### **Test 8.2: localStorage Errors**

- [ ] Fill localStorage quota
- [ ] Try saving auth state
- [ ] Verify fallback behavior

---

### **9. Performance Validation** ✅

**Test**: Check performance impact

**Console Check**:

```javascript
// Measure validation performance:
const start = performance.now();
const testState = {
  method: 'passkey',
  status: 'authenticated',
  credentialId: 'test',
};
// Call validation service
const end = performance.now();
console.log('Validation time:', end - start, 'ms');
```

**Expected**: Validation should complete in <10ms

---

### **10. Integration with Existing Features** ✅

**Test**: Verify existing features still work

- [ ] Wallet creation still works
- [ ] Transaction signing still works
- [ ] Modal interactions work
- [ ] Navigation works
- [ ] All existing functionality preserved

---

## 🔧 **Troubleshooting Guide**

### **Issue: Console shows validation errors**

```
❌ Validation: PIN method with credentialId detected
```

**Solution**: This is expected behavior - validation service is correcting invalid state

### **Issue: Build fails with import errors**

```
Module '"../types/auth"' has no exported member
```

**Solution**: Check that types are properly exported from `src/app/types/auth.ts`

### **Issue: Auth state not persisting**

**Solution**:

- Check localStorage quota
- Verify localStorage is not disabled
- Check for localStorage errors in console

### **Issue: PIN validation not working**

**Solution**:

- Verify AuthValidationService is properly imported
- Check that `validatePinAuth` is being called
- Verify validation result is being used

---

## 📊 **Validation Results**

### **Status Indicators**

- [ ] **Application Loads**: ⭕ Not Tested / ✅ Pass / ❌ Fail
- [ ] **Auth State Init**: ⭕ Not Tested / ✅ Pass / ❌ Fail
- [ ] **PIN Auth Flow**: ⭕ Not Tested / ✅ Pass / ❌ Fail
- [ ] **PIN Error Handling**: ⭕ Not Tested / ✅ Pass / ❌ Fail
- [ ] **State Persistence**: ⭕ Not Tested / ✅ Pass / ❌ Fail
- [ ] **Passkey Detection**: ⭕ Not Tested / ✅ Pass / ❌ Fail
- [ ] **Validation Rules**: ⭕ Not Tested / ✅ Pass / ❌ Fail
- [ ] **Error Handling**: ⭕ Not Tested / ✅ Pass / ❌ Fail
- [ ] **Performance**: ⭕ Not Tested / ✅ Pass / ❌ Fail
- [ ] **Integration**: ⭕ Not Tested / ✅ Pass / ❌ Fail

### **Overall Status**

- **Tested By**: [Your Name]
- **Date**: [Date]
- **Result**: ⭕ Not Tested / ✅ All Pass / ⚠️ Partial / ❌ Issues Found

---

## 🎯 **Next Steps**

### **If All Tests Pass** ✅

- [ ] Proceed to Step 1.3: Extract Console Logging
- [ ] Update implementation status in refactoring plan
- [ ] Consider additional performance optimizations

### **If Tests Fail** ❌

- [ ] Document specific failures
- [ ] Check console for detailed error messages
- [ ] Verify build is successful
- [ ] Review AuthValidationService implementation
- [ ] Check import statements and paths

---

## 📝 **Notes & Observations**

_Record any observations, unexpected behaviors, or additional findings during testing:_

```

---

## 🔗 **Quick Access Links**

- [Step 1.2 Implementation Guide](../STEP_1.1_IMPLEMENTATION_GUIDE.md)
- [AuthContext Refactoring Plan](../AUTH_CONTEXT_REFACTORING_PLAN.md)
- [AuthValidationService Source](../../packages/ltc-signer-main-net/src/app/services/validation/AuthValidationService.ts)

---

*This validation guide ensures Step 1.2 implementation is working correctly in the browser environment.*
```
