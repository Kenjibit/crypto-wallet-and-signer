export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i];
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

export function hexToBytes(hexString: string): Uint8Array {
  const normalized = hexString.trim().toLowerCase().replace(/^0x/, '');
  if (normalized.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const out = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    out[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
  }
  return out;
}
