import {
  UTXO,
  UnsignedTransaction,
  TransactionRequest,
} from '../types/bitcoin';
import {
  createUnsignedTransaction,
  estimateTransactionFee,
} from './transaction-creator';
import { FeeEstimate } from './fee-estimator';

/**
 * Bitcoin Transaction Service
 *
 * This service provides functionality for creating unsigned Bitcoin transactions
 * that can be signed and broadcast by external applications.
 */

export interface TransactionFormData {
  fromAddress: string;
  toAddress: string;
  amount: string;
  currency: string;
  amountSummary: string;
  feeSummary: string;
  totalSummary: string;
  feeRate?: string;
}

/**
 * Fetch UTXOs for a Bitcoin address
 * @param address - Bitcoin address
 * @returns Array of UTXOs
 */
export const fetchUTXOs = async (address: string): Promise<UTXO[]> => {
  console.log('fetchUTXOs called with address:', address);

  try {
    console.log('Fetching UTXOs via proxy API...');
    const proxyUrl = `/api/utxo?address=${encodeURIComponent(address)}`;
    console.log('Fetching from proxy URL:', proxyUrl);

    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    console.log('Proxy response status:', response.status);
    console.log('Proxy response ok:', response.ok);

    if (response.ok) {
      const data = await response.json();
      console.log('UTXOs data received from proxy:', data);
      console.log('UTXOs data structure check:', {
        isArray: Array.isArray(data),
        length: data.length,
        firstItem: data[0],
        hasRequiredFields: data[0]
          ? {
              hasTxid: 'txid' in data[0],
              hasVout: 'vout' in data[0],
              hasValue: 'value' in data[0],
              hasStatus: 'status' in data[0],
            }
          : null,
      });
      return data;
    } else {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Proxy API returned ${response.status}: ${
          errorData.error || 'Unknown error'
        }`
      );
    }
  } catch (error) {
    console.error('Proxy API error:', error);
    throw new Error(
      `Failed to fetch UTXOs. Please check the address and try again.`
    );
  }
};

/**
 * Generate unsigned transaction
 * @param formData - Transaction form data
 * @param utxos - Available UTXOs
 * @returns Unsigned transaction details
 */
export const generateTransaction = async (
  formData: TransactionFormData,
  utxos: UTXO[]
): Promise<UnsignedTransaction> => {
  console.log('generateTransaction called with:', {
    formData,
    utxosCount: utxos.length,
  });

  // Validate inputs
  if (!formData.fromAddress || !formData.toAddress || !formData.amount) {
    throw new Error('Please fill in all required fields');
  }

  if (utxos.length === 0) {
    throw new Error('Please fetch UTXOs first');
  }

  const amountValue = parseFloat(formData.amount) || 0;
  if (amountValue <= 0) {
    throw new Error('Please enter a valid amount');
  }

  // Convert BTC to satoshis
  const amountSatoshis = Math.round(amountValue * 100000000);
  console.log('Amount in satoshis:', amountSatoshis);

  // Create transaction request
  const request: TransactionRequest = {
    fromAddress: formData.fromAddress,
    toAddress: formData.toAddress,
    amountSatoshis,
    feeRate:
      (formData.feeRate as 'slow' | 'normal' | 'fast' | 'priority') || 'normal',
    network: 'testnet',
  };

  console.log('Transaction request:', request);
  console.log('UTXOs for transaction:', utxos);

  try {
    // Create unsigned transaction
    const result = await createUnsignedTransaction(request, utxos);
    console.log('Transaction created successfully:', result);
    return result;
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
};

/**
 * Estimate transaction fee
 * @param formData - Transaction form data
 * @param utxos - Available UTXOs
 * @returns Fee estimation details
 */
export const estimateFee = async (
  formData: TransactionFormData,
  utxos: UTXO[],
  feeRates?: FeeEstimate
): Promise<{
  estimatedFee: number;
  changeAmount: number;
  utxosUsed: UTXO[];
  transactionSize: number;
  feeRate: number;
}> => {
  // Validate inputs
  if (!formData.fromAddress || !formData.toAddress || !formData.amount) {
    throw new Error('Please fill in all required fields');
  }

  if (utxos.length === 0) {
    throw new Error('Please fetch UTXOs first');
  }

  const amountValue = parseFloat(formData.amount) || 0;
  if (amountValue <= 0) {
    throw new Error('Please enter a valid amount');
  }

  // Convert BTC to satoshis
  const amountSatoshis = Math.round(amountValue * 100000000);

  // Create transaction request
  const request: TransactionRequest = {
    fromAddress: formData.fromAddress,
    toAddress: formData.toAddress,
    amountSatoshis,
    feeRate:
      (formData.feeRate as 'slow' | 'normal' | 'fast' | 'priority') || 'normal',
    network: 'testnet',
  };

  // Use provided fee rates or fetch if not provided
  const currentFeeRates = feeRates || (await getFeeRates());

  // Estimate fee using cached rates
  return await estimateTransactionFee(request, utxos, currentFeeRates);
};

/**
 * Get current fee rates from the network (with caching)
 * @returns Current fee rates
 */
export const getFeeRates = async (): Promise<FeeEstimate> => {
  // Use the cached getFeeEstimate function
  const { getFeeEstimate } = await import('./fee-estimator');
  return await getFeeEstimate();
};

/**
 * Validate address format
 * @param address - Bitcoin address to validate
 * @returns Validation result
 */
export const validateAddress = (address: string): boolean => {
  // Basic validation for testnet addresses
  return address.startsWith('tb1') && address.length >= 42;
};

/**
 * Convert satoshis to BTC
 * @param satoshis - Amount in satoshis
 * @returns Amount in BTC
 */
export const satoshisToBTC = (satoshis: number): number => {
  return satoshis / 100000000;
};

/**
 * Convert BTC to satoshis
 * @param btc - Amount in BTC
 * @returns Amount in satoshis
 */
export const btcToSatoshis = (btc: number): number => {
  return Math.round(btc * 100000000);
};
