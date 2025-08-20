import { utf8Encode } from '../utils/binary';

export type KdfKind = 'argon2id' | 'pbkdf2-sha256';

export interface KdfResult {
  kind: KdfKind;
  key: Uint8Array; // 32 bytes
  salt: Uint8Array; // 16 bytes
  params:
    | {
        kind: 'argon2id';
        memoryMiB: number;
        timeCost: number;
        parallelism: number;
      }
    | { kind: 'pbkdf2-sha256'; iterations: number };
}

export interface DeriveKeyOptions {
  salt?: Uint8Array; // 16 bytes; generated if omitted
  preferArgon2id?: boolean; // default true
  // Argon2 tuning and test flags
  argon2MemoryMiBLadder?: number[]; // default [64, 32, 16]
  argon2TimeCost?: number; // default 3
  argon2Parallelism?: number; // default 1
  // PBKDF2 tuning
  pbkdf2Iterations?: number; // if omitted, calibrated ~350ms
  pbkdf2TargetMs?: number; // default 350
  // Testing hooks
  debugForceArgon2Failure?: boolean;
}

function getSubtle(): SubtleCrypto | null {
  const g: any = globalThis as any;
  if (g && g.crypto && g.crypto.subtle) return g.crypto.subtle as SubtleCrypto;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { webcrypto } = require('crypto');
    if (webcrypto && webcrypto.subtle) return webcrypto.subtle as SubtleCrypto;
  } catch {}
  return null;
}

function getCrypto(): Crypto | null {
  const g: any = globalThis as any;
  if (g && g.crypto) return g.crypto as Crypto;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { webcrypto } = require('crypto');
    return (webcrypto as unknown as Crypto) ?? null;
  } catch {
    return null;
  }
}

async function derivePBKDF2SHA256(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const subtle = getSubtle();
  if (subtle) {
    const keyMaterial = await subtle.importKey(
      'raw',
      utf8Encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const bits = await subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );
    return new Uint8Array(bits);
  }
  // Node.js fallback using crypto.pbkdf2
  const cryptoMod = await import('crypto');
  return await new Promise<Uint8Array>((resolve, reject) => {
    cryptoMod.pbkdf2(
      password,
      Buffer.from(salt),
      iterations,
      32,
      'sha256',
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(new Uint8Array(derivedKey));
      }
    );
  });
}

async function calibratePBKDF2Iterations(
  password: string,
  salt: Uint8Array,
  targetMs = 350
): Promise<number> {
  // Start with 100k iterations trial and scale
  const trial = 100_000;
  const t0 = Date.now();
  await derivePBKDF2SHA256(password, salt, trial);
  const t1 = Date.now();
  const elapsed = Math.max(1, t1 - t0);
  const scaled = Math.round((trial * targetMs) / elapsed);
  // Clamp to reasonable bounds
  return Math.max(50_000, Math.min(2_000_000, scaled));
}

async function deriveArgon2id(
  password: string,
  salt: Uint8Array,
  memoryMiB: number,
  timeCost: number,
  parallelism: number
): Promise<Uint8Array> {
  const mod = await import('hash-wasm');
  const hex = await mod.argon2id({
    password,
    salt,
    parallelism,
    memorySize: memoryMiB * 1024, // KiB
    iterations: timeCost,
    hashLength: 32,
    outputType: 'hex',
  });
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

export async function deriveKey(
  password: string,
  opts: DeriveKeyOptions = {}
): Promise<KdfResult> {
  const {
    salt = (() => {
      const out = new Uint8Array(16);
      const g = getCrypto();
      if (g && typeof g.getRandomValues === 'function') {
        g.getRandomValues(out);
      } else {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { webcrypto, randomFillSync } = require('crypto');
          if (webcrypto && typeof webcrypto.getRandomValues === 'function') {
            webcrypto.getRandomValues(out);
          } else {
            randomFillSync(out);
          }
        } catch {
          for (let i = 0; i < out.length; i += 1)
            out[i] = Math.floor(Math.random() * 256);
        }
      }
      return out;
    })(),
    preferArgon2id = true,
    argon2MemoryMiBLadder = [64, 32, 16],
    argon2TimeCost = 3,
    argon2Parallelism = 1,
    pbkdf2Iterations,
    pbkdf2TargetMs = 350,
    debugForceArgon2Failure = false,
  } = opts;

  if (preferArgon2id && !debugForceArgon2Failure) {
    for (const memoryMiB of argon2MemoryMiBLadder) {
      try {
        const key = await deriveArgon2id(
          password,
          salt,
          memoryMiB,
          argon2TimeCost,
          argon2Parallelism
        );
        return {
          kind: 'argon2id',
          key,
          salt,
          params: {
            kind: 'argon2id',
            memoryMiB,
            timeCost: argon2TimeCost,
            parallelism: argon2Parallelism,
          },
        };
      } catch (err) {
        // try next lower memory or fallback
        continue; // eslint-disable-line no-continue
      }
    }
  }

  // PBKDF2 fallback
  const iterations =
    pbkdf2Iterations ??
    (await calibratePBKDF2Iterations(password, salt, pbkdf2TargetMs));
  const key = await derivePBKDF2SHA256(password, salt, iterations);
  return {
    kind: 'pbkdf2-sha256',
    key,
    salt,
    params: { kind: 'pbkdf2-sha256', iterations },
  };
}
