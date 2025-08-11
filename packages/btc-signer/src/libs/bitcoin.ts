import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';

const ECPair = ECPairFactory(tinysecp);

export interface PSBTInfo {
  inputs: number;
  outputs: number;
  network: 'testnet' | 'mainnet';
  rawPSBT: string;
}

export function parsePSBT(psbtBase64: string): PSBTInfo {
  // Only log in development (check if we're in browser and not in production)
  if (
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost'
  ) {
    console.log('parsePSBT called with length:', psbtBase64.length);
  }

  try {
    // Try testnet first (since this is a testnet transaction)
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64, {
      network: bitcoin.networks.testnet,
    });
    const network: 'testnet' | 'mainnet' = 'testnet';

    // Get basic info
    const inputs = psbt.data.inputs.length;
    const outputs = psbt.data.outputs.length;

    const result = {
      inputs,
      outputs,
      network,
      rawPSBT: psbtBase64,
    };

    // Only log in development (check if we're in browser and not in production)
    if (
      typeof window !== 'undefined' &&
      window.location.hostname === 'localhost'
    ) {
      console.log('Final PSBT result:', result);
    }
    return result;
  } catch (error) {
    console.error('PSBT parsing failed:', error);
    throw new Error('Invalid PSBT format');
  }
}

export function signPSBT(psbtBase64: string, privateKeyWIF: string): string {
  try {
    // Determine network from private key
    const network = privateKeyWIF.startsWith('c')
      ? bitcoin.networks.testnet
      : bitcoin.networks.bitcoin;

    const psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network });
    const keyPair = ECPair.fromWIF(privateKeyWIF, network);

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
        // Only log in development (check if we're in browser and not in production)
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.log(`Could not sign input ${i}`);
        }
      }
    }

    return psbt.toBase64();
  } catch {
    throw new Error('Failed to sign PSBT');
  }
}

export function extractSignatures(
  psbtBase64: string,
  privateKeyWIF: string
): Array<{
  inputIndex: number;
  publicKey: string;
  signature: string;
}> {
  try {
    const network = privateKeyWIF.startsWith('c')
      ? bitcoin.networks.testnet
      : bitcoin.networks.bitcoin;
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network });
    const keyPair = ECPair.fromWIF(privateKeyWIF, network);

    const signatures: Array<{
      inputIndex: number;
      publicKey: string;
      signature: string;
    }> = [];

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
        // Only log in development (check if we're in browser and not in production)
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.log(`Could not sign input ${i}`);
        }
      }
    }

    return signatures;
  } catch {
    throw new Error('Failed to extract signatures');
  }
}

export function validatePrivateKey(privateKeyWIF: string): boolean {
  try {
    // Remove any whitespace
    const cleanKey = privateKeyWIF.trim();

    // Basic WIF format validation
    const wifRegex = /^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/;
    const testnetWifRegex = /^[c9][1-9A-HJ-NP-Za-km-z]{50,51}$/;

    return wifRegex.test(cleanKey) || testnetWifRegex.test(cleanKey);
  } catch {
    return false;
  }
}

export function getSignedTransactionHex(signedPSBT: string): string {
  try {
    const psbt = bitcoin.Psbt.fromBase64(signedPSBT);
    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    return tx.toHex();
  } catch {
    throw new Error('Failed to extract signed transaction');
  }
}
