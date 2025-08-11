import * as bitcoin from 'bitcoinjs-lib';

// Bitcoin testnet API endpoints
const TESTNET_API_URLS = [
  'https://blockstream.info/testnet/api',
  'https://testnet-api.bitcoin.com/v2',
  'https://testnet.bitcoin.com/api',
];

export interface SignatureData {
  inputIndex: number;
  publicKey: string; // Hex format
  signature: string; // Hex format
  address?: string; // Optional for display
  timestamp?: string; // Optional for validation
}

export interface BroadcastResult {
  success: boolean;
  txid?: string;
  api?: string;
  message: string;
  error?: string;
  errors?: string[];
}

export interface CombineResult {
  success: boolean;
  psbtInputs?: number;
  psbtOutputs?: number;
  signaturesApplied?: number;
  transactionHex?: string;
  message: string;
  error?: string;
}

export interface TransactionStatus {
  txid?: string;
  version?: number;
  locktime?: number;
  size?: number;
  weight?: number;
  fee?: number;
  status?: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
  vin?: Array<{
    txid: string;
    vout: number;
    prevout?: {
      scriptpubkey: string;
      scriptpubkey_address: string;
      scriptpubkey_asm: string;
      scriptpubkey_type: string;
      value: number;
    };
    scriptsig: string;
    scriptsig_asm: string;
    witness?: string[];
    is_coinbase: boolean;
    sequence: number;
  }>;
  vout?: Array<{
    scriptpubkey: string;
    scriptpubkey_address: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    value: number;
  }>;
}

/**
 * Combine PSBT with signatures and finalize
 * @param psbtBase64 - Base64 encoded PSBT
 * @param signatures - Array of signature objects
 * @returns Combined transaction result
 */
export async function combinePSBTWithSignatures(
  psbtBase64: string,
  signatures: SignatureData[]
): Promise<CombineResult> {
  console.log('🔗 Combining PSBT with signatures...');
  console.log('PSBT length:', psbtBase64.length);
  console.log('Signatures count:', signatures.length);

  try {
    // Load PSBT
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64);
    console.log('✅ PSBT loaded with', psbt.data.inputs.length, 'inputs');

    // Apply signatures to PSBT
    for (const sig of signatures) {
      const { inputIndex, publicKey, signature } = sig;

      console.log(`📝 Applying signature to input ${inputIndex}...`);

      // Create partial signature
      const partialSig = {
        pubkey: Buffer.from(publicKey, 'hex'),
        signature: Buffer.from(signature, 'hex'),
      };

      // Add signature to PSBT
      psbt.updateInput(inputIndex, {
        partialSig: [partialSig],
      });
    }

    // Finalize the PSBT
    console.log('🔒 Finalizing PSBT...');
    psbt.finalizeAllInputs();

    // Extract the final transaction
    const tx = psbt.extractTransaction();
    const txHex = tx.toHex();

    console.log('✅ Transaction finalized successfully');
    console.log('Transaction hex length:', txHex.length);

    return {
      success: true,
      psbtInputs: psbt.data.inputs.length,
      psbtOutputs: psbt.data.outputs.length,
      signaturesApplied: signatures.length,
      transactionHex: txHex,
      message: 'PSBT successfully combined with signatures',
    };
  } catch (error) {
    console.error('❌ Error combining PSBT with signatures:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to combine PSBT with signatures',
    };
  }
}

/**
 * Broadcast a signed transaction to the Bitcoin testnet
 * @param txHex - Signed transaction in hex format
 * @returns Broadcast result
 */
export async function broadcastTransaction(
  txHex: string
): Promise<BroadcastResult> {
  console.log('📡 Broadcasting combined transaction...');
  console.log('Transaction hex:', txHex.substring(0, 50) + '...');

  const errors: string[] = [];

  // Try multiple APIs for redundancy
  for (const apiUrl of TESTNET_API_URLS) {
    try {
      console.log(`🔄 Trying ${apiUrl}...`);

      let response;
      if (apiUrl.includes('blockstream.info')) {
        // Blockstream API
        response = await fetch(`${apiUrl}/tx`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: txHex,
        });
      } else if (apiUrl.includes('bitcoin.com')) {
        // Bitcoin.com API
        response = await fetch(`${apiUrl}/rawtransactions/sendRawTransaction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hex: txHex }),
        });
      }

      if (response && response.ok) {
        const data = await response.text();
        console.log(`✅ Successfully broadcast via ${apiUrl}`);
        return {
          success: true,
          txid: data,
          api: apiUrl,
          message: 'Transaction broadcast successfully',
        };
      }
    } catch (error) {
      const errorMsg = `Failed to broadcast via ${apiUrl}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      console.log(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  // If all APIs failed
  console.log('❌ All broadcast attempts failed');
  return {
    success: false,
    errors: errors,
    message: 'Failed to broadcast transaction to all APIs',
  };
}

/**
 * Get transaction status from testnet
 * @param txid - Transaction ID
 * @returns Transaction status
 */
export async function getTransactionStatus(txid: string): Promise<{
  success: boolean;
  txid: string;
  status?: TransactionStatus;
  api?: string;
  message?: string;
}> {
  console.log(`🔍 Checking transaction status: ${txid}`);

  for (const apiUrl of TESTNET_API_URLS) {
    try {
      let response;
      if (apiUrl.includes('blockstream.info')) {
        response = await fetch(`${apiUrl}/tx/${txid}`, {
          method: 'GET',
        });
      } else if (apiUrl.includes('bitcoin.com')) {
        response = await fetch(
          `${apiUrl}/rawtransactions/getRawTransaction/${txid}?verbose=true`,
          {
            method: 'GET',
          }
        );
      }

      if (response && response.ok) {
        const data = await response.json();
        return {
          success: true,
          txid: txid,
          status: data,
          api: apiUrl,
        };
      }
    } catch (error) {
      console.log(
        `❌ Failed to get status from ${apiUrl}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  return {
    success: false,
    txid: txid,
    message: 'Failed to get transaction status from all APIs',
  };
}

/**
 * Combine PSBT with signatures and broadcast
 * @param psbt - Base64 encoded PSBT
 * @param signatures - Array of signature objects
 * @returns Combined and broadcast result
 */
export async function combineAndBroadcast(
  psbt: string,
  signatures: SignatureData[]
): Promise<{
  success: boolean;
  message: string;
  combineResult?: CombineResult;
  broadcastResult?: BroadcastResult;
}> {
  try {
    console.log('🔗 Combine and broadcast request received');
    console.log('PSBT length:', psbt.length);
    console.log('Signatures count:', signatures.length);

    // Step 1: Combine PSBT with signatures
    const combineResult = await combinePSBTWithSignatures(psbt, signatures);

    if (!combineResult.success) {
      return {
        success: false,
        message: combineResult.message,
        combineResult,
      };
    }

    // Step 2: Broadcast the combined transaction
    const broadcastResult = await broadcastTransaction(
      combineResult.transactionHex!
    );

    if (broadcastResult.success) {
      return {
        success: true,
        message: 'PSBT combined with signatures and broadcast successfully',
        combineResult,
        broadcastResult,
      };
    } else {
      return {
        success: false,
        message: 'PSBT combined successfully but broadcast failed',
        combineResult,
        broadcastResult,
      };
    }
  } catch (error) {
    console.error('Combine and broadcast error:', error);
    return {
      success: false,
      message: `Combine and broadcast error: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    };
  }
}
