import { SignatureData } from './broadcast';

/**
 * Generate PSBT QR code data
 * @param psbt - Base64 encoded PSBT
 * @returns QR code data string
 */
export function generatePSBTQR(psbt: string): string {
  // Simple format - just the PSBT string
  // This can be scanned by the signature app
  return psbt;
}

/**
 * Parse signature QR code data
 * @param qrData - QR code data string
 * @returns Parsed signature data
 */
export function parseSignatureQR(qrData: string): SignatureData[] {
  console.log('parseSignatureQR - Input qrData:', qrData);
  console.log('parseSignatureQR - Input length:', qrData.length);
  console.log('parseSignatureQR - Input type:', typeof qrData);

  try {
    // Try to parse as JSON first (most common format)
    console.log('parseSignatureQR - Attempting JSON parse...');
    const data = JSON.parse(qrData);
    console.log('parseSignatureQR - JSON parse successful:', data);

    // Check if it's an array of signatures
    if (Array.isArray(data)) {
      console.log(
        'parseSignatureQR - Detected array of signatures, count:',
        data.length
      );

      // Validate each signature in the array
      const validatedSignatures: SignatureData[] = [];

      for (let i = 0; i < data.length; i++) {
        const signature = data[i];
        console.log(`parseSignatureQR - Validating signature ${i}:`, signature);

        // Validate required fields
        if (!signature.publicKey || !signature.signature) {
          console.log(
            `parseSignatureQR - Signature ${i} missing required fields`
          );
          throw new Error(`Signature ${i} missing required fields`);
        }

        const validatedSignature: SignatureData = {
          inputIndex: signature.inputIndex || i,
          publicKey: signature.publicKey,
          signature: signature.signature,
          address: signature.address,
          timestamp: signature.timestamp,
        };

        validatedSignatures.push(validatedSignature);
      }

      console.log(
        'parseSignatureQR - Returning array of signatures:',
        validatedSignatures
      );
      return validatedSignatures;
    }

    // Handle single signature object (backward compatibility)
    console.log('parseSignatureQR - Detected single signature object');

    // Validate required fields
    console.log('parseSignatureQR - Checking required fields...');
    console.log('parseSignatureQR - publicKey exists:', !!data.publicKey);
    console.log('parseSignatureQR - signature exists:', !!data.signature);

    if (!data.publicKey || !data.signature) {
      console.log('parseSignatureQR - Missing required fields');
      throw new Error('Missing required signature fields');
    }

    const result = {
      inputIndex: data.inputIndex || 0,
      publicKey: data.publicKey,
      signature: data.signature,
      address: data.address,
      timestamp: data.timestamp,
    };

    console.log('parseSignatureQR - Returning single signature:', result);
    return [result];
  } catch (error) {
    // If JSON parsing fails, try other formats
    console.warn(
      'Failed to parse signature QR as JSON, trying alternative formats'
    );
    console.log('parseSignatureQR - JSON parse error:', error);

    // You can add alternative parsing formats here
    // For example, if your signature app uses a different format

    throw new Error('Invalid signature QR code format');
  }
}

/**
 * Validate signature data
 * @param signature - Signature data to validate
 * @returns True if valid
 */
export function validateSignatureData(signature: SignatureData): boolean {
  // Check required fields
  if (typeof signature.inputIndex !== 'number' || signature.inputIndex < 0) {
    return false;
  }

  if (
    typeof signature.publicKey !== 'string' ||
    signature.publicKey.length === 0
  ) {
    return false;
  }

  if (
    typeof signature.signature !== 'string' ||
    signature.signature.length === 0
  ) {
    return false;
  }

  // Validate hex format
  const hexRegex = /^[0-9a-fA-F]+$/;
  if (
    !hexRegex.test(signature.publicKey) ||
    !hexRegex.test(signature.signature)
  ) {
    return false;
  }

  return true;
}

/**
 * Create a signature QR code data string
 * @param signature - Signature data
 * @returns QR code data string
 */
export function createSignatureQRData(signature: SignatureData): string {
  // Validate signature data
  if (!validateSignatureData(signature)) {
    throw new Error('Invalid signature data');
  }

  // Create JSON string for QR code
  return JSON.stringify({
    inputIndex: signature.inputIndex,
    publicKey: signature.publicKey,
    signature: signature.signature,
    address: signature.address,
    timestamp: signature.timestamp || new Date().toISOString(),
  });
}
