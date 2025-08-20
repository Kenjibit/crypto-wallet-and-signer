import { describe, it, expect } from 'vitest';
import { WalletExport } from '..';

const sampleWallet: WalletExport.GeneratedWallet = {
  mnemonic:
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  network: 'testnet',
  kind: 'p2wpkh',
  path: "m/84'/1'/0'/0/0",
  xpub: 'tpubD6NzVbkrYhZ4Ydummyxpub',
  wif: 'cVdummywif',
  publicKeyHex: '02deadbeef',
  address: 'tb1qdummytap',
};

describe('Wallet export helpers', () => {
  it('exports JSON and TXT deterministically', () => {
    const json = WalletExport.exportWalletAsJson(sampleWallet);
    const txt = WalletExport.exportWalletAsText(sampleWallet);
    expect(json).toContain('mnemonic');
    expect(txt).toContain('Mnemonic:');
  });

  it('encrypts and decrypts round-trip (Argon2 preferred)', async () => {
    const enc = await WalletExport.encryptWallet(sampleWallet, 'password123', {
      preferArgon2id: true,
      argon2MemoryMiBLadder: [16],
      argon2TimeCost: 2,
    });
    const dec = await WalletExport.decryptWallet(enc, 'password123');
    expect(dec.mnemonic).toBe(sampleWallet.mnemonic);
    expect(dec.address).toBe(sampleWallet.address);
  }, 60_000);

  it('fails on wrong password', async () => {
    const enc = await WalletExport.encryptWallet(
      sampleWallet,
      'right-password',
      {
        preferArgon2id: true,
        argon2MemoryMiBLadder: [16],
        argon2TimeCost: 2,
      }
    );
    await expect(
      WalletExport.decryptWallet(enc, 'wrong-password')
    ).rejects.toThrow();
  }, 60_000);

  it('produces fresh IV per export', async () => {
    const e1 = await WalletExport.encryptWallet(sampleWallet, 'pw', {
      preferArgon2id: false,
      pbkdf2Iterations: 100_000,
    });
    const e2 = await WalletExport.encryptWallet(sampleWallet, 'pw', {
      preferArgon2id: false,
      pbkdf2Iterations: 100_000,
    });
    expect(e1.header.ivB64).not.toBe(e2.header.ivB64);
  });

  it('PBKDF2 fallback works and decrypts', async () => {
    const enc = await WalletExport.encryptWallet(sampleWallet, 'pw', {
      preferArgon2id: false,
      pbkdf2Iterations: 120_000,
    });
    const dec = await WalletExport.decryptWallet(enc, 'pw');
    expect(dec.path).toBe(sampleWallet.path);
  }, 60_000);
});
