import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';
import { LTCPSBTInfo, LTCSignature, LTCNetwork } from '../types/ltc-psbt';

const ECPair = ECPairFactory(tinysecp);

// Litecoin network configurations
const LTC_NETWORKS = {
  mainnet: {
    ...bitcoin.networks.bitcoin,
    bech32: 'ltc',
    pubKeyHash: 0x30, // L
    scriptHash: 0x32, // 3
    wif: 0xb0, // 6
  },
  testnet: {
    ...bitcoin.networks.testnet,
    bech32: 'tltc',
    pubKeyHash: 0x6f, // m/n
    scriptHash: 0xc4, // 2
    wif: 0xef, // 9
  },
};

/**
 * Parse LTC PSBT and extract basic information
 * @param psbtBase64 - Base64 encoded PSBT string
 * @returns LTCPSBTInfo with parsed details
 */
export function parseLTCPSBT(psbtBase64: string): LTCPSBTInfo {
  // Only log in development
  if (
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost'
  ) {
    console.log('parseLTCPSBT called with length:', psbtBase64.length);
  }

  try {
    // Try mainnet first, then testnet
    let psbt: bitcoin.Psbt;
    let network: LTCNetwork = 'mainnet';

    try {
      psbt = bitcoin.Psbt.fromBase64(psbtBase64, {
        network: LTC_NETWORKS.mainnet,
      });
    } catch {
      try {
        psbt = bitcoin.Psbt.fromBase64(psbtBase64, {
          network: LTC_NETWORKS.testnet,
        });
        network = 'testnet';
      } catch {
        throw new Error('Invalid LTC PSBT format for both mainnet and testnet');
      }
    }

    // Get basic info
    const inputs = psbt.data.inputs.length;
    const outputs = psbt.data.outputs.length;

    const result: LTCPSBTInfo = {
      inputs,
      outputs,
      network,
      rawPSBT: psbtBase64,
    };

    // Only log in development
    if (
      typeof window !== 'undefined' &&
      window.location.hostname === 'localhost'
    ) {
      console.log('Final LTC PSBT result:', result);
    }
    return result;
  } catch (error) {
    console.error('LTC PSBT parsing failed:', error);
    throw new Error('Invalid LTC PSBT format');
  }
}

/**
 * Sign LTC PSBT with private key
 * @param psbtBase64 - Base64 encoded PSBT string
 * @param privateKeyWIF - WIF format private key
 * @returns Signed PSBT in base64 format
 */
export function signLTCPSBT(psbtBase64: string, privateKeyWIF: string): string {
  try {
    // Determine network from private key
    const network: LTCNetwork =
      privateKeyWIF.startsWith('6') || privateKeyWIF.startsWith('9')
        ? 'testnet'
        : 'mainnet';

    const ltcNetwork = LTC_NETWORKS[network];
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network: ltcNetwork });
    const keyPair = ECPair.fromWIF(privateKeyWIF, ltcNetwork);

    // Sign all inputs that can be signed with this key
    for (let i = 0; i < psbt.data.inputs.length; i++) {
      try {
        // Use the signer interface properly
        const signer = {
          publicKey: Buffer.from(keyPair.publicKey),
          sign: (hash: Buffer) => Buffer.from(keyPair.sign(hash)),
        };
        psbt.signInput(i, signer);
      } catch {
        // Skip inputs that can't be signed with this key
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.log(`Could not sign LTC input ${i}`);
        }
      }
    }

    return psbt.toBase64();
  } catch (error) {
    console.error('LTC PSBT signing failed:', error);
    throw new Error('Failed to sign LTC PSBT');
  }
}

/**
 * Extract signatures from LTC PSBT
 * @param psbtBase64 - Base64 encoded PSBT string
 * @param privateKeyWIF - WIF format private key
 * @returns Array of LTC signatures
 */
export function extractLTCSignatures(
  psbtBase64: string,
  privateKeyWIF: string
): LTCSignature[] {
  try {
    // Determine network from private key
    const network: LTCNetwork =
      privateKeyWIF.startsWith('6') || privateKeyWIF.startsWith('9')
        ? 'testnet'
        : 'mainnet';

    const ltcNetwork = LTC_NETWORKS[network];
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network: ltcNetwork });
    const keyPair = ECPair.fromWIF(privateKeyWIF, ltcNetwork);

    const signatures: LTCSignature[] = [];

    // Sign inputs and extract signatures
    for (let i = 0; i < psbt.data.inputs.length; i++) {
      try {
        // Use the signer interface properly
        const signer = {
          publicKey: Buffer.from(keyPair.publicKey),
          sign: (hash: Buffer) => Buffer.from(keyPair.sign(hash)),
        };
        psbt.signInput(i, signer);
        const input = psbt.data.inputs[i];
        if (input.partialSig && input.partialSig.length > 0) {
          signatures.push({
            inputIndex: i,
            publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
            signature: input.partialSig[0].signature.toString('hex'),
          });
        }
      } catch {
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.log(`Could not sign LTC input ${i}`);
        }
      }
    }

    return signatures;
  } catch (error) {
    console.error('LTC signature extraction failed:', error);
    throw new Error('Failed to extract LTC signatures');
  }
}

/**
 * Validate LTC private key format
 * @param privateKeyWIF - WIF format private key
 * @returns True if valid LTC private key
 */
export function validateLTCPrivateKey(privateKeyWIF: string): boolean {
  try {
    // Try both mainnet and testnet
    try {
      ECPair.fromWIF(privateKeyWIF, LTC_NETWORKS.mainnet);
      return true;
    } catch {
      try {
        ECPair.fromWIF(privateKeyWIF, LTC_NETWORKS.testnet);
        return true;
      } catch {
        return false;
      }
    }
  } catch {
    return false;
  }
}

/**
 * Get signed LTC transaction hex from signed PSBT
 * @param signedPSBT - Base64 encoded signed PSBT
 * @returns Hex string of signed transaction
 */
export function getLTCSignedTransactionHex(signedPSBT: string): string {
  try {
    // Try both networks to find the correct one
    let psbt: bitcoin.Psbt;

    try {
      psbt = bitcoin.Psbt.fromBase64(signedPSBT, {
        network: LTC_NETWORKS.mainnet,
      });
    } catch {
      psbt = bitcoin.Psbt.fromBase64(signedPSBT, {
        network: LTC_NETWORKS.testnet,
      });
    }

    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    return tx.toHex();
  } catch (error) {
    console.error('LTC transaction extraction failed:', error);
    throw new Error('Failed to extract signed LTC transaction');
  }
}

/**
 * Validate LTC PSBT structure
 * @param psbtBase64 - Base64 encoded PSBT
 * @returns Validation result
 */
export function validateLTCPSBT(psbtBase64: string): {
  isValid: boolean;
  message: string;
  inputCount: number;
  outputCount: number;
  network: LTCNetwork | null;
} {
  try {
    // Try mainnet first
    try {
      const psbt = bitcoin.Psbt.fromBase64(psbtBase64, {
        network: LTC_NETWORKS.mainnet,
      });
      return {
        isValid: true,
        message: 'LTC PSBT is valid for mainnet',
        inputCount: psbt.data.inputs.length,
        outputCount: psbt.data.outputs.length,
        network: 'mainnet',
      };
    } catch {
      // Try testnet
      const psbt = bitcoin.Psbt.fromBase64(psbtBase64, {
        network: LTC_NETWORKS.testnet,
      });
      return {
        isValid: true,
        message: 'LTC PSBT is valid for testnet',
        inputCount: psbt.data.inputs.length,
        outputCount: psbt.data.outputs.length,
        network: 'testnet',
      };
    }
  } catch (error) {
    return {
      isValid: false,
      message: `Invalid LTC PSBT: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      inputCount: 0,
      outputCount: 0,
      network: null,
    };
  }
}

/**
 * Get LTC PSBT details without signing
 * @param psbtBase64 - Base64 encoded PSBT
 * @returns PSBT details
 */
export function getLTCPSBTDetails(psbtBase64: string): {
  inputCount: number;
  outputCount: number;
  totalInputValue: number;
  totalOutputValue: number;
  feeSatoshis: number;
  network: LTCNetwork;
} {
  // Try both networks to find the correct one
  let psbt: bitcoin.Psbt;
  let network: LTCNetwork = 'mainnet';

  try {
    psbt = bitcoin.Psbt.fromBase64(psbtBase64, {
      network: LTC_NETWORKS.mainnet,
    });
  } catch {
    psbt = bitcoin.Psbt.fromBase64(psbtBase64, {
      network: LTC_NETWORKS.testnet,
    });
    network = 'testnet';
  }

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
    totalOutputValue += (output as { value: number }).value || 0;
  }

  const feeSatoshis = totalInputValue - totalOutputValue;

  return {
    inputCount: psbt.data.inputs.length,
    outputCount: psbt.data.outputs.length,
    totalInputValue,
    totalOutputValue,
    feeSatoshis,
    network,
  };
}

/**
 * Export LTC PSBT in different formats
 * @param psbtBase64 - Base64 encoded PSBT
 * @returns Different export formats
 */
export function exportLTCPSBTFormats(psbtBase64: string): {
  base64: string;
  hex: string;
  json: unknown;
} {
  // Try both networks to find the correct one
  let psbt: bitcoin.Psbt;

  try {
    psbt = bitcoin.Psbt.fromBase64(psbtBase64, {
      network: LTC_NETWORKS.mainnet,
    });
  } catch {
    psbt = bitcoin.Psbt.fromBase64(psbtBase64, {
      network: LTC_NETWORKS.testnet,
    });
  }

  return {
    base64: psbt.toBase64(),
    hex: psbt.extractTransaction().toHex(),
    json: psbt.data,
  };
}
