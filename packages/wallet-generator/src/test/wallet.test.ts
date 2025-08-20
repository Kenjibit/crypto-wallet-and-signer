import { describe, it, expect } from 'vitest';
import { Wallet, BIP39 } from '..';

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('Wallet assembly (ECPair + WIF + address)', () => {
  it('assembles mainnet P2PKH wallet and validates shapes', async () => {
    const result = await Wallet.assembleWalletFromMnemonic({
      mnemonic: MNEMONIC,
      kind: 'p2pkh',
      coinType: 0,
      options: { account: 0, change: 0, index: 0 },
    });

    expect(result.path).toBe("m/44'/0'/0'/0/0");
    expect(result.network).toBe('mainnet');
    expect(result.xpub.startsWith('xpub')).toBe(true);
    expect(
      /^([KL])[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{51}$/.test(
        result.wif
      )
    ).toBe(true);
    expect(result.publicKeyHex.length).toBe(66);
    expect(
      result.publicKeyHex.startsWith('02') ||
        result.publicKeyHex.startsWith('03')
    ).toBe(true);
    expect(result.address.startsWith('1')).toBe(true);
  });

  it('assembles testnet P2WPKH wallet and validates shapes', async () => {
    const result = await Wallet.assembleWalletFromMnemonic({
      mnemonic: MNEMONIC,
      kind: 'p2wpkh',
      coinType: 1,
      options: { account: 0, change: 0, index: 0 },
    });

    expect(result.path).toBe("m/84'/1'/0'/0/0");
    expect(result.network).toBe('testnet');
    expect(result.xpub.startsWith('tpub')).toBe(true);
    expect(
      /^c[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{51}$/.test(
        result.wif
      )
    ).toBe(true);
    expect(result.publicKeyHex.length).toBe(66);
    expect(result.address.startsWith('tb1')).toBe(true);
  });
});
