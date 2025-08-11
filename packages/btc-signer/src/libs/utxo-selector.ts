import { UTXO } from '../types/bitcoin';

/**
 * UTXO Selection Service
 *
 * This service handles optimal UTXO selection for Bitcoin transactions
 * based on amount requirements and fee optimization.
 */

export interface UTXOSelectionResult {
  selectedUTXOs: UTXO[];
  totalValue: number;
  inputCount: number;
  changeAmount: number;
  feeSatoshis: number;
}

export interface UTXOBalance {
  totalBalance: number;
  confirmedUTXOs: UTXO[];
  unconfirmedUTXOs: UTXO[];
}

/**
 * Calculate total available balance from UTXOs
 * @param utxos - Array of UTXOs
 * @returns Total balance in satoshis
 */
export function calculateBalance(utxos: UTXO[]): number {
  return utxos.reduce((total, utxo) => total + utxo.value, 0);
}

/**
 * Filter and sort UTXOs by confirmation status and value
 * @param utxos - Array of UTXOs
 * @returns Filtered and sorted UTXOs
 */
export function filterAndSortUTXOs(utxos: UTXO[]): {
  confirmedUTXOs: UTXO[];
  unconfirmedUTXOs: UTXO[];
} {
  const confirmedUTXOs = utxos
    .filter((utxo) => utxo.status.confirmed)
    .sort((a, b) => b.value - a.value); // Largest first

  const unconfirmedUTXOs = utxos
    .filter((utxo) => !utxo.status.confirmed)
    .sort((a, b) => b.value - a.value);

  return { confirmedUTXOs, unconfirmedUTXOs };
}

/**
 * Select optimal UTXOs for transaction using greedy algorithm
 * @param utxos - Available UTXOs (should be pre-sorted by value, largest first)
 * @param requiredAmount - Amount needed (including fee)
 * @returns Selected UTXOs and total value
 */
export function selectOptimalUTXOs(
  utxos: UTXO[],
  requiredAmount: number
): { selectedUTXOs: UTXO[]; totalValue: number } {
  const selectedUTXOs: UTXO[] = [];
  let totalValue = 0;

  // Use greedy approach: select largest UTXOs first
  for (const utxo of utxos) {
    selectedUTXOs.push(utxo);
    totalValue += utxo.value;

    if (totalValue >= requiredAmount) {
      break;
    }
  }

  if (totalValue < requiredAmount) {
    throw new Error(
      `Insufficient funds: Need ${requiredAmount} satoshis, have ${totalValue} satoshis`
    );
  }

  return { selectedUTXOs, totalValue };
}

/**
 * Select UTXOs with minimum fee optimization
 * @param utxos - Available UTXOs
 * @param requiredAmount - Amount needed (excluding fee)
 * @param feeRate - Fee rate in satoshis per byte
 * @returns Optimal UTXO selection with fee calculation
 */
export function selectUTXOsWithFeeOptimization(
  utxos: UTXO[],
  requiredAmount: number,
  feeRate: number
): UTXOSelectionResult {
  const { confirmedUTXOs } = filterAndSortUTXOs(utxos);

  if (confirmedUTXOs.length === 0) {
    throw new Error('No confirmed UTXOs available');
  }

  // Start with single UTXO selection
  let selectedUTXOs: UTXO[] = [];
  let totalValue = 0;
  let feeSatoshis = 0;
  let changeAmount = 0;

  // Try to find a single UTXO that covers the amount + estimated fee
  const estimatedFee = estimateFeeForUTXOs(1, 2, feeRate);
  const initialRequired = requiredAmount + estimatedFee;

  // Find the smallest UTXO that covers the required amount
  const singleUTXO = confirmedUTXOs.find(
    (utxo) => utxo.value >= initialRequired
  );

  if (singleUTXO) {
    selectedUTXOs = [singleUTXO];
    totalValue = singleUTXO.value;
    feeSatoshis = estimatedFee;
    changeAmount = totalValue - requiredAmount - feeSatoshis;
  } else {
    // Need multiple UTXOs
    const { selectedUTXOs: multiUTXOs, totalValue: multiValue } =
      selectOptimalUTXOs(confirmedUTXOs, initialRequired);

    selectedUTXOs = multiUTXOs;
    totalValue = multiValue;
    feeSatoshis = estimateFeeForUTXOs(multiUTXOs.length, 2, feeRate);
    changeAmount = totalValue - requiredAmount - feeSatoshis;
  }

  // Handle dust limit for change
  const dustLimit = 546;
  if (changeAmount > 0 && changeAmount < dustLimit) {
    feeSatoshis += changeAmount;
    changeAmount = 0;
  }

  return {
    selectedUTXOs,
    totalValue,
    inputCount: selectedUTXOs.length,
    changeAmount,
    feeSatoshis,
  };
}

/**
 * Estimate fee for given number of inputs and outputs
 * @param inputCount - Number of inputs
 * @param outputCount - Number of outputs
 * @param feeRate - Fee rate in satoshis per byte
 * @returns Estimated fee in satoshis
 */
export function estimateFeeForUTXOs(
  inputCount: number,
  outputCount: number,
  feeRate: number
): number {
  // P2WPKH transaction size calculation
  const inputSize = 71; // Virtual input size for fee calculation (witness discount applied)
  const outputSize = 31; // 8 bytes value + 1 byte script length + 22 bytes script
  const overhead = 10; // version + locktime + witness marker + witness count

  const totalSize =
    inputCount * inputSize + outputCount * outputSize + overhead;
  return totalSize * feeRate;
}

/**
 * Get UTXO balance summary
 * @param utxos - Array of UTXOs
 * @returns Balance summary with confirmed and unconfirmed amounts
 */
export function getUTXOBalance(utxos: UTXO[]): UTXOBalance {
  const { confirmedUTXOs, unconfirmedUTXOs } = filterAndSortUTXOs(utxos);

  return {
    totalBalance: calculateBalance(confirmedUTXOs),
    confirmedUTXOs,
    unconfirmedUTXOs,
  };
}

/**
 * Validate UTXOs for transaction
 * @param utxos - Array of UTXOs
 * @param requiredAmount - Amount needed
 * @returns Validation result
 */
export function validateUTXOs(
  utxos: UTXO[],
  requiredAmount: number
): { isValid: boolean; message: string; availableBalance: number } {
  console.log('validateUTXOs called with:', {
    utxosCount: utxos.length,
    requiredAmount,
  });

  const { confirmedUTXOs } = filterAndSortUTXOs(utxos);
  const availableBalance = calculateBalance(confirmedUTXOs);

  console.log('UTXO validation results:', {
    confirmedUTXOsCount: confirmedUTXOs.length,
    availableBalance,
    requiredAmount,
  });

  if (confirmedUTXOs.length === 0) {
    console.log('No confirmed UTXOs available');
    return {
      isValid: false,
      message: 'No confirmed UTXOs available',
      availableBalance: 0,
    };
  }

  if (availableBalance < requiredAmount) {
    console.log('Insufficient balance');
    return {
      isValid: false,
      message: `Insufficient balance: Need ${requiredAmount} satoshis, have ${availableBalance} satoshis`,
      availableBalance,
    };
  }

  console.log('UTXOs are valid');
  return {
    isValid: true,
    message: `Sufficient balance: ${availableBalance} satoshis available`,
    availableBalance,
  };
}

/**
 * Find the best single UTXO for a transaction
 * @param utxos - Array of UTXOs
 * @param requiredAmount - Amount needed
 * @returns Best UTXO or null if none found
 */
export function findBestSingleUTXO(
  utxos: UTXO[],
  requiredAmount: number
): UTXO | null {
  const { confirmedUTXOs } = filterAndSortUTXOs(utxos);

  // Find the smallest UTXO that covers the required amount
  return confirmedUTXOs.find((utxo) => utxo.value >= requiredAmount) || null;
}

/**
 * Calculate optimal UTXO combination for minimum fee
 * @param utxos - Array of UTXOs
 * @param requiredAmount - Amount needed
 * @param feeRate - Fee rate in satoshis per byte
 * @returns Optimal UTXO selection
 */
export function calculateOptimalUTXOCombination(
  utxos: UTXO[],
  requiredAmount: number,
  feeRate: number
): UTXOSelectionResult {
  const { confirmedUTXOs } = filterAndSortUTXOs(utxos);

  if (confirmedUTXOs.length === 0) {
    throw new Error('No confirmed UTXOs available');
  }

  // Try single UTXO first
  const singleUTXO = findBestSingleUTXO(confirmedUTXOs, requiredAmount);
  if (singleUTXO) {
    const feeSatoshis = estimateFeeForUTXOs(1, 2, feeRate);
    const totalNeeded = requiredAmount + feeSatoshis;

    if (singleUTXO.value >= totalNeeded) {
      const changeAmount = singleUTXO.value - totalNeeded;
      return {
        selectedUTXOs: [singleUTXO],
        totalValue: singleUTXO.value,
        inputCount: 1,
        changeAmount: changeAmount > 546 ? changeAmount : 0,
        feeSatoshis,
      };
    }
  }

  // Fall back to multiple UTXO selection
  return selectUTXOsWithFeeOptimization(utxos, requiredAmount, feeRate);
}
