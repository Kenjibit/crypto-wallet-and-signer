import { describe, it, expect } from 'vitest';
import {
  validateEntropy,
  isAllZero,
  isAllOnes,
  generateEntropy,
  mixEntropyParts,
  sha256Bytes,
} from '../crypto/entropy';

describe('entropy', () => {
  // generation removed: only validation helpers remain

  it('rejects all zero and all ones', () => {
    const z = new Uint8Array(32);
    expect(isAllZero(z)).toBe(true);
    expect(validateEntropy(z).isValid).toBe(false);

    const o = new Uint8Array(32).fill(0xff);
    expect(isAllOnes(o)).toBe(true);
    expect(validateEntropy(o).isValid).toBe(false);
  });

  // Shannon estimation removed per requirements
  it('mixEntropyParts yields 32 bytes and changes if any part changes', async () => {
    const a1 = new Uint8Array(32).fill(0xaa);
    const b1 = new Uint8Array(32).fill(0xbb);
    const out1 = await mixEntropyParts([a1, b1]);
    expect(out1.length).toBe(32);

    const a2 = new Uint8Array(32).fill(0xac);
    const out2 = await mixEntropyParts([a2, b1]);
    expect(Buffer.compare(Buffer.from(out1), Buffer.from(out2)) !== 0).toBe(
      true
    );
  });

  it('output remains secure if at least one source is high-entropy', async () => {
    const weak = new Uint8Array(32); // zeros
    const strong = generateEntropy(256);
    const out = await mixEntropyParts([weak, strong]);
    // should pass our structural validation checks
    expect(validateEntropy(out, { allowedBits: [256] }).isValid).toBe(true);
  });

  it('detects trivial structured outputs with validation', async () => {
    const half = new Uint8Array(16).fill(0x11);
    const bad = new Uint8Array(32);
    bad.set(half, 0);
    bad.set(half, 16);
    const res = validateEntropy(bad, { allowedBits: [256] });
    expect(res.isValid).toBe(false);
    expect(res.errors.join(' ')).toMatch(/half-repeat|pattern/i);
  });

  it('avalanche: flipping a single bit in input changes ~half the output bits (heuristic)', async () => {
    const src = generateEntropy(256);
    const out1 = await sha256Bytes(src);
    const flipped = new Uint8Array(src);
    flipped[0] ^= 1; // flip one bit
    const out2 = await sha256Bytes(flipped);

    let diffBits = 0;
    for (let i = 0; i < out1.length; i += 1) {
      const x = out1[i] ^ out2[i];
      diffBits += x.toString(2).split('1').length - 1;
    }
    // Expect roughly around 128 +/- 40 for 256-bit hash; keep a broad band to avoid flaky
    expect(diffBits).toBeGreaterThan(80);
    expect(diffBits).toBeLessThan(176);
  });

  it('bit balance heuristic: generated entropy has reasonable 1/0 distribution', () => {
    const e = generateEntropy(256);
    let ones = 0;
    for (const b of e) ones += b.toString(2).split('1').length - 1;
    // Expect around 128 +/- 64 to avoid flakiness
    expect(ones).toBeGreaterThan(64);
    expect(ones).toBeLessThan(192);
  });
});
