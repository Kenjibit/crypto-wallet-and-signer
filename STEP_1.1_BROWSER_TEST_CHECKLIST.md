# 🔍 **Step 1.1 Browser Testing Checklist**

## 📋 **Post-Implementation Verification Guide**

**Context**: Step 1.1 extracted development-only code from AuthContext. Some features are temporarily disabled for build compatibility. This checklist ensures core functionality remains intact.

---

## 🔐 **Core Authentication Flows**

### **Passkey Authentication**

- [x] **Passkey Creation**: Click "Use Passkey" → Complete WebAuthn flow → Verify credential stored
- [x] **Passkey Verification**: On app restart, verify passkey automatically prompts for authentication
- [x] **Passkey Cancellation**: Cancel during creation → Verify graceful error handling and state reset
- [x] **Passkey Timeout**: Wait for timeout → Verify proper error handling
- [ ] **Passkey Multiple Devices**: Test on devices with different biometric capabilities

### **PIN Authentication**

- [x] **PIN Setup**: Enter 4-digit PIN → Confirm PIN → Verify authentication successful
- [x] **PIN Verification**: On app restart, enter correct PIN → Verify authentication
- [x] **PIN Wrong Entry**: Enter wrong PIN → Verify failed state and retry capability
- [x] **PIN Reset**: Test authentication reset → Verify PIN data cleared
- [x] **PIN Format Validation**: Try invalid PINs (non-numeric, wrong length) → Verify rejection

### **Authentication State Management**

- [x] **State Persistence**: Authenticate → Refresh page → Verify state maintained
- [x] **State Transitions**: Test all state transitions (unauthenticated → authenticating → authenticated → failed)
- [ ] **Session Authentication**: Verify sessionAuthenticated flag updates correctly
- [ ] **Method Switching**: Switch between passkey and PIN methods
- [ ] **Logout Flow**: Logout → Verify complete state reset

---

## 💾 **Data Persistence & Storage**

### **localStorage Operations**

- [x] **Auth State Save**: Authenticate → Check localStorage has 'ltc-signer-auth' key
- [x] **Auth State Load**: Refresh page → Verify auth state loads from localStorage
- [x] **PIN Data Save**: Set PIN → Check localStorage has 'ltc-signer-pin' key
- [x] **PIN Data Load**: Refresh page → Verify PIN loads from localStorage
- [x] **Storage Cleanup**: Logout → Verify localStorage keys removed

### **State Validation**

- [ ] **Invalid State Correction**: Manually corrupt localStorage → Verify automatic correction
- [ ] **PIN + CredentialId Validation**: Verify PIN method never has credentialId
- [ ] **Authenticated Passkey Validation**: Verify authenticated passkeys have credentialId
- [ ] **Failed State Handling**: Verify failed states reset to unauthenticated
- [ ] **Authenticating State Validation**: Verify proper method set when authenticating

---

## 🖥️ **Browser Console & Logging**

### **Development Mode Logging**

- [ ] **Auth Initialization**: Check console for "AuthContext initializing" logs
- [ ] **State Changes**: Verify state change logs appear with 🔍 prefix
- [ ] **Validation Logs**: Check validation correction logs with 🛠️ prefix
- [ ] **Error Logs**: Verify error logs appear with ❌ prefix
- [ ] **Warning Logs**: Check validation warnings with 🚨 prefix

### **Production Mode Logging**

- [ ] **Build Production**: `npm run build` → Verify no auth logs in production bundle
- [ ] **Production Console**: Deploy to production → Verify no console logs appear

---

## 🧪 **Stress Testing Features** ⚠️ _CURRENTLY DISABLED_

### **Development Utilities** _(Will be null in current build)_

- [ ] **Dev Console Access**: Open dev console → Check if `stressTestUtils` is undefined
- [ ] **Production Safety**: Build for production → Verify no stress testing code included
- [ ] **Future Restoration**: Plan to re-enable after build stability confirmed

---

## 🚨 **Error Handling & Edge Cases**

### **WebAuthn Error Scenarios**

- [ ] **NotAllowedError**: User cancels → Verify state reset to clean state
- [ ] **InvalidStateError**: Credential not found → Verify credential cleanup
- [ ] **AbortError**: Operation aborted → Verify proper error handling
- [ ] **Network Issues**: Simulate network failure → Verify graceful degradation

### **Browser Compatibility**

- [ ] **WebAuthn Support**: Test on browsers with/without WebAuthn support
- [ ] **Platform Authenticator**: Test on iOS 16+ devices with platform authenticator
- [ ] **External Security Keys**: Test with USB security keys
- [ ] **Biometric Types**: Test with fingerprint, face recognition, PIN

### **PWA Functionality**

- [ ] **PWA Detection**: Verify `isPWA` flag set correctly in standalone mode
- [ ] **Install Prompt**: Test PWA installation flow
- [ ] **Offline Behavior**: Test authentication when offline
- [ ] **Background Sync**: Verify state persistence across app switches

---

## 📱 **UI Integration & Components**

### **Modal Components**

- [ ] **Auth Setup Modal**: Test passkey/PIN setup flows
- [ ] **Auth Verification Modal**: Test credential verification prompts
- [ ] **Wallet Creation Modal**: Test wallet creation with authentication
- [ ] **Error States**: Verify error messages display correctly
- [ ] **Loading States**: Check loading indicators during auth operations

### **Component Integration**

- [ ] **Auth State Propagation**: Verify auth state updates across all components
- [ ] **Method Selection**: Test switching between passkey and PIN in UI
- [ ] **Credential Status**: Verify UI reflects current authentication state
- [ ] **Session Indicators**: Check session authentication indicators

---

## ⚡ **Performance & Memory**

### **Authentication Performance**

- [ ] **Passkey Creation Time**: Measure time from click to authenticated (< 10 seconds)
- [ ] **PIN Verification Time**: Measure PIN verification speed (< 1 second)
- [ ] **State Update Performance**: Verify state updates are fast (< 5ms)
- [ ] **Memory Usage**: Monitor memory usage during auth operations

### **Bundle Size Impact**

- [ ] **Development Bundle**: Check bundle size hasn't increased significantly
- [ ] **Production Bundle**: Verify production bundle excludes dev utilities
- [ ] **Code Splitting**: Ensure proper code splitting for auth modules
- [ ] **Lazy Loading**: Verify auth components load on demand

---

## 🔄 **State Synchronization**

### **Page Visibility**

- [ ] **Tab Switching**: Switch tabs → Return → Verify auth state maintained
- [ ] **Page Hide/Show**: Hide page → Show page → Check visibility logging
- [ ] **Background Processing**: Test auth operations in background tabs
- [ ] **Memory Pressure**: Test under memory pressure scenarios

### **App Lifecycle**

- [ ] **Page Refresh**: Refresh page → Verify state restoration
- [ ] **Navigation**: Navigate between pages → Verify auth state persistence
- [ ] **Browser Back/Forward**: Use browser navigation → Check state integrity
- [ ] **App Restart**: Close and reopen → Verify localStorage restoration

---

## 🌐 **Cross-Browser Testing**

### **Desktop Browsers**

- [ ] **Chrome**: Full WebAuthn support testing
- [ ] **Firefox**: WebAuthn compatibility testing
- [ ] **Safari**: macOS WebAuthn testing
- [ ] **Edge**: Windows WebAuthn testing

### **Mobile Browsers**

- [ ] **iOS Safari**: Platform authenticator testing
- [ ] **Chrome Mobile**: Android biometric testing
- [ ] **Samsung Internet**: Samsung Pass testing
- [ ] **PWA Mode**: Test in standalone PWA mode

---

## 🐛 **Regression Testing**

### **Previously Working Features**

- [ ] **Wallet Creation**: Create wallet with authentication
- [ ] **Transaction Signing**: Sign transactions with authenticated state
- [ ] **Wallet Import**: Import wallets with proper authentication
- [ ] **Address Generation**: Generate addresses with auth verification

### **Integration Points**

- [ ] **Wallet Components**: Verify wallet components receive auth state
- [ ] **Transaction Components**: Test transaction flows with authentication
- [ ] **Modal System**: Verify auth modals integrate with wallet modals
- [ ] **Error Boundaries**: Test error boundaries with auth errors

---

## 📊 **Testing Results Template**

### **Test Session Log**

```
Browser: [Chrome/Firefox/Safari]
Device: [Desktop/Mobile]
Date: [YYYY-MM-DD]
Tester: [Name]

✅ PASSED TESTS:
- [ ] Test description

❌ FAILED TESTS:
- [ ] Test description - Expected: [expected] - Actual: [actual]

⚠️ ISSUES FOUND:
- [ ] Issue description - Severity: [Low/Medium/High] - Steps to reproduce

📝 NOTES:
- [ ] Additional observations or edge cases discovered
```

---

## 🎯 **Priority Testing Order**

### **Phase 1: Critical Path** (Must pass before proceeding)

1. Basic authentication flows (passkey creation/verification)
2. State persistence and restoration
3. Error handling for common scenarios
4. Browser compatibility basics

### **Phase 2: Extended Testing** (After critical path passes)

1. Edge cases and error scenarios
2. Performance and memory testing
3. Cross-browser compatibility
4. PWA functionality

### **Phase 3: Regression Testing** (After features restored)

1. Complete wallet workflows
2. Integration with other components
3. Stress testing scenarios
4. Production deployment verification

---

## 🚨 **Red Flags (Stop and Investigate)**

- [ ] Authentication completely broken
- [ ] State not persisting across page refreshes
- [ ] WebAuthn errors not handled gracefully
- [ ] Console errors in production build
- [ ] Memory leaks or performance degradation
- [ ] PWA functionality broken
- [ ] Cross-browser compatibility issues

---

## 📞 **Support & Rollback**

### **If Issues Found:**

1. **Document**: Log exact steps, browser, expected vs actual behavior
2. **Screenshot**: Capture console errors and UI state
3. **Rollback Plan**: `git checkout` previous working commit
4. **Report**: Use this checklist format for issue documentation

### **Emergency Rollback:**

```bash
# Rollback to before Step 1.1
git checkout HEAD~1
git push --force-with-lease
```

---

## ✅ **Success Criteria**

**All tests in Phase 1 must pass before:**

- Proceeding to Step 1.2
- Restoring disabled features
- Considering deployment

**Phase 2 tests should pass before:**

- Production deployment
- Feature completion sign-off

---

_Use this checklist systematically. Mark each item as you test it. If any critical issues are found, stop testing and investigate immediately._ 🔍
