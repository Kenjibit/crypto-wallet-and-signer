import {
  entropyToMnemonic as bip39EntropyToMnemonic,
  mnemonicToEntropy as bip39MnemonicToEntropy,
  mnemonicToSeed as bip39MnemonicToSeed,
  validateMnemonic as bip39ValidateMnemonic,
  wordlists,
} from 'bip39';
import { bytesToHex, hexToBytes } from '../utils/hex';

export type Wordlist = string[];

export const englishWordlist: Wordlist = wordlists.english;

export function entropyToMnemonic(
  entropy: Uint8Array,
  list: Wordlist = englishWordlist
): string {
  const hex = bytesToHex(entropy);
  return bip39EntropyToMnemonic(hex, list);
}

export function mnemonicToEntropy(
  mnemonic: string,
  list: Wordlist = englishWordlist
): Uint8Array {
  const hex = bip39MnemonicToEntropy(normalizeMnemonic(mnemonic), list);
  return hexToBytes(hex);
}

export async function mnemonicToSeed(
  mnemonic: string,
  passphrase = ''
): Promise<Uint8Array> {
  const seed = await bip39MnemonicToSeed(
    normalizeMnemonic(mnemonic),
    passphrase
  );
  return new Uint8Array(seed);
}

export function isValidMnemonic(
  mnemonic: string,
  list: Wordlist = englishWordlist
): boolean {
  return bip39ValidateMnemonic(normalizeMnemonic(mnemonic), list);
}

function normalizeMnemonic(m: string): string {
  return m.trim().replace(/\s+/g, ' ');
}
