import axios from 'axios';

/**
 * Bitcoin Testnet Fee Estimator
 *
 * This service estimates appropriate fees for Bitcoin testnet transactions
 * based on current network conditions and transaction size.
 */

// Configuration
const config = {
  // Fee rates in satoshis per byte
  feeRates: {
    slow: 1, // 1 sat/byte - very slow confirmation
    normal: 5, // 5 sat/byte - normal confirmation time
    fast: 10, // 10 sat/byte - fast confirmation
    priority: 20, // 20 sat/byte - priority confirmation
  },

  // Transaction size estimates (in bytes)
  txSizes: {
    // P2WPKH (native SegWit) transaction sizes (virtual size for fee calculation)
    p2wpkh: {
      input: 71, // Virtual input size: base (40 bytes) + witness discount (~31 bytes)
      output: 31, // 8 bytes value + 1 byte script length + 22 bytes script
      overhead: 10, // version + locktime + witness marker + witness count
    },
  },
};

export interface FeeEstimate {
  slow: number;
  normal: number;
  fast: number;
  priority: number;
  timestamp: number;
}

export interface CurrentFeeRates {
  fastest: number;
  halfHour: number;
  hour: number;
  economy: number;
  minimum: number;
}

export interface FeeCalculation {
  feeRate: string;
  satPerByte: number;
  inputCount: number;
  outputCount: number;
  estimatedSize: number;
  feeSatoshis: number;
  feeBTC: number;
  breakdown: {
    inputs: number;
    outputs: number;
    overhead: number;
  };
}

export interface OptimalFeeResult {
  utxoValue: number;
  desiredAmount: number;
  feeSatoshis: number;
  changeAmount: number;
  totalSpent: number;
  inputCount: number;
  outputCount: number;
  feeEstimate: FeeCalculation;
}

/**
 * Estimate transaction fee based on number of inputs and outputs
 * @param inputCount - Number of inputs
 * @param outputCount - Number of outputs (including change)
 * @param feeRate - Fee rate type ('slow', 'normal', 'fast', 'priority')
 * @returns Fee estimation details
 */
export function estimateFee(
  inputCount: number,
  outputCount: number,
  feeRate: keyof typeof config.feeRates = 'normal'
): FeeCalculation {
  const rate = config.feeRates[feeRate];
  if (!rate) {
    throw new Error(
      `Invalid fee rate: ${feeRate}. Use 'slow', 'normal', 'fast', or 'priority'`
    );
  }

  // Calculate transaction size
  const inputSize = config.txSizes.p2wpkh.input;
  const outputSize = config.txSizes.p2wpkh.output;
  const overhead = config.txSizes.p2wpkh.overhead;

  const totalSize =
    inputCount * inputSize + outputCount * outputSize + overhead;
  const feeSatoshis = totalSize * rate;

  return {
    feeRate,
    satPerByte: rate,
    inputCount,
    outputCount,
    estimatedSize: totalSize,
    feeSatoshis,
    feeBTC: feeSatoshis / 100000000,
    breakdown: {
      inputs: inputCount * inputSize,
      outputs: outputCount * outputSize,
      overhead,
    },
  };
}

/**
 * Get current fee rates from mempool.space API
 * @returns Current fee rates
 */
export async function getCurrentFeeRates(): Promise<CurrentFeeRates> {
  try {
    console.log('Fetching current fee rates from our API...');
    const response = await axios.get('/api/fee-rates');

    console.log('API Response:', response.data);

    // Validate the response data
    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Invalid API response format');
    }

    // Convert from FeeEstimate to CurrentFeeRates format
    const rates = {
      fastest: response.data.priority || 25,
      halfHour: response.data.fast || 15,
      hour: response.data.normal || 8,
      economy: response.data.slow || 3,
      minimum: 1,
    };

    console.log('Parsed fee rates:', rates);
    return rates;
  } catch (error) {
    console.log('⚠️  Could not fetch current fee rates, using defaults');
    console.log('Error details:', error);

    // More realistic fallback values for testnet
    return {
      fastest: 25,
      halfHour: 15,
      hour: 8,
      economy: 3,
      minimum: 1,
    };
  }
}

/**
 * Calculate optimal fee based on UTXO value and desired amount
 * @param utxoValue - UTXO value in satoshis
 * @param desiredAmount - Desired transaction amount in satoshis
 * @param feeRate - Fee rate type
 * @returns Transaction details with fee calculation
 */
export function calculateOptimalFee(
  utxoValue: number,
  desiredAmount: number,
  feeRate: keyof typeof config.feeRates = 'normal'
): OptimalFeeResult {
  // Start with 1 input, 2 outputs (recipient + change)
  const inputCount = 1;
  let outputCount = 2;

  // Estimate initial fee
  const feeEstimate = estimateFee(inputCount, outputCount, feeRate);
  const totalNeeded = desiredAmount + feeEstimate.feeSatoshis;

  // Check if we have enough funds
  if (totalNeeded > utxoValue) {
    throw new Error(
      `Insufficient funds: Need ${totalNeeded} satoshis, have ${utxoValue} satoshis`
    );
  }

  // Calculate change amount
  const changeAmount = utxoValue - desiredAmount - feeEstimate.feeSatoshis;

  // If change is too small (dust limit), add it to fee
  const dustLimit = 546; // Bitcoin dust limit
  if (changeAmount > 0 && changeAmount < dustLimit) {
    feeEstimate.feeSatoshis += changeAmount;
    outputCount = 1; // No change output
  }

  return {
    utxoValue,
    desiredAmount,
    feeSatoshis: feeEstimate.feeSatoshis,
    changeAmount: outputCount === 2 ? changeAmount : 0,
    totalSpent: desiredAmount + feeEstimate.feeSatoshis,
    inputCount,
    outputCount,
    feeEstimate,
  };
}

/**
 * Estimate fee for a specific transaction scenario
 * @param utxoValue - UTXO value in satoshis
 * @param desiredAmount - Desired transaction amount in satoshis
 * @param feeRate - Fee rate type
 * @returns Fee estimation for the specific transaction
 */
export function estimateSpecificTransaction(
  utxoValue: number,
  desiredAmount: number,
  feeRate: keyof typeof config.feeRates = 'normal'
): OptimalFeeResult {
  return calculateOptimalFee(utxoValue, desiredAmount, feeRate);
}

// Shared cache for fee rates
let feeEstimateCache: FeeEstimate | null = null;
let feeEstimateCacheTime: number = 0;
const FEE_ESTIMATE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get fee estimate with current network rates
 * @returns Fee estimate with current network rates
 */
export async function getFeeEstimate(): Promise<FeeEstimate> {
  const now = Date.now();

  // Return cached rates if they're still valid
  if (
    feeEstimateCache &&
    now - feeEstimateCacheTime < FEE_ESTIMATE_CACHE_DURATION
  ) {
    console.log('Using cached fee estimate');
    return feeEstimateCache;
  }

  console.log('Fetching fresh fee estimate from API');
  const currentRates = await getCurrentFeeRates();

  const feeEstimate = {
    slow: currentRates.economy,
    normal: currentRates.hour,
    fast: currentRates.halfHour,
    priority: currentRates.fastest,
    timestamp: Date.now(),
  };

  // Cache the new rates
  feeEstimateCache = feeEstimate;
  feeEstimateCacheTime = now;

  return feeEstimate;
}

/**
 * Calculate transaction size for P2WPKH transactions
 * @param inputCount - Number of inputs
 * @param outputCount - Number of outputs
 * @returns Transaction size in bytes
 */
export function calculateTransactionSize(
  inputCount: number,
  outputCount: number
): number {
  const inputSize = config.txSizes.p2wpkh.input;
  const outputSize = config.txSizes.p2wpkh.output;
  const overhead = config.txSizes.p2wpkh.overhead;

  return inputCount * inputSize + outputCount * outputSize + overhead;
}
