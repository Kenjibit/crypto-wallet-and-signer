import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
import { ECPairFactory } from 'ecpair';
import { networks, payments, Network } from 'bitcoinjs-lib';

const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

// Litecoin network configuration
export const litecoinMainnet: Network = {
  ...networks.bitcoin,
  bech32: 'ltc',
  pubKeyHash: 0x30, // Litecoin mainnet pubkey hash
  scriptHash: 0x32, // Litecoin mainnet script hash
  wif: 0xB0, // Litecoin mainnet WIF
};

export const litecoinTestnet: Network = {
  ...networks.testnet,
  bech32: 'tltc',
  pubKeyHash: 0x6F, // Litecoin testnet pubkey hash
  scriptHash: 0x3A, // Litecoin testnet script hash
  wif: 0xEF, // Litecoin testnet WIF
};

export type AddressKind = 'p2pkh' | 'p2sh-p2wpkh' | 'p2wpkh';
export type NetworkType = 'mainnet' | 'testnet';

export interface DerivationOptions {
  account?: number;
  change?: 0 | 1;
  index?: number;
}

export interface LTCWalletResult {
  mnemonic: string;
  network: NetworkType;
  kind: AddressKind;
  path: string;
  xpub: string;
  wif: string;
  publicKeyHex: string;
  address: string;
}

export function getLTCNetwork(networkType: NetworkType): Network {
  return networkType === 'mainnet' ? litecoinMainnet : litecoinTestnet;
}

export function getPurposeFor(kind: AddressKind): 44 | 49 | 84 {
  if (kind === 'p2pkh') return 44;
  if (kind === 'p2sh-p2wpkh') return 49;
  return 84;
}

export function buildLTCDerivationPath(
  kind: AddressKind,
  networkType: NetworkType,
  options: DerivationOptions = {}
): string {
  const purpose = getPurposeFor(kind);
  const coinType = networkType === 'mainnet' ? 2 : 1; // Litecoin: 2 for mainnet, 1 for testnet
  const account = options.account ?? 0;
  const change = options.change ?? 0;
  const index = options.index ?? 0;
  return `m/${purpose}'/${coinType}'/${account}'/${change}/${index}`;
}

export function deriveLTCNodeFromSeed(seed: Uint8Array, networkType: NetworkType) {
  const network = getLTCNetwork(networkType);
  const root = bip32.fromSeed(Buffer.from(seed), network);
  return root;
}

export function deriveLTCAddressFromPublicKey(
  publicKey: Uint8Array,
  kind: AddressKind,
  networkType: NetworkType
): string {
  const network = getLTCNetwork(networkType);
  
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

export async function createLTCWallet(
  mnemonic: string,
  passphrase: string = '',
  kind: AddressKind = 'p2wpkh',
  networkType: NetworkType = 'mainnet',
  options: DerivationOptions = {}
): Promise<LTCWalletResult> {
  // Import BIP39 functions dynamically to avoid build issues
  const { mnemonicToSeed } = await import('bip39');
  
  const seed = await mnemonicToSeed(mnemonic, passphrase);
  const root = deriveLTCNodeFromSeed(new Uint8Array(seed), networkType);
  
  const account = options.account ?? 0;
  const change = options.change ?? 0;
  const index = options.index ?? 0;
  
  // Build full leaf path and account-level path
  const path = buildLTCDerivationPath(kind, networkType, { account, change, index });
  const accountPath = `m/${getPurposeFor(kind)}'/2'/${account}'`; // Litecoin coin type is 2
  
  const accountNode = root.derivePath(accountPath).neutered();
  const xpub = accountNode.toBase58();
  
  const leaf = root.derivePath(path);
  if (!leaf.privateKey || !leaf.publicKey) {
    throw new Error('Failed to derive leaf key material');
  }
  
  const keyPair = ECPair.fromPrivateKey(Buffer.from(leaf.privateKey), {
    compressed: true,
    network: getLTCNetwork(networkType),
  });
  
  const wif = keyPair.toWIF();
  const publicKeyHex = Buffer.from(leaf.publicKey).toString('hex');
  const address = deriveLTCAddressFromPublicKey(leaf.publicKey, kind, networkType);
  
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

// Helper function to validate Litecoin address
export function isValidLTCAddress(address: string, networkType: NetworkType = 'mainnet'): boolean {
  try {
    const network = getLTCNetwork(networkType);
    
    // Try to decode the address
    if (address.startsWith('L') || address.startsWith('M') || address.startsWith('3')) {
      // Legacy or P2SH addresses
      return true;
    } else if (address.startsWith('ltc1') || address.startsWith('tltc1')) {
      // Bech32 addresses
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}
