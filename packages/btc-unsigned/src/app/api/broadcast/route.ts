import { NextRequest, NextResponse } from 'next/server';
import { combineAndBroadcast, SignatureData } from '../../../lib/broadcast';

export async function POST(request: NextRequest) {
  try {
    const { psbt, signatures } = await request.json();

    if (!psbt) {
      return NextResponse.json({
        success: false,
        message: 'No PSBT provided',
      });
    }

    if (!signatures || !Array.isArray(signatures) || signatures.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No signatures provided',
      });
    }

    console.log('🔗 Broadcast API request received');
    console.log('PSBT length:', psbt.length);
    console.log('Signatures count:', signatures.length);

    // Validate signature format
    const validSignatures: SignatureData[] = [];
    for (const sig of signatures) {
      if (
        typeof sig.inputIndex === 'number' &&
        typeof sig.publicKey === 'string' &&
        typeof sig.signature === 'string'
      ) {
        validSignatures.push(sig);
      } else {
        console.warn('Invalid signature format:', sig);
      }
    }

    if (validSignatures.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No valid signatures provided',
      });
    }

    // Combine and broadcast
    const result = await combineAndBroadcast(psbt, validSignatures);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Broadcast API error:', error);
    return NextResponse.json({
      success: false,
      message: `Broadcast error: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    });
  }
}
