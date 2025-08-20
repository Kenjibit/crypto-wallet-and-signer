import { AddressKind, CoinType, NetworkType } from '../bip32';
import {
  utf8Encode,
  utf8Decode,
  concatBytes,
  numberToUint16BE,
  uint16BEToNumber,
  randomBytes,
  toBase64,
  fromBase64,
} from '../utils/binary';
import { deriveKey, KdfResult } from '../crypto/kdf';
import { encryptAesGcm, decryptAesGcm } from '../crypto/aes-gcm';

export interface GeneratedWallet {
  mnemonic: string;
  network: NetworkType;
  kind: AddressKind;
  path: string;
  xpub: string;
  wif: string;
  publicKeyHex: string;
  address: string;
}

export interface EncryptedExportHeaderV1 {
  version: 1;
  kdf: 'argon2id' | 'pbkdf2-sha256';
  kdfParams:
    | { memoryMiB: number; timeCost: number; parallelism: number }
    | { iterations: number };
  saltB64: string; // 16 bytes base64
  cipher: 'aes-256-gcm';
  ivB64: string; // 12 bytes base64
}

export type EncryptedExportHeader = EncryptedExportHeaderV1; // future versions can union here

export interface EncryptedExport {
  header: EncryptedExportHeader;
  payloadB64: string; // base64 of ciphertext (+ tag) with AAD bound to header JSON
}

// Binary blob format (base64 for transport):
// [2 bytes headerLen big-endian][header JSON utf8][ciphertext+tag]
export function serializeEncryptedExportToBase64(enc: EncryptedExport): string {
  const headerJson = JSON.stringify(enc.header);
  const headerBytes = utf8Encode(headerJson);
  const headerLen = numberToUint16BE(headerBytes.length);
  const ct = fromBase64(enc.payloadB64);
  const blob = concatBytes([headerLen, headerBytes, ct]);
  return toBase64(blob);
}

export function deserializeEncryptedExportFromBase64(
  b64: string
): EncryptedExport {
  const blob = fromBase64(b64);
  if (blob.length < 2) throw new Error('Blob too short');
  const headerLen = uint16BEToNumber(blob.subarray(0, 2));
  const start = 2;
  const end = start + headerLen;
  if (end > blob.length) throw new Error('Invalid header length');
  const headerJson = utf8Decode(blob.subarray(start, end));
  const header = JSON.parse(headerJson) as EncryptedExportHeader;
  const ct = blob.subarray(end);
  return { header, payloadB64: toBase64(ct) };
}

export function exportWalletAsJson(wallet: GeneratedWallet): string {
  return JSON.stringify(wallet, null, 2);
}

export function exportWalletAsText(wallet: GeneratedWallet): string {
  return [
    `Mnemonic: ${wallet.mnemonic}`,
    `Network: ${wallet.network}`,
    `Kind: ${wallet.kind}`,
    `Path: ${wallet.path}`,
    `XPUB: ${wallet.xpub}`,
    `WIF: ${wallet.wif}`,
    `PublicKey: ${wallet.publicKeyHex}`,
    `Address: ${wallet.address}`,
  ].join('\n');
}

export interface EncryptOptions {
  // passthrough to KDF
  preferArgon2id?: boolean;
  argon2MemoryMiBLadder?: number[];
  argon2TimeCost?: number;
  argon2Parallelism?: number;
  pbkdf2Iterations?: number;
  pbkdf2TargetMs?: number;
  // Testing hooks
  debugForceArgon2Failure?: boolean;
}

export async function encryptWallet(
  wallet: GeneratedWallet,
  password: string,
  options: EncryptOptions = {}
): Promise<EncryptedExport> {
  const kdfResult: KdfResult = await deriveKey(password, {
    preferArgon2id: options.preferArgon2id ?? true,
    argon2MemoryMiBLadder: options.argon2MemoryMiBLadder ?? [64, 32, 16],
    argon2TimeCost: options.argon2TimeCost ?? 3,
    argon2Parallelism: options.argon2Parallelism ?? 1,
    pbkdf2Iterations: options.pbkdf2Iterations,
    pbkdf2TargetMs: options.pbkdf2TargetMs ?? 350,
    debugForceArgon2Failure: options.debugForceArgon2Failure,
  });

  const iv = randomBytes(12);
  const header: EncryptedExportHeaderV1 = {
    version: 1,
    kdf: kdfResult.kind,
    kdfParams:
      kdfResult.kind === 'argon2id'
        ? {
            memoryMiB: (kdfResult.params as any).memoryMiB,
            timeCost: (kdfResult.params as any).timeCost,
            parallelism: (kdfResult.params as any).parallelism,
          }
        : { iterations: (kdfResult.params as any).iterations },
    saltB64: toBase64(kdfResult.salt),
    cipher: 'aes-256-gcm',
    ivB64: toBase64(iv),
  };

  const headerJson = JSON.stringify(header);
  const aad = utf8Encode(headerJson);
  const plaintext = utf8Encode(JSON.stringify(wallet));
  const ctWithTag = await encryptAesGcm(kdfResult.key, iv, plaintext, aad);

  return { header, payloadB64: toBase64(ctWithTag) };
}

export async function encryptText(
  text: string,
  password: string,
  options: EncryptOptions = {}
): Promise<EncryptedExport> {
  const kdfResult: KdfResult = await deriveKey(password, {
    preferArgon2id: options.preferArgon2id ?? true,
    argon2MemoryMiBLadder: options.argon2MemoryMiBLadder ?? [64, 32, 16],
    argon2TimeCost: options.argon2TimeCost ?? 3,
    argon2Parallelism: options.argon2Parallelism ?? 1,
    pbkdf2Iterations: options.pbkdf2Iterations,
    pbkdf2TargetMs: options.pbkdf2TargetMs ?? 350,
    debugForceArgon2Failure: options.debugForceArgon2Failure,
  });

  const iv = randomBytes(12);
  const header: EncryptedExportHeaderV1 = {
    version: 1,
    kdf: kdfResult.kind,
    kdfParams:
      kdfResult.kind === 'argon2id'
        ? {
            memoryMiB: (kdfResult.params as any).memoryMiB,
            timeCost: (kdfResult.params as any).timeCost,
            parallelism: (kdfResult.params as any).parallelism,
          }
        : { iterations: (kdfResult.params as any).iterations },
    saltB64: toBase64(kdfResult.salt),
    cipher: 'aes-256-gcm',
    ivB64: toBase64(iv),
  };

  const headerJson = JSON.stringify(header);
  const aad = utf8Encode(headerJson);
  const plaintext = utf8Encode(text);
  const ctWithTag = await encryptAesGcm(kdfResult.key, iv, plaintext, aad);

  return { header, payloadB64: toBase64(ctWithTag) };
}

export async function decryptWallet(
  data: EncryptedExport,
  password: string
): Promise<GeneratedWallet> {
  const headerJson = JSON.stringify(data.header);
  const aad = utf8Encode(headerJson);
  const salt = fromBase64(data.header.saltB64);
  const iv = fromBase64(data.header.ivB64);

  const kdfResult: KdfResult = await deriveKey(password, {
    salt,
    preferArgon2id: data.header.kdf === 'argon2id',
    argon2MemoryMiBLadder:
      data.header.kdf === 'argon2id'
        ? [(data.header.kdfParams as any).memoryMiB]
        : undefined,
    argon2TimeCost:
      data.header.kdf === 'argon2id'
        ? (data.header.kdfParams as any).timeCost
        : undefined,
    argon2Parallelism:
      data.header.kdf === 'argon2id'
        ? (data.header.kdfParams as any).parallelism
        : undefined,
    pbkdf2Iterations:
      data.header.kdf === 'pbkdf2-sha256'
        ? (data.header.kdfParams as any).iterations
        : undefined,
  });

  // Ensure we derived with the same kind
  if (kdfResult.kind !== data.header.kdf) {
    // Force derive with exact method if ladder logic switched
    if (data.header.kdf === 'argon2id') {
      const { memoryMiB, timeCost, parallelism } = data.header.kdfParams as any;
      const fixed = await (
        await import('../crypto/kdf')
      ).deriveKey(password, {
        salt,
        preferArgon2id: true,
        argon2MemoryMiBLadder: [memoryMiB],
        argon2TimeCost: timeCost,
        argon2Parallelism: parallelism,
      });
      (kdfResult as any).key = fixed.key;
    } else {
      const fixed = await (
        await import('../crypto/kdf')
      ).deriveKey(password, {
        salt,
        preferArgon2id: false,
        pbkdf2Iterations: (data.header.kdfParams as any).iterations,
      });
      (kdfResult as any).key = fixed.key;
    }
  }

  const ctWithTag = fromBase64(data.payloadB64);
  let plaintext: Uint8Array;
  try {
    plaintext = await decryptAesGcm(kdfResult.key, iv, ctWithTag, aad);
  } catch (e) {
    // Wrong password or tampered data
    throw new Error('Decryption failed. Wrong password or corrupted data.');
  }
  const json = utf8Decode(plaintext);
  return JSON.parse(json) as GeneratedWallet;
}
