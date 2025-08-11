import * as bitcoin from 'bitcoinjs-lib';
import { UTXO } from '../types/bitcoin';
import { getFeeEstimate, FeeEstimate } from './fee-estimator';
import {
  selectUTXOsWithFeeOptimization,
  validateUTXOs,
  getUTXOBalance,
} from './utxo-selector';
import { createPSBTWithChange } from './psbt-generator';

/**
 * Main Transaction Creator Service
 *
 * This service combines fee estimation, UTXO selection, and PSBT generation
 * to create unsigned Bitcoin transactions for external signing.
 */

export interface UnsignedTransaction {
  psbt: string; // Base64 encoded PSBT
  estimatedFee: number;
  changeAmount: number;
  recipientAmount: number; // Amount sent to recipient (excluding change)
  utxosUsed: UTXO[];
  transactionSize: number;
  feeRate: string;
  totalInputs: number;
  totalOutputs: number;
  totalInputValue: number;
  totalOutputValue: number;
  network: string;
  timestamp: number;
}

export interface TransactionRequest {
  fromAddress: string;
  toAddress: string;
  amountSatoshis: number;
  feeRate?: 'slow' | 'normal' | 'fast' | 'priority';
  network?: 'testnet' | 'mainnet';
}

export interface TransactionError extends Error {
  code: string;
}

/**
 * Create unsigned transaction with optimal fee calculation
 * @param request - Transaction request parameters
 * @param utxos - Available UTXOs for the from address
 * @returns Unsigned transaction details
 */
export async function createUnsignedTransaction(
  request: TransactionRequest,
  utxos: UTXO[]
): Promise<UnsignedTransaction> {
  try {
    const {
      fromAddress,
      toAddress,
      amountSatoshis,
      feeRate = 'normal',
      network = 'testnet',
    } = request;

    // Validate inputs
    if (!fromAddress || !toAddress || amountSatoshis <= 0) {
      throw createError('Invalid transaction parameters', 'INVALID_PARAMS');
    }

    // Validate UTXOs
    const validation = validateUTXOs(utxos, amountSatoshis);
    if (!validation.isValid) {
      throw createError(validation.message, 'INSUFFICIENT_FUNDS');
    }

    // Get current fee rates
    const feeRates = await getFeeEstimate();
    const currentFeeRate = feeRates[feeRate];

    // Select optimal UTXOs
    const utxoSelection = selectUTXOsWithFeeOptimization(
      utxos,
      amountSatoshis,
      currentFeeRate
    );

    // Create PSBT
    const bitcoinNetwork =
      network === 'testnet'
        ? bitcoin.networks.testnet
        : bitcoin.networks.bitcoin;
    const psbtResult = await createPSBTWithChange(
      utxoSelection.selectedUTXOs,
      toAddress,
      amountSatoshis,
      fromAddress,
      bitcoinNetwork,
      currentFeeRate
    );

    // Create unsigned transaction result
    const unsignedTransaction: UnsignedTransaction = {
      psbt: psbtResult.psbt,
      estimatedFee: psbtResult.feeSatoshis,
      changeAmount: psbtResult.changeAmount,
      recipientAmount: amountSatoshis,
      utxosUsed: utxoSelection.selectedUTXOs,
      transactionSize: psbtResult.transactionSize,
      feeRate,
      totalInputs: psbtResult.inputCount,
      totalOutputs: psbtResult.outputCount,
      totalInputValue: psbtResult.totalInputValue,
      totalOutputValue: psbtResult.totalOutputValue,
      network,
      timestamp: Date.now(),
    };

    return unsignedTransaction;
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      throw error;
    }
    throw createError(
      `Failed to create unsigned transaction: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'TRANSACTION_CREATION_FAILED'
    );
  }
}

/**
 * Create unsigned transaction with custom fee rate
 * @param request - Transaction request parameters
 * @param utxos - Available UTXOs
 * @param customFeeRate - Custom fee rate in satoshis per byte
 * @returns Unsigned transaction details
 */
export async function createUnsignedTransactionWithCustomFee(
  request: TransactionRequest,
  utxos: UTXO[],
  customFeeRate: number
): Promise<UnsignedTransaction> {
  try {
    const {
      fromAddress,
      toAddress,
      amountSatoshis,
      network = 'testnet',
    } = request;

    // Validate inputs
    if (!fromAddress || !toAddress || amountSatoshis <= 0) {
      throw createError('Invalid transaction parameters', 'INVALID_PARAMS');
    }

    if (customFeeRate <= 0) {
      throw createError('Invalid fee rate', 'INVALID_FEE_RATE');
    }

    // Validate UTXOs
    const validation = validateUTXOs(utxos, amountSatoshis);
    if (!validation.isValid) {
      throw createError(validation.message, 'INSUFFICIENT_FUNDS');
    }

    // Select optimal UTXOs with custom fee rate
    const utxoSelection = selectUTXOsWithFeeOptimization(
      utxos,
      amountSatoshis,
      customFeeRate
    );

    // Create PSBT
    const bitcoinNetwork =
      network === 'testnet'
        ? bitcoin.networks.testnet
        : bitcoin.networks.bitcoin;
    const psbtResult = await createPSBTWithChange(
      utxoSelection.selectedUTXOs,
      toAddress,
      amountSatoshis,
      fromAddress,
      bitcoinNetwork,
      customFeeRate
    );

    // Create unsigned transaction result
    const unsignedTransaction: UnsignedTransaction = {
      psbt: psbtResult.psbt,
      estimatedFee: psbtResult.feeSatoshis,
      changeAmount: psbtResult.changeAmount,
      recipientAmount: amountSatoshis,
      utxosUsed: utxoSelection.selectedUTXOs,
      transactionSize: psbtResult.transactionSize,
      feeRate: 'custom',
      totalInputs: psbtResult.inputCount,
      totalOutputs: psbtResult.outputCount,
      totalInputValue: psbtResult.totalInputValue,
      totalOutputValue: psbtResult.totalOutputValue,
      network,
      timestamp: Date.now(),
    };

    return unsignedTransaction;
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      throw error;
    }
    throw createError(
      `Failed to create unsigned transaction: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'TRANSACTION_CREATION_FAILED'
    );
  }
}

/**
 * Estimate transaction fee without creating PSBT
 * @param request - Transaction request parameters
 * @param utxos - Available UTXOs
 * @returns Fee estimation details
 */
export async function estimateTransactionFee(
  request: TransactionRequest,
  utxos: UTXO[],
  feeRates?: FeeEstimate
): Promise<{
  estimatedFee: number;
  changeAmount: number;
  utxosUsed: UTXO[];
  transactionSize: number;
  feeRate: number;
}> {
  try {
    const { amountSatoshis, feeRate = 'normal' } = request;

    // Use provided fee rates or fetch if not provided
    const currentFeeRates = feeRates || (await getFeeEstimate());
    const currentFeeRate = currentFeeRates[feeRate];

    // Select optimal UTXOs
    const utxoSelection = selectUTXOsWithFeeOptimization(
      utxos,
      amountSatoshis,
      currentFeeRate
    );

    return {
      estimatedFee: utxoSelection.feeSatoshis,
      changeAmount: utxoSelection.changeAmount,
      utxosUsed: utxoSelection.selectedUTXOs,
      transactionSize: utxoSelection.inputCount * 71 + 2 * 31 + 10, // P2WPKH virtual size calculation (witness discount applied)
      feeRate: currentFeeRate,
    };
  } catch (error) {
    throw createError(
      `Failed to estimate fee: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'FEE_ESTIMATION_FAILED'
    );
  }
}

/**
 * Get current fee rates
 * @returns Current network fee rates
 */
export async function getCurrentFeeRates(): Promise<FeeEstimate> {
  return await getFeeEstimate();
}

/**
 * Validate transaction request
 * @param request - Transaction request
 * @param utxos - Available UTXOs
 * @returns Validation result
 */
export function validateTransactionRequest(
  request: TransactionRequest,
  utxos: UTXO[]
): {
  isValid: boolean;
  message: string;
  availableBalance: number;
  requiredAmount: number;
} {
  try {
    const { amountSatoshis } = request;
    const balance = getUTXOBalance(utxos);
    const validation = validateUTXOs(utxos, amountSatoshis);

    return {
      isValid: validation.isValid,
      message: validation.message,
      availableBalance: balance.totalBalance,
      requiredAmount: amountSatoshis,
    };
  } catch (error) {
    return {
      isValid: false,
      message: `Validation failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      availableBalance: 0,
      requiredAmount: 0,
    };
  }
}

/**
 * Create error with code
 * @param message - Error message
 * @param code - Error code
 * @returns TransactionError
 */
function createError(message: string, code: string): TransactionError {
  const error = new Error(message) as TransactionError;
  error.code = code;
  return error;
}
