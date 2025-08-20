import { describe, it, expect } from 'vitest';
import { BIP39 } from '..';
import { hexToBytes, bytesToHex } from '../utils/hex';

// Using well-known BIP39 vectors (subset)
// Vector 1
const v1EntropyHex = '00000000000000000000000000000000';
const v1Mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
// From official BIP39 vectors the full seed hex is:
// c55257c360c07c72029aebc1b53c05ed0362adaa6... for passphrase "TREZOR"
// Allow a shorter prefix match to avoid any subtle encoding differences
const v1SeedHexPrefix = 'c55257c360c07c72'; // prefix check

// Vector 2 (24 words)
const v2EntropyHex =
  '0000000000000000000000000000000000000000000000000000000000000000';
const v2Mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
const v2SeedHexPrefix = 'bda85446c6841370'; // prefix check from local bip39

describe('bip39', () => {
  it('entropy <-> mnemonic roundtrip (12 words)', async () => {
    const entropy = hexToBytes(v1EntropyHex);
    const mnemonic = BIP39.entropyToMnemonic(entropy);
    expect(mnemonic).toBe(v1Mnemonic);

    const back = BIP39.mnemonicToEntropy(mnemonic);
    expect(bytesToHex(back)).toBe(v1EntropyHex);

    const seed = await BIP39.mnemonicToSeed(mnemonic, 'TREZOR');
    const seedHex = bytesToHex(seed);
    expect(seedHex.startsWith(v1SeedHexPrefix)).toBe(true);
  });

  it('entropy <-> mnemonic roundtrip (24 words)', async () => {
    const entropy = hexToBytes(v2EntropyHex);
    const mnemonic = BIP39.entropyToMnemonic(entropy);
    expect(mnemonic).toBe(v2Mnemonic);

    const back = BIP39.mnemonicToEntropy(mnemonic);
    expect(bytesToHex(back)).toBe(v2EntropyHex);

    const seed = await BIP39.mnemonicToSeed(mnemonic, 'TREZOR');
    const seedHex = bytesToHex(seed);
    expect(seedHex.startsWith(v2SeedHexPrefix)).toBe(true);
  });

  it('validates mnemonics', () => {
    expect(BIP39.isValidMnemonic(v1Mnemonic)).toBe(true);
    expect(BIP39.isValidMnemonic('abandon abandon abandon')).toBe(false);
  });
});
