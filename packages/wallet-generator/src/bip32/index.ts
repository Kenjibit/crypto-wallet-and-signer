import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
import { networks, payments, Network } from 'bitcoinjs-lib';

const bip32 = BIP32Factory(ecc);

export type NetworkType = 'mainnet' | 'testnet';
export type CoinType = 0 | 1; // 0: mainnet, 1: testnet (per BIP44 convention)
export type AddressKind = 'p2pkh' | 'p2sh-p2wpkh' | 'p2wpkh';

export interface DerivationOptions {
  account?: number; // default 0'
  change?: 0 | 1; // 0 external, 1 internal (change)
  index?: number; // default 0
}

export function resolveNetworkFromCoinType(coinType: CoinType): NetworkType {
  return coinType === 0 ? 'mainnet' : 'testnet';
}

export function getNetwork(networkType: NetworkType): Network {
  return networkType === 'mainnet' ? networks.bitcoin : networks.testnet;
}

export function getPurposeFor(kind: AddressKind): 44 | 49 | 84 {
  if (kind === 'p2pkh') return 44;
  if (kind === 'p2sh-p2wpkh') return 49;
  return 84;
}

export function buildDerivationPath(
  kind: AddressKind,
  coinType: CoinType,
  options: DerivationOptions = {}
): string {
  const purpose = getPurposeFor(kind);
  const account = options.account ?? 0;
  const change = options.change ?? 0;
  const index = options.index ?? 0;
  return `m/${purpose}'/${coinType}'/${account}'/${change}/${index}`;
}

export function deriveNodeFromSeed(seed: Uint8Array, networkType: NetworkType) {
  // bip32.fromSeed expects a Buffer; Node provides Buffer globally at runtime
  const network = getNetwork(networkType);
  const root = bip32.fromSeed(Buffer.from(seed), network);
  return root;
}

export function deriveAddressFromPublicKey(
  publicKey: Uint8Array,
  kind: AddressKind,
  networkType: NetworkType
): string {
  const network = getNetwork(networkType);
  if (kind === 'p2pkh') {
    const { address } = payments.p2pkh({
      pubkey: Buffer.from(publicKey),
      network,
    });
    if (!address) throw new Error('Failed to compute P2PKH address');
    return address;
  }
  if (kind === 'p2sh-p2wpkh') {
    const redeem = payments.p2wpkh({ pubkey: Buffer.from(publicKey), network });
    const { address } = payments.p2sh({ redeem, network });
    if (!address) throw new Error('Failed to compute P2SH-P2WPKH address');
    return address;
  }
  const { address } = payments.p2wpkh({
    pubkey: Buffer.from(publicKey),
    network,
  });
  if (!address) throw new Error('Failed to compute P2WPKH address');
  return address;
}

export function deriveAddressFromSeed(
  seed: Uint8Array,
  kind: AddressKind,
  coinType: CoinType,
  options: DerivationOptions = {}
): { address: string; path: string } {
  const networkType = resolveNetworkFromCoinType(coinType);
  const path = buildDerivationPath(kind, coinType, options);
  const root = deriveNodeFromSeed(seed, networkType);
  const child = root.derivePath(path);
  if (!child.publicKey) throw new Error('Failed to derive public key');
  const address = deriveAddressFromPublicKey(
    child.publicKey,
    kind,
    networkType
  );
  return { address, path };
}
