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

describe('Encrypted export binary serialization', () => {
  it('serializes and deserializes', async () => {
    const enc = await WalletExport.encryptWallet(sampleWallet, 'pw', {
      preferArgon2id: false,
      pbkdf2Iterations: 100_000,
    });
    const b64 = WalletExport.serializeEncryptedExportToBase64(enc);
    const decEnc = WalletExport.deserializeEncryptedExportFromBase64(b64);
    const round = await WalletExport.decryptWallet(decEnc, 'pw');
    expect(round.address).toBe(sampleWallet.address);
  });
});
