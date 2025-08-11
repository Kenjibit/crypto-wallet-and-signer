# Minimum Fee Integration Plan

## Overview

This plan outlines how to integrate the minimum fee functionality from `get-minimum-fee.js` into the current Bitcoin transaction project to ensure transactions meet network requirements.

## Current State Analysis

### Existing Components

1. **Fee Estimator** (`lib/fee-estimator.ts`)

   - Provides fee rate estimates (slow, normal, fast, priority)
   - Calculates transaction fees based on size and rate
   - Integrates with mempool.space API

2. **Fee API** (`app/api/fee-rates/route.ts`)

   - Fetches current fee rates from mempool.space
   - Returns fee estimates in standardized format
   - Handles testnet-specific logic

3. **Fee Selector UI** (`app/components/FeeSelector.tsx`)
   - Allows users to select fee rates
   - Shows preset options and custom fee input
   - Displays fee rate information

### Minimum Fee Script (`get-minimum-fee.js`)

- Fetches minimum relay fee from multiple Bitcoin testnet nodes
- Tests transaction fees against minimum requirements
- Provides fallback estimates when nodes are unavailable

## Integration Strategy

### 1. Create Minimum Fee Service (`lib/minimum-fee.ts`)

**Purpose**: Centralized service to check minimum fee requirements

**Key Features**:

- Fetch minimum relay fee from multiple nodes
- Cache results to avoid excessive API calls
- Provide fallback estimates for testnet
- Validate transaction fees against minimum requirements

**API Design**:

```typescript
interface MinimumFeeResult {
  minFeeRate: number; // sat/byte
  minFeeBTC: number; // BTC/kB
  source: string; // Node source
  timestamp: number;
  isReliable: boolean; // Whether data is from reliable source
}

interface FeeValidation {
  isValid: boolean;
  currentRate: number;
  minRequired: number;
  additionalFeeNeeded: number;
  recommendation: string;
}
```

### 2. Enhance Fee Estimator Integration

**Modifications to `lib/fee-estimator.ts`**:

- Add minimum fee validation to fee calculations
- Ensure calculated fees meet minimum requirements
- Provide warnings when fees are too low
- Include minimum fee in fee rate options

**New Functions**:

```typescript
async function validateFeeAgainstMinimum(
  txSize: number,
  feeSatoshis: number
): Promise<FeeValidation>;

async function getMinimumFeeRate(): Promise<number>;

function ensureMinimumFee(
  calculatedFee: number,
  minFeeRate: number,
  txSize: number
): number;
```

### 3. Create Minimum Fee API Endpoint (`app/api/minimum-fee/route.ts`)

**Purpose**: Provide minimum fee data to frontend

**Features**:

- Fetch and cache minimum fee from multiple sources
- Return standardized minimum fee information
- Include validation helpers for frontend use

**Response Format**:

```typescript
{
  minFeeRate: number,
  minFeeBTC: number,
  sources: Array<{node: string, fee: number}>,
  timestamp: number,
  network: 'testnet' | 'mainnet'
}
```

### 4. Enhance Fee Selector UI

**Modifications to `app/components/FeeSelector.tsx`**:

- Add minimum fee indicator
- Show warnings when selected fee is too low
- Display minimum fee requirement prominently
- Add validation feedback

**New UI Elements**:

- Minimum fee display
- Fee validation status indicator
- Warning messages for insufficient fees
- **"Meet Minimum" button positioned on the right side of custom fee input**
- **Minimum fee button only visible when custom fee mode is active**

**Detailed UI Specification**:

```typescript
// Custom fee section layout
<div className="bg-gray-800/50 p-4 rounded-lg backdrop-blur-sm">
  <label className="block text-sm text-gray-400 mb-2">
    Custom Fee Rate (sat/byte)
  </label>
  <div className="flex gap-2">
    <input
      type="number"
      min="1"
      max="1000"
      value={customFeeRate}
      onChange={(e) => handleCustomFeeChange(e.target.value)}
      placeholder="Enter custom fee rate"
      className="flex-1 px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded text-sm font-mono text-gray-300"
    />
    {/* Meet Minimum button - only visible in custom mode */}
    {isCustomFee && (
      <Button
        variant="secondary"
        size="sm"
        onClick={handleMeetMinimum}
        className="px-3 py-2 text-xs"
        icon="fas fa-arrow-up"
      >
        Meet Min
      </Button>
    )}
  </div>
  <div className="text-xs text-gray-500 mt-2">
    Enter a value between 1-1000 sat/byte
  </div>
</div>
```

**Button Functionality**:

- **Visibility**: Only appears when `isCustomFee` is true
- **Position**: Right side of the custom fee input field
- **Action**: Automatically sets the input value to the minimum required fee rate
- **Styling**: Compact button with icon and "Meet Min" text
- **State**: Updates the custom fee input and triggers validation

### 5. Update Transaction Creation Flow

**Modifications to transaction creation**:

- Validate fees before transaction creation
- Prevent transactions with insufficient fees
- Provide clear feedback about fee requirements
- Auto-adjust fees to meet minimum when possible

## Implementation Steps

### Phase 1: Core Minimum Fee Service ✅ COMPLETED

1. ✅ Create `lib/minimum-fee.ts` with core functionality
2. ✅ Implement node polling and caching
3. ✅ Add fallback mechanisms for testnet
4. ✅ Create comprehensive error handling

**Test Results**: All functionality working correctly

- ✅ Minimum fee fetching from multiple nodes (with graceful fallback)
- ✅ Fee validation against minimum requirements
- ✅ Fee adjustment to meet minimum requirements
- ✅ **Robust fallback to conservative estimates (1 sat/byte) when nodes unavailable**
- ✅ Comprehensive error handling and logging
- ✅ **Expected behavior**: Public testnet nodes are often unreliable, so fallback is the primary mechanism

### Phase 2: API Integration

1. Create `app/api/minimum-fee/route.ts`
2. Integrate minimum fee checks into existing fee API
3. Add validation endpoints for frontend use
4. Implement proper error responses

### Phase 3: Frontend Integration

1. Update `FeeSelector.tsx` with minimum fee display
2. **Add "Meet Minimum" button inside custom fee section (right side of input)**
3. **Implement minimum fee button functionality (only visible in custom mode)**
4. Add validation feedback to transaction forms
5. Implement fee adjustment suggestions
6. Add user-friendly error messages

### Phase 4: Transaction Flow Enhancement

1. Integrate minimum fee validation in transaction creation
2. Add pre-transaction fee validation
3. Implement automatic fee adjustment
4. Add comprehensive error handling

## Technical Considerations

### Caching Strategy

- Cache minimum fee data for 5-10 minutes
- Implement stale-while-revalidate pattern
- Handle cache invalidation on network changes

### Error Handling

- Graceful degradation when nodes are unavailable
- Clear error messages for users
- Fallback to conservative estimates

### Performance

- Parallel requests to multiple nodes
- Timeout handling for slow responses
- Efficient caching to reduce API calls

### Security

- Validate all fee data from external sources
- Sanitize user inputs for custom fees
- Prevent fee manipulation attacks

## User Experience Flow

### 1. Fee Selection

- User selects fee rate from presets
- System shows minimum fee requirement
- **When user clicks "Custom Fee":**
  - **Custom fee input field appears**
  - **"Meet Minimum" button appears on the right side of the input**
  - **Button automatically sets the minimum required fee rate**
- Validation feedback in real-time
- Clear indication if fee is sufficient

### 2. Transaction Creation

- Pre-validation of fees before transaction
- Automatic fee adjustment if needed
- Clear explanation of fee requirements
- Option to manually adjust fees

### 3. Error Handling

- Clear messages when fees are insufficient
- Suggestions for appropriate fee rates
- Links to fee estimation resources
- Helpful tooltips and explanations

## Testing Strategy

### Unit Tests

- Minimum fee calculation accuracy
- Fee validation logic
- Error handling scenarios
- Cache behavior

### Integration Tests

- API endpoint functionality
- Frontend-backend communication
- Real transaction fee validation
- Network error handling

### User Acceptance Tests

- Fee selection workflow
- **Custom fee mode with minimum fee button functionality**
- **Button placement and visibility in custom fee section**
- Transaction creation with minimum fees
- Error message clarity
- Performance under load

## Success Metrics

### Technical Metrics

- Minimum fee accuracy (within 1 sat/byte)
- API response time (< 2 seconds)
- Cache hit rate (> 80%)
- Error rate (< 5%)

### User Experience Metrics

- Transaction success rate (> 95%)
- User understanding of fee requirements
- Reduction in failed transactions
- User satisfaction with fee guidance

## Future Enhancements

### Advanced Features

- Dynamic fee adjustment based on network conditions
- Historical fee trend analysis
- Personalized fee recommendations
- Multi-network support (mainnet integration)

### Performance Optimizations

- WebSocket updates for real-time fee changes
- Predictive fee caching
- Optimized node selection algorithms
- CDN integration for global performance

## Conclusion

This integration plan provides a comprehensive approach to adding minimum fee validation to the Bitcoin transaction project. The implementation prioritizes user experience, reliability, and maintainability while ensuring all transactions meet network requirements.

The phased approach allows for incremental testing and validation, reducing risk while providing immediate value to users. The modular design ensures easy maintenance and future enhancements.
