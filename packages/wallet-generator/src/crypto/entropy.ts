import { webcrypto as nodeWebCrypto, randomFillSync } from 'crypto';

export type EntropyBits = 128 | 160 | 192 | 224 | 256;

export interface EntropyValidationOptions {
  allowedBits?: EntropyBits[];
  requireNonZero?: boolean;
  requireNonOnes?: boolean;
  detectShortCycles?: boolean; // reject repeating short patterns
  maxCycleLength?: number; // default 8
  detectMonotonic?: boolean; // reject strictly ascending/descending sequences
  minUniqueBytes?: number; // override default unique-bytes threshold
  disallowHalfRepeat?: boolean; // reject first half == second half
}

export interface EntropyValidationResult {
  isValid: boolean;
  bitLength: number;
  errors: string[];
}

function fillWithCSPRNG(target: Uint8Array): void {
  const g: any = globalThis as any;
  if (g && g.crypto && typeof g.crypto.getRandomValues === 'function') {
    g.crypto.getRandomValues(target);
    return;
  }
  if (nodeWebCrypto && typeof nodeWebCrypto.getRandomValues === 'function') {
    nodeWebCrypto.getRandomValues(target);
    return;
  }
  randomFillSync(target);
}

export function generateEntropy(bits: EntropyBits = 256): Uint8Array {
  const validSet: number[] = [128, 160, 192, 224, 256];
  if (!validSet.includes(bits)) {
    throw new Error('Entropy size must be one of 128, 160, 192, 224, 256 bits');
  }
  const out = new Uint8Array(bits / 8);
  fillWithCSPRNG(out);
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export async function sha256Bytes(
  data: Uint8Array | Uint8Array[]
): Promise<Uint8Array> {
  const bytes = Array.isArray(data) ? concat(data) : data;
  const g: any = globalThis as any;
  if (
    g &&
    g.crypto &&
    g.crypto.subtle &&
    typeof g.crypto.subtle.digest === 'function'
  ) {
    const digest = await g.crypto.subtle.digest('SHA-256', bytes);
    return new Uint8Array(digest);
  }
  const { createHash } = await import('crypto');
  const h = createHash('sha256');
  h.update(bytes);
  return new Uint8Array(h.digest());
}

// Mixes any number of entropy parts with SHA-256 over their concatenation.
// Security note: If at least one part has high min-entropy unknown to an attacker,
// the output is computationally indistinguishable from random (treating SHA-256 as a
// randomness extractor here). Intended for testing and non-browser contexts, but
// safe to use in browsers as well.
export async function mixEntropyParts(
  parts: Uint8Array[]
): Promise<Uint8Array> {
  return sha256Bytes(parts);
}

export function isAllZero(bytes: Uint8Array): boolean {
  for (let i = 0; i < bytes.length; i += 1) {
    if (bytes[i] !== 0x00) return false;
  }
  return true;
}

export function isAllOnes(bytes: Uint8Array): boolean {
  for (let i = 0; i < bytes.length; i += 1) {
    if (bytes[i] !== 0xff) return false;
  }
  return true;
}

// Removed Shannon estimation per request

export function validateEntropy(
  bytes: Uint8Array,
  options: EntropyValidationOptions = {}
): EntropyValidationResult {
  const errors: string[] = [];
  const bitLength = bytes.length * 8;
  const allowed = options.allowedBits ?? [128, 160, 192, 224, 256];
  const requireNonZero = options.requireNonZero ?? true;
  const requireNonOnes = options.requireNonOnes ?? true;
  const detectShortCycles = options.detectShortCycles ?? true;
  const maxCycleLength = options.maxCycleLength ?? 8;
  const detectMonotonic = options.detectMonotonic ?? true;
  const disallowHalfRepeat = options.disallowHalfRepeat ?? true;

  if (!allowed.includes(bitLength as EntropyBits)) {
    errors.push('Invalid entropy length');
  }
  if (requireNonZero && isAllZero(bytes)) {
    errors.push('Entropy must not be all zeros');
  }
  if (requireNonOnes && isAllOnes(bytes)) {
    errors.push('Entropy must not be all ones');
  }

  // Reject first half == second half (highly structured)
  if (disallowHalfRepeat && bytes.length % 2 === 0) {
    const half = bytes.length / 2;
    let same = true;
    for (let i = 0; i < half; i += 1) {
      if (bytes[i] !== bytes[i + half]) {
        same = false;
        break;
      }
    }
    if (same) errors.push('Entropy shows simple half-repeat pattern');
  }

  // Detect short repeating cycles up to maxCycleLength
  if (detectShortCycles) {
    const n = bytes.length;
    for (
      let period = 1;
      period <= Math.min(maxCycleLength, Math.floor(n / 2));
      period += 1
    ) {
      let repeats = true;
      for (let i = period; i < n; i += 1) {
        if (bytes[i] !== bytes[i % period]) {
          repeats = false;
          break;
        }
      }
      if (repeats) {
        errors.push(`Entropy repeats a short pattern (period=${period})`);
        break;
      }
    }
  }

  // Detect strictly monotonic +1 or -1 modulo 256
  if (detectMonotonic && bytes.length >= 3) {
    const d1 = (bytes[1] - bytes[0] + 256) % 256;
    let allSameStep = d1 === 1 || d1 === 255; // 255 == -1 mod 256
    if (allSameStep) {
      for (let i = 2; i < bytes.length; i += 1) {
        const di = (bytes[i] - bytes[i - 1] + 256) % 256;
        if (di !== d1) {
          allSameStep = false;
          break;
        }
      }
      if (allSameStep) {
        errors.push('Entropy is strictly sequential (ascending/descending)');
      }
    }
  }

  // Unique byte count threshold based on length (guard against trivial patterns)
  const defaultMinUnique: Record<number, number> = {
    16: 8,
    20: 10,
    24: 12,
    28: 14,
    32: 16,
  };
  const minUnique =
    options.minUniqueBytes ??
    defaultMinUnique[bytes.length] ??
    Math.max(8, Math.floor(bytes.length / 2));
  const unique = new Set<number>();
  for (let i = 0; i < bytes.length; i += 1) unique.add(bytes[i]);
  if (unique.size < minUnique) {
    errors.push('Entropy shows low byte diversity');
  }

  return {
    isValid: errors.length === 0,
    bitLength,
    errors,
  };
}
