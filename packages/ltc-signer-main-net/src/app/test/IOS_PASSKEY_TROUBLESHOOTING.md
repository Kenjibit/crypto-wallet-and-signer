# 🔑 iOS Passkey Troubleshooting Guide

## 📱 iOS Passkey Support Matrix

### **iOS Version Support:**
- **iOS 15.x and below**: ❌ **No Passkey support**
- **iOS 16.0 - 16.6**: ✅ **Basic Passkey support** (limited features)
- **iOS 16.1+**: ✅ **Full Passkey support** (conditional mediation)
- **iOS 17.0+**: ✅ **Enhanced Passkey support** (all features)

### **Device Requirements:**
- **iPhone X and newer**: ✅ **Face ID support** (required for Passkeys)
- **iPhone 8/8 Plus**: ✅ **Touch ID support** (limited Passkey support)
- **iPhone 7 and older**: ❌ **No Secure Enclave** (no Passkey support)

---

## 🚨 Common iOS Passkey Issues

### **Issue 1: "Passkey Not Supported" on iOS 16+**

#### **Symptoms:**
- User sees "Passkey not supported" message
- Authentication setup only shows PIN option
- Console shows `isPasskeySupported: false`

#### **Root Causes:**
1. **Overly restrictive detection logic** (FIXED ✅)
2. **Missing WebAuthn API support**
3. **iOS version detection failure**
4. **Browser compatibility issues**

#### **Solutions Applied:**
```tsx
// BEFORE (Too restrictive):
const isSupported = 
  typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
  typeof PublicKeyCredential.isConditionalMediationAvailable === 'function';

// AFTER (iOS 16+ compatible):
const isSupported = 
  typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
```

### **Issue 2: Passkey Creation Fails on iOS**

#### **Symptoms:**
- Passkey setup starts but fails during creation
- User sees "Passkey creation failed" error
- Console shows WebAuthn errors

#### **Root Causes:**
1. **Missing iOS-specific options**
2. **Incompatible algorithm selection**
3. **Missing extensions for iOS**

#### **Solutions Applied:**
```tsx
// iOS 16+ specific optimizations
authenticatorSelection: {
  authenticatorAttachment: 'platform',
  userVerification: 'required',
  residentKey: 'preferred', // iOS 16+ feature
},
extensions: {
  appid: window.location.origin, // Better iOS support
}
```

---

## 🔍 Debugging iOS Passkey Issues

### **Step 1: Check Console Logs**

Look for the new detection logs:
```javascript
🔍 Passkey Support Detection: {
  hasWebAuthn: true/false,
  hasPlatformAuthenticator: true/false,
  hasConditionalMediation: true/false,
  isIOS: true/false,
  isIOS16Plus: true/false,
  userAgent: "Mozilla/5.0 (iPhone...)",
  isSupported: true/false
}
```

### **Step 2: Verify iOS Version**

Check the user agent string:
```javascript
// iOS 16.0: "OS 16_0"
// iOS 16.1: "OS 16_1" 
// iOS 17.0: "OS 17_0"
const isIOS16Plus = /OS 1[6-9]|OS [2-9][0-9]/.test(navigator.userAgent);
```

### **Step 3: Test WebAuthn API Support**

```javascript
// Check basic support
console.log('PublicKeyCredential:', typeof PublicKeyCredential);
console.log('navigator.credentials:', typeof navigator.credentials);

// Check platform authenticator
if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
  PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    .then(available => console.log('Platform authenticator available:', available));
}
```

---

## 🛠️ iOS-Specific Fixes Applied

### **Fix 1: Simplified Detection Logic**
```tsx
// OLD: Required both functions (too restrictive)
const isSupported = 
  hasPlatformAuthenticator && hasConditionalMediation;

// NEW: Only requires platform authenticator (iOS 16+ compatible)
const isSupported = hasPlatformAuthenticator;
```

### **Fix 2: Enhanced Passkey Creation Options**
```tsx
const credential = await navigator.credentials.create({
  publicKey: {
    // ... basic options ...
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred', // iOS 16+ feature
    },
    extensions: {
      appid: window.location.origin, // Better iOS support
    },
  },
});
```

### **Fix 3: iOS-Specific Detection**
```tsx
// Detect iOS specifically
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isIOS16Plus = isIOS && /OS 1[6-9]|OS [2-9][0-9]/.test(navigator.userAgent);

// Log for debugging
console.log('🔍 Passkey Support Detection:', {
  hasWebAuthn,
  hasPlatformAuthenticator,
  hasConditionalMediation,
  isIOS,
  isIOS16Plus,
  userAgent: navigator.userAgent,
  isSupported
});
```

---

## 📋 Testing Checklist for iOS

### **Pre-Test Setup:**
- [ ] **Device**: iPhone 13 Pro Max (or newer)
- [ ] **iOS Version**: 16.0 or higher
- [ ] **Browser**: Safari (preferred) or Chrome
- [ ] **Network**: Stable internet connection
- [ ] **Face ID**: Properly configured and working

### **Test Steps:**
1. **Open the app** on iOS device
2. **Check console logs** for detection results
3. **Try to create wallet** - should see Passkey option
4. **Select Passkey authentication** - should prompt Face ID
5. **Complete Face ID verification** - should create passkey
6. **Verify authentication** - should work without re-prompting

### **Expected Results:**
```javascript
🔍 Passkey Support Detection: {
  hasWebAuthn: true,
  hasPlatformAuthenticator: true,
  hasConditionalMediation: true, // iOS 16.1+
  isIOS: true,
  isIOS16Plus: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)...",
  isSupported: true
}
```

---

## 🚀 iOS Passkey Best Practices

### **1. Progressive Enhancement**
```tsx
// Start with basic WebAuthn support
if (hasPlatformAuthenticator) {
  // Offer Passkey option
  showPasskeyOption = true;
}

// Enhance with conditional mediation if available
if (hasConditionalMediation) {
  // Enable advanced features
  enableConditionalMediation = true;
}
```

### **2. Fallback Strategy**
```tsx
// Always provide PIN fallback
const authOptions = [
  { id: 'passkey', label: 'Face ID / Touch ID', available: isPasskeySupported },
  { id: 'pin', label: '4-Digit PIN', available: true }, // Always available
];
```

### **3. iOS-Specific Optimizations**
```tsx
// Use iOS-friendly options
const iosOptions = {
  authenticatorAttachment: 'platform',
  userVerification: 'required',
  residentKey: 'preferred',
  extensions: { appid: window.location.origin },
};
```

---

## 🔧 Advanced Troubleshooting

### **Issue: Conditional Mediation Not Available**

#### **Problem:**
iOS 16.0 doesn't support `isConditionalMediationAvailable`

#### **Solution:**
```tsx
// Check availability safely
const hasConditionalMediation = 
  hasWebAuthn && 
  typeof PublicKeyCredential.isConditionalMediationAvailable === 'function';

// Use when available, fallback when not
if (hasConditionalMediation) {
  // Enable advanced features
} else {
  // Use basic passkey flow
}
```

### **Issue: Face ID Not Prompting**

#### **Problem:**
Passkey creation starts but no Face ID prompt appears

#### **Solution:**
```tsx
// Ensure proper user verification
authenticatorSelection: {
  userVerification: 'required', // Must be 'required' for Face ID
  authenticatorAttachment: 'platform',
},

// Add proper timeout
timeout: 60000, // 60 seconds for iOS
```

### **Issue: Passkey Creation Times Out**

#### **Problem:**
Passkey creation takes too long and times out

#### **Solution:**
```tsx
// Increase timeout for iOS
timeout: 120000, // 2 minutes for iOS devices

// Add user feedback
setStatus({ message: 'Setting up Face ID...', type: 'info' });
```

---

## 📱 iOS Device-Specific Notes

### **iPhone 13 Pro Max (iOS 16+)**
- ✅ **Full Passkey support**
- ✅ **Face ID integration**
- ✅ **Secure Enclave support**
- ✅ **WebAuthn API support**

### **iPhone 12 Series (iOS 16+)**
- ✅ **Full Passkey support**
- ✅ **Face ID integration**
- ✅ **Secure Enclave support**

### **iPhone 11 Series (iOS 16+)**
- ✅ **Full Passkey support**
- ✅ **Face ID integration**
- ✅ **Secure Enclave support**

### **iPhone X/XS/XR (iOS 16+)**
- ✅ **Full Passkey support**
- ✅ **Face ID integration**
- ✅ **Secure Enclave support**

### **iPhone 8/8 Plus (iOS 16+)**
- ⚠️ **Limited Passkey support**
- ✅ **Touch ID integration**
- ⚠️ **May have compatibility issues**

---

## 🎯 Summary

### **What Was Fixed:**
1. ✅ **Overly restrictive detection logic** - Now only requires platform authenticator
2. ✅ **Missing iOS-specific options** - Added resident key and appid extensions
3. ✅ **Better iOS detection** - Specific iOS version and device detection
4. ✅ **Enhanced debugging** - Comprehensive logging for troubleshooting

### **Expected Results:**
- **iOS 16+ devices** should now show Passkey option
- **iPhone 13 Pro Max** should work perfectly with Face ID
- **Better error messages** and debugging information
- **Improved iOS compatibility** with WebAuthn

### **Next Steps:**
1. **Test on iOS device** with the updated code
2. **Check console logs** for detection results
3. **Verify Passkey creation** works with Face ID
4. **Report any remaining issues** with specific error messages

**The iOS Passkey support should now work correctly on iPhone 13 Pro Max with iOS 16+!** 🎯✨
