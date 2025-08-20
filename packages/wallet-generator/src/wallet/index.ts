import * as ecc from 'tiny-secp256k1';
import { ECPairFactory, ECPairInterface } from 'ecpair';
import { networks } from 'bitcoinjs-lib';
import { bytesToHex } from '../utils/hex';
import {
  AddressKind,
  CoinType,
  DerivationOptions,
  NetworkType,
  buildDerivationPath,
  deriveNodeFromSeed,
  deriveAddressFromPublicKey,
  getNetwork,
  resolveNetworkFromCoinType,
} from '../bip32';
import * as BIP39 from '../bip39';

const ECPair = ECPairFactory(ecc);

export interface WalletAssemblyInput {
  mnemonic: string;
  passphrase?: string;
  kind: AddressKind;
  coinType: CoinType;
  options?: DerivationOptions;
}

export interface WalletAssemblyResult {
  mnemonic: string;
  network: NetworkType;
  kind: AddressKind;
  path: string;
  xpub: string; // account-level xpub (m/purpose'/coinType'/account')
  wif: string; // compressed WIF at full path (change/index)
  publicKeyHex: string; // compressed public key hex of leaf key
  address: string; // address for "kind" at leaf
}

export function privateKeyToECPair(
  privateKey: Uint8Array,
  networkType: NetworkType
): ECPairInterface {
  const network = getNetwork(networkType);
  return ECPair.fromPrivateKey(Buffer.from(privateKey), {
    compressed: true,
    network,
  });
}

export function privateKeyToWIF(
  privateKey: Uint8Array,
  networkType: NetworkType
): string {
  const keyPair = privateKeyToECPair(privateKey, networkType);
  return keyPair.toWIF();
}

export async function assembleWalletFromMnemonic(
  input: WalletAssemblyInput
): Promise<WalletAssemblyResult> {
  const { mnemonic, passphrase = '', kind, coinType, options = {} } = input;
  const networkType = resolveNetworkFromCoinType(coinType);
  const network = getNetwork(networkType);

  const seed = await BIP39.mnemonicToSeed(mnemonic, passphrase);
  const root = deriveNodeFromSeed(seed, networkType);

  const account = options.account ?? 0;
  const change = options.change ?? 0;
  const index = options.index ?? 0;

  // Build full leaf path and account-level path
  const path = buildDerivationPath(kind, coinType, { account, change, index });
  const accountPath = `m/${(() => {
    if (kind === 'p2pkh') return 44;
    if (kind === 'p2sh-p2wpkh') return 49;
    return 84;
  })()}'/${coinType}'/${account}'`;

  const accountNode = root.derivePath(accountPath).neutered();
  const xpub = accountNode.toBase58();

  const leaf = root.derivePath(path);
  if (!leaf.privateKey || !leaf.publicKey) {
    throw new Error('Failed to derive leaf key material');
  }

  const keyPair = ECPair.fromPrivateKey(Buffer.from(leaf.privateKey), {
    compressed: true,
    network,
  });
  const wif = keyPair.toWIF();

  const publicKeyHex = bytesToHex(keyPair.publicKey);
  const address = deriveAddressFromPublicKey(
    keyPair.publicKey,
    kind,
    networkType
  );

  return {
    mnemonic,
    network: networkType,
    kind,
    path,
    xpub,
    wif,
    publicKeyHex,
    address,
  };
}
