# LTC Signer Transaction Signing Implementation Plan

## Executive Summary

The BTC signer has comprehensive transaction signing capabilities, but the LTC signer is missing critical functionality. This plan outlines the implementation of full transaction signing for Litecoin with small, incremental deliveries.

## Current State Analysis

### BTC Signer Capabilities ✅

- **PSBT Handling**: Complete PSBT parsing, signing, validation
- **UTXO Management**: Selection, filtering, balance calculation
- **Fee Estimation**: Dynamic fee rates, transaction size calculation
- **Transaction Creation**: From scratch with optimal UTXO selection
- **Network Support**: Testnet/Mainnet with proper network handling
- **Error Handling**: Comprehensive error management with typed errors

### LTC Signer Current State ❌

- **Wallet Creation**: ✅ Working (addresses, keys, derivation)
- **Wallet Import**: ✅ Working (WIF, mnemonic support)
- **UI Components**: ✅ Complete (modals, forms, scanning)
- **Database**: ✅ Working (wallet storage, encryption)
- **Transaction Signing**: ❌ **MOCKED** - only simulates signing

## Missing Functionality for LTC Transaction Signing

### 1. PSBT Libraries (CRITICAL)

**Current**: None
**Needed**: Litecoin-adapted PSBT parsing and signing

- PSBT parsing with Litecoin network support
- PSBT signing with LTC private keys
- Signature extraction and validation
- Transaction finalization and hex extraction

### 2. UTXO Management (HIGH)

**Current**: None
**Needed**: Complete UTXO handling system

- UTXO fetching from blockchain
- UTXO selection algorithms
- Balance calculation
- Confirmation status tracking

### 3. Fee Estimation (HIGH)

**Current**: None
**Needed**: LTC-specific fee calculation

- Dynamic fee rate fetching
- Transaction size calculation for LTC
- Fee optimization algorithms

### 4. Transaction Creation (MEDIUM)

**Current**: None
**Needed**: Build transactions from scratch

- Raw transaction building
- Input/output management
- Change address handling
- Multi-signature support

### 5. Network Integration (MEDIUM)

**Current**: Basic network config
**Needed**: Full blockchain interaction

- UTXO fetching from LTC nodes
- Transaction broadcasting
- Fee rate APIs for LTC
- Block explorers integration

## Implementation Plan with Small Deliveries

### Phase 1: Core PSBT Functionality (1-2 weeks)

**Deliverables**:

1. **LTC PSBT Library** (`packages/ltc-signer-main-net/src/libs/ltc-psbt.ts`)
   - PSBT parsing with LTC network
   - PSBT signing with LTC private keys
   - Signature validation
   - Transaction hex extraction
2. **PSBT Types** (`packages/ltc-signer-main-net/src/types/ltc-psbt.d.ts`)
   - LTC-specific type definitions
   - UTXO interfaces
   - Transaction structures

### Phase 2: UTXO Management (1 week)

**Deliverables**: 3. **UTXO Selector** (`packages/ltc-signer-main-net/src/libs/ltc-utxo-selector.ts`)

- UTXO selection algorithms
- Balance calculation
- Confirmation filtering

4. **UTXO Types** (`packages/ltc-signer-main-net/src/types/ltc-utxo.d.ts`)
   - UTXO interfaces
   - Selection result types

### Phase 3: Fee Estimation (1 week)

**Deliverables**: 5. **Fee Estimator** (`packages/ltc-signer-main-net/src/libs/ltc-fee-estimator.ts`)

- LTC fee rate fetching
- Transaction size calculation
- Fee optimization

6. **Fee Types** (`packages/ltc-signer-main-net/src/types/ltc-fee.d.ts`)
   - Fee estimation interfaces

### Phase 4: Transaction Creation (1 week)

**Deliverables**: 7. **Transaction Creator** (`packages/ltc-signer-main-net/src/libs/ltc-transaction-creator.ts`)

- Complete transaction building
- PSBT generation
- Change handling

8. **Transaction Types** (`packages/ltc-signer-main-net/src/types/ltc-transaction.d.ts`)
   - Transaction request/response types

### Phase 5: Integration & Testing (1 week)

**Deliverables**: 9. **Replace Mock Signing** in `SigningFlow.tsx`

- Integrate real LTC PSBT signing
- Add proper error handling
- Update UI feedback

10. **Unit Tests** for all new libraries
    - PSBT signing tests
    - UTXO selection tests
    - Fee estimation tests

### Phase 6: Network Integration (1-2 weeks)

**Deliverables**: 11. **Blockchain API** (`packages/ltc-signer-main-net/src/libs/ltc-blockchain-api.ts`) - UTXO fetching from LTC nodes - Transaction broadcasting - Fee rate APIs 12. **Offline Mode** handling - QR code transaction data - Offline transaction preparation

## Detailed Implementation Specifications

### 1. LTC PSBT Library Specification

```typescript
// Core functions needed:
export function parseLTCPSBT(psbtBase64: string): LTCPSBTInfo;
export function signLTCPSBT(psbtBase64: string, privateKeyWIF: string): string;
export function validateLTCPrivateKey(privateKeyWIF: string): boolean;
export function getLTCSignedTransactionHex(signedPSBT: string): string;
export function extractLTCSignatures(
  psbtBase64: string,
  privateKeyWIF: string
): LTCSignature[];
```

### 2. UTXO Management Specification

```typescript
// Core functions needed:
export function selectLTCUTXOs(
  utxos: LTCUTXO[],
  requiredAmount: number,
  feeRate: number
): LTCUTXOSelectionResult;
export function calculateLTCBalance(utxos: LTCUTXO[]): number;
export function filterLTCUTXOsByConfirmation(utxos: LTCUTXO[]): {
  confirmed: LTCUTXO[];
  unconfirmed: LTCUTXO[];
};
```

### 3. Fee Estimation Specification

```typescript
// Core functions needed:
export function getLTCFeeEstimate(): Promise<LTCFeeEstimate>;
export function calculateLTCFee(
  inputCount: number,
  outputCount: number,
  feeRate: number
): number;
export function estimateLTCTransactionSize(
  inputCount: number,
  outputCount: number
): number;
```

### 4. Transaction Creation Specification

```typescript
// Core functions needed:
export function createLTCUnsignedTransaction(
  request: LTCTransactionRequest,
  utxos: LTCUTXO[]
): LTCUnsignedTransaction;
export function createLTCPSBTWithChange(
  inputs: LTCUTXO[],
  toAddress: string,
  amountSatoshis: number,
  fromAddress: string,
  network: LTCNetwork,
  feeRate: number
): LTCPSBTResult;
```

## Dependencies & Prerequisites

### Required Packages to Add:

```json
{
  "bitcoinjs-lib": "^6.1.0", // For LTC-compatible PSBT handling
  "tiny-secp256k1": "^2.2.0", // For LTC cryptography
  "ecpair": "^2.1.0" // For LTC key pairs
}
```

### Network Configuration:

- **Mainnet**: LTC (ltc1...), P2PKH (L...), P2SH (3...)
- **Testnet**: TLTC (tltc1...), P2PKH (m/n...), P2SH (2...)

## Risk Assessment & Mitigation

### High Risk:

1. **Network Compatibility**: LTC uses different network parameters than BTC
   - **Mitigation**: Extensive testing with both networks
2. **PSBT Compatibility**: Ensure LTC PSBT format matches expectations
   - **Mitigation**: Start with simple transactions, gradual complexity

### Medium Risk:

1. **Fee Estimation**: LTC fee markets may differ from BTC
   - **Mitigation**: Conservative fee estimates, user override options
2. **UTXO Management**: LTC blockchain may have different UTXO patterns
   - **Mitigation**: Flexible UTXO selection algorithms

## Success Criteria

### Functional Requirements:

- ✅ Parse LTC PSBT from QR codes
- ✅ Sign LTC transactions with WIF private keys
- ✅ Create LTC transactions from scratch
- ✅ Calculate optimal LTC fees
- ✅ Handle LTC mainnet and testnet
- ✅ Support P2WPKH, P2SH-P2WPKH, P2PKH address types

### Non-Functional Requirements:

- ✅ Response time < 3 seconds for transaction creation
- ✅ Support up to 100 inputs per transaction
- ✅ Handle fee rates from 1-1000 sat/byte
- ✅ Error messages user-friendly and actionable

## Testing Strategy

### Unit Testing:

- PSBT parsing with various LTC address types
- UTXO selection edge cases
- Fee calculation accuracy
- Private key validation

### Integration Testing:

- Full transaction signing flow
- QR code scanning to signed transaction
- Network switching (mainnet/testnet)

### User Acceptance Testing:

- Real LTC transactions on testnet
- Performance with large UTXO sets
- Error handling with invalid inputs

## Timeline & Milestones

| Phase                    | Duration  | Deliverables                 | Status  |
| ------------------------ | --------- | ---------------------------- | ------- |
| 1. Core PSBT             | 1-2 weeks | LTC PSBT library, types      | Pending |
| 2. UTXO Management       | 1 week    | UTXO selector, types         | Pending |
| 3. Fee Estimation        | 1 week    | Fee estimator, types         | Pending |
| 4. Transaction Creation  | 1 week    | Transaction creator, types   | Pending |
| 5. Integration & Testing | 1 week    | Updated UI, unit tests       | Pending |
| 6. Network Integration   | 1-2 weeks | Blockchain API, offline mode | Pending |

**Total Estimated Time**: 5-7 weeks
**Small Deliveries**: 12 incremental deliverables
**Risk Level**: Medium (building on proven BTC patterns)

## Next Steps

1. **Immediate Action**: Begin Phase 1 - Create LTC PSBT library
2. **Weekly Cadence**: Complete one phase per week
3. **Testing**: Test each phase on LTC testnet before proceeding
4. **Documentation**: Update this plan with actual implementation details

---

_This plan provides a clear roadmap for implementing full LTC transaction signing capabilities while maintaining small, manageable deliveries that can be completed incrementally._
