import * as bitcoin from 'bitcoinjs-lib';
import { UTXO } from '../types/bitcoin';

/**
 * PSBT Generator Service
 *
 * This service creates unsigned Partially Signed Bitcoin Transactions (PSBT)
 * that can be signed and broadcast by external applications.
 */

export interface TransactionOutput {
  address: string;
  value: number;
}

export interface PSBTResult {
  psbt: string; // Base64 encoded PSBT
  transactionSize: number;
  inputCount: number;
  outputCount: number;
  totalInputValue: number;
  totalOutputValue: number;
  feeSatoshis: number;
  changeAmount: number;
}

export interface PSBTInput {
  hash: string;
  index: number;
  witnessUtxo: {
    script: Buffer;
    value: number;
  };
}

export interface PSBTOutput {
  address: string;
  value: number;
}

/**
 * Create unsigned PSBT transaction
 * @param inputs - Array of UTXOs to spend
 * @param outputs - Array of transaction outputs
 * @param network - Bitcoin network (testnet/mainnet)
 * @returns Unsigned PSBT in base64 format
 */
export async function createUnsignedPSBT(
  inputs: UTXO[],
  outputs: TransactionOutput[],
  fromAddress: string,
  network: bitcoin.Network = bitcoin.networks.testnet
): Promise<PSBTResult> {
  try {
    console.log('createUnsignedPSBT called with:', {
      inputCount: inputs.length,
      outputCount: outputs.length,
    });

    // Create a new PSBT
    const psbt = new bitcoin.Psbt({ network });

    let totalInputValue = 0;
    let totalOutputValue = 0;

    // Add inputs with real transaction data
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      console.log(
        `Processing input ${i + 1}/${inputs.length}: ${input.txid}:${
          input.vout
        }`
      );

      // Create script from the fromAddress (all inputs are from the same address)
      const script = createScriptFromAddress(fromAddress);

      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        witnessUtxo: {
          script,
          value: input.value,
        },
      });

      totalInputValue += input.value;
      console.log(`Input ${i + 1} processed successfully`);
    }

    // Add outputs
    for (const output of outputs) {
      psbt.addOutput({
        address: output.address,
        value: output.value,
      });

      totalOutputValue += output.value;
    }

    // Calculate fee and change
    const feeSatoshis = totalInputValue - totalOutputValue;
    const changeAmount =
      outputs.length > 1 ? outputs[outputs.length - 1].value : 0;

    // Get PSBT in base64 format
    const psbtBase64 = psbt.toBase64();

    // Calculate transaction size
    const transactionSize = calculateTransactionSize(
      inputs.length,
      outputs.length
    );

    return {
      psbt: psbtBase64,
      transactionSize,
      inputCount: inputs.length,
      outputCount: outputs.length,
      totalInputValue,
      totalOutputValue,
      feeSatoshis,
      changeAmount,
    };
  } catch (error) {
    throw new Error(
      `Failed to create PSBT: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Fetch transaction script from blockchain
 * @param txid - Transaction ID
 * @param vout - Output index
 * @returns Script buffer
 */
function createScriptFromAddress(address: string): Buffer {
  console.log(`Creating script from address: ${address}`);

  try {
    // For now, focus on the most common address types
    // Most testnet addresses are P2WPKH (tb1...)
    if (address.startsWith('tb1') || address.startsWith('bc1')) {
      // Native SegWit (P2WPKH or P2WSH)
      const decoded = bitcoin.address.fromBech32(address);
      if (!decoded) {
        throw new Error(`Invalid Bech32 address: ${address}`);
      }

      // P2WPKH (20-byte hash) or P2WSH (32-byte hash)
      const script = bitcoin.script.compile([
        bitcoin.opcodes.OP_0,
        decoded.data,
      ]);
      console.log(`Successfully created SegWit script for address: ${address}`);
      return script;
    } else {
      // For other address types, use placeholder for now
      // TODO: Implement proper support for P2SH and Legacy addresses
      console.log(
        `Address type not fully supported yet: ${address}, using placeholder`
      );
      return createPlaceholderP2WPKHScript();
    }
  } catch (error) {
    console.error(`Error creating script for address ${address}:`, error);
    // Fallback to placeholder script
    return createPlaceholderP2WPKHScript();
  }
}

/**
 * Create placeholder P2WPKH script
 * This is a fallback solution when transaction fetch fails
 * @returns Placeholder script buffer
 */
function createPlaceholderP2WPKHScript(): Buffer {
  // Create a placeholder P2WPKH script
  // This is used as fallback when transaction fetch fails
  return bitcoin.script.compile([bitcoin.opcodes.OP_0, Buffer.alloc(20)]);
}

/**
 * Create P2WPKH script for an address
 * @param address - Bitcoin address
 * @returns Script buffer
 */
// Unused function - kept for future reference
// function createP2WPKHScript(address: string): Buffer {
//   // For P2WPKH addresses (tb1...), extract the hash
//   const decoded = bitcoin.address.fromBech32(address);
//   if (!decoded) {
//     throw new Error(`Invalid address: ${address}`);
//   }

//   // Create P2WPKH script
//   return bitcoin.script.compile([bitcoin.opcodes.OP_0, decoded.data]);
// }

/**
 * Calculate transaction size for P2WPKH transactions
 * @param inputCount - Number of inputs
 * @param outputCount - Number of outputs
 * @returns Transaction size in bytes
 */
function calculateTransactionSize(
  inputCount: number,
  outputCount: number
): number {
  // P2WPKH transaction size calculation (virtual size for fee calculation)
  // Virtual size accounts for SegWit witness discount (witness data / 4)
  const inputSize = 71; // Virtual input size: base (40 bytes) + witness discount (~31 bytes)
  const outputSize = 31; // 8 bytes value + 1 byte script length + 22 bytes script
  const overhead = 10; // version + locktime + witness marker + witness count

  return inputCount * inputSize + outputCount * outputSize + overhead;
}

/**
 * Create PSBT from UTXOs and outputs with automatic change calculation
 * @param inputs - Array of UTXOs to spend
 * @param toAddress - Destination address
 * @param amountSatoshis - Amount to send
 * @param fromAddress - Change address
 * @param network - Bitcoin network
 * @param feeRate - Fee rate in satoshis per byte
 * @returns Unsigned PSBT with change output
 */
export async function createPSBTWithChange(
  inputs: UTXO[],
  toAddress: string,
  amountSatoshis: number,
  fromAddress: string,
  network: bitcoin.Network = bitcoin.networks.testnet,
  feeRate: number = 5
): Promise<PSBTResult> {
  console.log('createPSBTWithChange called with:', {
    inputCount: inputs.length,
    toAddress,
    amountSatoshis,
    fromAddress,
    feeRate,
  });

  const totalInputValue = inputs.reduce((sum, input) => sum + input.value, 0);

  // Calculate outputs
  const outputs: TransactionOutput[] = [
    {
      address: toAddress,
      value: amountSatoshis,
    },
  ];

  // Calculate initial fee estimate with 2 outputs (recipient + change)
  let feeSatoshis = calculateEstimatedFee(inputs.length, 2, feeRate);
  let changeAmount = totalInputValue - amountSatoshis - feeSatoshis;

  // If change is below dust limit, add it to fee and recalculate
  if (changeAmount > 0 && changeAmount <= 546) {
    feeSatoshis += changeAmount;
    changeAmount = 0;
  }

  // Add change output if it's above dust limit
  if (changeAmount > 546) {
    outputs.push({
      address: fromAddress,
      value: changeAmount,
    });
  }

  console.log('PSBT calculation results:', {
    inputs: inputs.length,
    outputs: outputs.length,
    totalInputValue,
    amountSatoshis,
    feeSatoshis,
    changeAmount,
  });

  console.log('Starting PSBT creation...');
  const result = await createUnsignedPSBT(
    inputs,
    outputs,
    fromAddress,
    network
  );
  console.log('PSBT creation completed successfully');
  return result;
}

/**
 * Calculate estimated fee for transaction
 * @param inputCount - Number of inputs
 * @param outputCount - Number of outputs
 * @param feeRate - Fee rate in satoshis per byte
 * @returns Estimated fee in satoshis
 */
function calculateEstimatedFee(
  inputCount: number,
  outputCount: number,
  feeRate: number = 5
): number {
  const transactionSize = calculateTransactionSize(inputCount, outputCount);
  return transactionSize * feeRate;
}

/**
 * Validate PSBT structure
 * @param psbtBase64 - Base64 encoded PSBT
 * @returns Validation result
 */
export function validatePSBT(psbtBase64: string): {
  isValid: boolean;
  message: string;
  inputCount: number;
  outputCount: number;
} {
  try {
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64);

    return {
      isValid: true,
      message: 'PSBT is valid',
      inputCount: psbt.data.inputs.length,
      outputCount: psbt.data.outputs.length,
    };
  } catch (error) {
    return {
      isValid: false,
      message: `Invalid PSBT: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      inputCount: 0,
      outputCount: 0,
    };
  }
}

/**
 * Get PSBT details without signing
 * @param psbtBase64 - Base64 encoded PSBT
 * @returns PSBT details
 */
export function getPSBTDetails(psbtBase64: string): {
  inputCount: number;
  outputCount: number;
  totalInputValue: number;
  totalOutputValue: number;
  feeSatoshis: number;
} {
  const psbt = bitcoin.Psbt.fromBase64(psbtBase64);

  let totalInputValue = 0;
  let totalOutputValue = 0;

  // Calculate total input value
  for (const input of psbt.data.inputs) {
    if (input.witnessUtxo) {
      totalInputValue += input.witnessUtxo.value;
    }
  }

  // Calculate total output value
  for (const output of psbt.data.outputs) {
    // Access the value property correctly
    totalOutputValue += (output as { value: number }).value || 0;
  }

  const feeSatoshis = totalInputValue - totalOutputValue;

  return {
    inputCount: psbt.data.inputs.length,
    outputCount: psbt.data.outputs.length,
    totalInputValue,
    totalOutputValue,
    feeSatoshis,
  };
}

/**
 * Export PSBT in different formats
 * @param psbtBase64 - Base64 encoded PSBT
 * @returns Different export formats
 */
export function exportPSBTFormats(psbtBase64: string): {
  base64: string;
  hex: string;
  json: unknown;
} {
  const psbt = bitcoin.Psbt.fromBase64(psbtBase64);

  return {
    base64: psbt.toBase64(),
    hex: psbt.extractTransaction().toHex(),
    json: psbt.data, // Use psbt.data instead of toJSON()
  };
}
