let nodeCreateCipheriv: any = null;
let nodeCreateDecipheriv: any = null;
let nodeWebcryptoSubtle: SubtleCrypto | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeCrypto = require('crypto');
  nodeCreateCipheriv = nodeCrypto.createCipheriv;
  nodeCreateDecipheriv = nodeCrypto.createDecipheriv;
  nodeWebcryptoSubtle = nodeCrypto.webcrypto?.subtle ?? null;
} catch {
  // browser env
}

function getSubtle(): SubtleCrypto | null {
  const g: any = globalThis as any;
  if (g && g.crypto && g.crypto.subtle) return g.crypto.subtle as SubtleCrypto;
  if (nodeWebcryptoSubtle) return nodeWebcryptoSubtle;
  return null;
}

export async function importAesGcmKey(
  rawKey: Uint8Array
): Promise<CryptoKey | null> {
  const subtle = getSubtle();
  if (!subtle) return null;
  return subtle.importKey('raw', rawKey, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptAesGcm(
  keyBytes: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array,
  additionalData?: Uint8Array
): Promise<Uint8Array> {
  const subtle = getSubtle();
  if (subtle) {
    const key = await importAesGcmKey(keyBytes);
    if (!key) throw new Error('Failed to import AES key');
    const buffer = await subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData },
      key,
      plaintext
    );
    return new Uint8Array(buffer);
  }
  // Node.js fallback via crypto streams
  if (!nodeCreateCipheriv) throw new Error('AES-GCM not available');
  const cipher = nodeCreateCipheriv(
    'aes-256-gcm',
    Buffer.from(keyBytes),
    Buffer.from(iv)
  );
  if (additionalData) cipher.setAAD(Buffer.from(additionalData));
  const ct = Buffer.concat([
    cipher.update(Buffer.from(plaintext)),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return new Uint8Array(Buffer.concat([ct, tag]));
}

export async function decryptAesGcm(
  keyBytes: Uint8Array,
  iv: Uint8Array,
  ciphertextAndTag: Uint8Array,
  additionalData?: Uint8Array
): Promise<Uint8Array> {
  const subtle = getSubtle();
  if (subtle) {
    const key = await importAesGcmKey(keyBytes);
    if (!key) throw new Error('Failed to import AES key');
    const buffer = await subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData },
      key,
      ciphertextAndTag
    );
    return new Uint8Array(buffer);
  }
  // Node.js fallback via crypto streams
  if (ciphertextAndTag.length < 16) throw new Error('Ciphertext too short');
  const tag = ciphertextAndTag.slice(ciphertextAndTag.length - 16);
  const ct = ciphertextAndTag.slice(0, ciphertextAndTag.length - 16);
  if (!nodeCreateDecipheriv) throw new Error('AES-GCM not available');
  const decipher = nodeCreateDecipheriv(
    'aes-256-gcm',
    Buffer.from(keyBytes),
    Buffer.from(iv)
  );
  if (additionalData) decipher.setAAD(Buffer.from(additionalData));
  decipher.setAuthTag(Buffer.from(tag));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(ct)),
    decipher.final(),
  ]);
  return new Uint8Array(pt);
}
