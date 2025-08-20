/*
Utility helpers for working with binary data and encoding.
*/

export function utf8Encode(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

export function utf8Decode(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return new TextDecoder().decode(view);
}

export function concatBytes(parts: Array<Uint8Array>): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function numberToUint16BE(value: number): Uint8Array {
  const buf = new Uint8Array(2);
  buf[0] = (value >>> 8) & 0xff;
  buf[1] = value & 0xff;
  return buf;
}

export function uint16BEToNumber(bytes: Uint8Array): number {
  if (bytes.length < 2) throw new Error('uint16 requires at least 2 bytes');
  return (bytes[0] << 8) | bytes[1];
}

export function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  const g: any = globalThis as any;
  if (g && g.crypto && typeof g.crypto.getRandomValues === 'function') {
    g.crypto.getRandomValues(out);
    return out;
  }
  try {
    // Dynamic import to avoid bundling node:crypto in browsers
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { webcrypto, randomFillSync } = require('crypto');
    if (webcrypto && typeof webcrypto.getRandomValues === 'function') {
      webcrypto.getRandomValues(out);
      return out;
    }
    randomFillSync(out);
    return out;
  } catch {
    throw new Error('No cryptographic RNG available');
  }
}

export function toBase64(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const g: any = globalThis as any;
  if (g && g.btoa) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1)
      binary += String.fromCharCode(bytes[i]);
    return g.btoa(binary);
  }
  // Node.js
  return Buffer.from(bytes).toString('base64');
}

export function fromBase64(b64: string): Uint8Array {
  const g: any = globalThis as any;
  if (g && g.atob) {
    const binary = g.atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  }
  // Node.js
  return new Uint8Array(Buffer.from(b64, 'base64'));
}
