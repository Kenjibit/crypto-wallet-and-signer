# 🔍 **Feature Flag Usage Audit Results** - HISTORICAL DOCUMENT

> **⚠️ NOTE**: This document is **HISTORICAL** and documents the feature flag system that has been **COMPLETELY REMOVED** as of September 1, 2025. All feature flags have been eliminated and direct hook usage has been implemented.

## 📊 **Summary Statistics**

| **Metric**                          | **Count** | **Details**                    |
| ----------------------------------- | --------- | ------------------------------ |
| **FEATURES. references**            | 66        | Across 12 files                |
| **Environment variable references** | 65        | Across 11 files                |
| **AuthContext.tsx line count**      | 1,280     | Current baseline               |
| **Feature flag test directories**   | 9         | step4.1.\* directories         |
| **Test files with feature flags**   | 12+       | Validation and migration tests |

---

## 🎯 **Core Files with Feature Flag Usage**

### **1. Configuration File**

- **File**: `packages/ltc-signer-main-net/src/app/config/features.ts`
- **Lines**: 232
- **Feature Flags**: 12 total flags
- **Usage**: Central configuration for all feature flags

### **2. AuthContext.tsx**

- **File**: `packages/ltc-signer-main-net/src/app/contexts/AuthContext.tsx`
- **Lines**: 1,280 (target: ~400 after removal)
- **FEATURES. references**: 9 locations
- **Primary Usage**: Conditional encryption hook usage

### **3. Hook Files**

- **useEncryption.ts**: 1 FEATURES. reference
- **useAuthState.ts**: 1 FEATURES. reference

### **4. Component Files**

- **FeatureFlagWrapper.tsx**: 4 FEATURES. references

---

## 🧪 **Test Files Requiring Cleanup**

### **Feature Flag Test Directories (9 total)**

1. `step4.1.11-passkey-migration/` - 3 test files + README
2. `step4.1.12-validation/` - 1 test file
3. `step4.1.13-validation/` - 1 test file
4. `step4.1.14-validation/` - 1 test file
5. `step4.1.15-validation/` - 1 test file
6. `step4.1.16-validation/` - 1 test file
7. `step4.1.18-validation/` - 1 test file
8. `step4.1.22-integration/` - 1 test file
9. `step4.1.4-4.1.7-validation/` - 3 test files

### **Environment Variable Usage in Tests**

- **Total references**: 65 across 11 files
- **Primary variables**:
  - `NEXT_PUBLIC_AUTH_ENCRYPTION_HOOK_MIGRATION`
  - `NEXT_PUBLIC_AUTH_PIN_HOOK_MIGRATION`
  - `NEXT_PUBLIC_AUTH_PASSKEY_HOOK_MIGRATION`
  - `NEXT_PUBLIC_AUTH_STATE_HOOK_MIGRATION`

---

## 🔧 **Feature Flags Currently in Use**

### **Phase 4.1 Integration Flags (Hard-coded to true)**

```typescript
AUTH_CONTEXT_HOOK_INTEGRATION: true;
AUTH_STATE_HOOK_MIGRATION: true;
AUTH_PASSKEY_HOOK_MIGRATION: true;
AUTH_PIN_HOOK_MIGRATION: true;
AUTH_ENCRYPTION_HOOK_MIGRATION: true;
```

### **Phase 3 Feature Flags (Environment-based)**

```typescript
USE_AUTH_STATE_HOOK: process.env.NEXT_PUBLIC_USE_AUTH_STATE_HOOK === 'true';
USE_PASSKEY_AUTH_HOOK: process.env.NEXT_PUBLIC_USE_PASSKEY_AUTH_HOOK === 'true';
USE_PIN_AUTH_HOOK: process.env.NEXT_PUBLIC_USE_PIN_AUTH_HOOK === 'true';
USE_ENCRYPTION_HOOK: process.env.NEXT_PUBLIC_USE_ENCRYPTION_HOOK === 'true';
```

### **Additional Feature Flags**

```typescript
AUTH_PERFORMANCE_MONITORING: process.env
  .NEXT_PUBLIC_AUTH_PERFORMANCE_MONITORING === 'true';
ENHANCED_AUTH_ERROR_HANDLING: process.env
  .NEXT_PUBLIC_ENHANCED_AUTH_ERROR_HANDLING === 'true';
AIR_GAPPED_OPTIMIZATIONS: process.env.NEXT_PUBLIC_AIR_GAPPED_OPTIMIZATIONS ===
  'true';
```

---

## 📍 **Key Conditional Logic Locations**

### **AuthContext.tsx - Encryption Functions**

- **Line 866**: `encryptWithPasskey` conditional
- **Line 899**: `decryptWithPasskey` conditional
- **Line 980**: `testPasskeyEncryption` conditional
- **Line 1028**: `encryptData` unified function conditional
- **Line 1046**: `decryptData` unified function conditional
- **Line 1059**: `encryptData` fallback conditional
- **Line 1134**: `decryptData` fallback conditional
- **Line 1152**: `encryptData` legacy conditional
- **Line 1165**: `decryptData` legacy conditional

### **Hook Files**

- **useEncryption.ts:573**: Return conditional based on `USE_ENCRYPTION_HOOK`
- **useAuthState.ts:217**: Return conditional based on `USE_AUTH_STATE_HOOK`

---

## 🎯 **Removal Impact Assessment**

### **Files to be Modified**

1. ✅ `features.ts` - **DELETE ENTIRELY**
2. ✅ `AuthContext.tsx` - **SIMPLIFY** (1,280 → ~400 lines)
3. ✅ `useEncryption.ts` - **REMOVE CONDITIONAL**
4. ✅ `useAuthState.ts` - **REMOVE CONDITIONAL**
5. ✅ `FeatureFlagWrapper.tsx` - **UPDATE OR REMOVE**

### **Test Files to be Removed**

- **9 test directories** with step4.1.\* naming
- **12+ individual test files** with feature flag mocking
- **65 environment variable references** in test setup

### **Expected Benefits**

- **69% reduction** in AuthContext.tsx lines (1,280 → ~400)
- **100% elimination** of conditional logic complexity
- **Complete cleanup** of feature flag test infrastructure
- **Improved performance** (no runtime feature evaluation)
- **Simplified maintenance** (single code path)

---

## ✅ **Audit Validation**

- ✅ **Complete inventory** of all feature flag usage locations
- ✅ **Documentation** of all conditional logic blocks
- ✅ **List** of all test files requiring updates
- ✅ **Identification** of all configuration files
- ✅ **Baseline metrics** established for comparison

**Audit completed successfully. Ready for Step 1.3: Create Backup Strategy.**
