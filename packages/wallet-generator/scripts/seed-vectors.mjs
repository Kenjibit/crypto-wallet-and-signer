import { entropyToMnemonic, mnemonicToSeed, wordlists } from 'bip39';

const vectors = [
  {
    name: 'v1-12',
    entropyHex: '00000000000000000000000000000000',
    passphrase: 'TREZOR',
  },
  {
    name: 'v2-24',
    entropyHex:
      '0000000000000000000000000000000000000000000000000000000000000000',
    passphrase: 'TREZOR',
  },
];

for (const v of vectors) {
  const mnemonic = entropyToMnemonic(v.entropyHex, wordlists.english);
  const seed = await mnemonicToSeed(mnemonic, v.passphrase);
  const seedHex = Buffer.from(seed).toString('hex');
  console.log(
    JSON.stringify({ name: v.name, mnemonic, seedHex: seedHex.slice(0, 64) })
  );
}
