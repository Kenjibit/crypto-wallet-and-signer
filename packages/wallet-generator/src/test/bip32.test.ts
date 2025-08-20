import { describe, it, expect } from 'vitest';
import { BIP32, BIP39 } from '..';

// Test vectors based on known derivation behaviors. These are smoke tests
// ensuring address format correctness for the network and kind.

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

async function seedFromMnemonic(): Promise<Uint8Array> {
  return BIP39.mnemonicToSeed(MNEMONIC);
}

describe('BIP32 address derivation', () => {
  it("derives mainnet P2PKH (BIP44 m/44'/0'/0'/0/0)", async () => {
    const seed = await seedFromMnemonic();
    const { address, path } = BIP32.deriveAddressFromSeed(seed, 'p2pkh', 0, {
      account: 0,
      change: 0,
      index: 0,
    });
    expect(path).toBe("m/44'/0'/0'/0/0");
    // Mainnet P2PKH should start with '1'
    expect(address.startsWith('1')).toBe(true);
  });

  it("derives testnet P2PKH (BIP44 m/44'/1'/0'/0/0)", async () => {
    const seed = await seedFromMnemonic();
    const { address, path } = BIP32.deriveAddressFromSeed(seed, 'p2pkh', 1, {
      account: 0,
      change: 0,
      index: 0,
    });
    expect(path).toBe("m/44'/1'/0'/0/0");
    // Testnet P2PKH should start with 'm' or 'n'
    expect(/^([mn])[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)).toBe(true);
  });

  it("derives mainnet Nested SegWit P2SH-P2WPKH (BIP49 m/49'/0'/0'/0/0)", async () => {
    const seed = await seedFromMnemonic();
    const { address, path } = BIP32.deriveAddressFromSeed(
      seed,
      'p2sh-p2wpkh',
      0,
      { account: 0, change: 0, index: 0 }
    );
    expect(path).toBe("m/49'/0'/0'/0/0");
    // Mainnet P2SH-P2WPKH should start with '3'
    expect(address.startsWith('3')).toBe(true);
  });

  it("derives testnet Nested SegWit P2SH-P2WPKH (BIP49 m/49'/1'/0'/0/0)", async () => {
    const seed = await seedFromMnemonic();
    const { address, path } = BIP32.deriveAddressFromSeed(
      seed,
      'p2sh-p2wpkh',
      1,
      { account: 0, change: 0, index: 0 }
    );
    expect(path).toBe("m/49'/1'/0'/0/0");
    // Testnet P2SH-P2WPKH should start with '2'
    expect(address.startsWith('2')).toBe(true);
  });

  it("derives mainnet P2WPKH bech32 (BIP84 m/84'/0'/0'/0/0)", async () => {
    const seed = await seedFromMnemonic();
    const { address, path } = BIP32.deriveAddressFromSeed(seed, 'p2wpkh', 0, {
      account: 0,
      change: 0,
      index: 0,
    });
    expect(path).toBe("m/84'/0'/0'/0/0");
    expect(address.startsWith('bc1')).toBe(true);
  });

  it("derives testnet P2WPKH bech32 (BIP84 m/84'/1'/0'/0/0)", async () => {
    const seed = await seedFromMnemonic();
    const { address, path } = BIP32.deriveAddressFromSeed(seed, 'p2wpkh', 1, {
      account: 0,
      change: 0,
      index: 0,
    });
    expect(path).toBe("m/84'/1'/0'/0/0");
    expect(address.startsWith('tb1')).toBe(true);
  });
});
