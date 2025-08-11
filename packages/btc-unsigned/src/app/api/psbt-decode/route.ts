import { NextRequest, NextResponse } from 'next/server';
import {
  decodePSBT,
  validatePSBT,
  generatePSBTReport,
} from '../../../lib/psbt-decoder-simple';
import * as bitcoin from 'bitcoinjs-lib';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { psbtBase64, expectedValues, network = 'testnet' } = body;

    if (!psbtBase64) {
      return NextResponse.json(
        { error: 'PSBT data is required' },
        { status: 400 }
      );
    }

    // Validate expected values
    if (
      !expectedValues ||
      !expectedValues.recipientAmount ||
      !expectedValues.feeRate
    ) {
      return NextResponse.json(
        { error: 'Expected values (recipientAmount and feeRate) are required' },
        { status: 400 }
      );
    }

    // Convert network string to bitcoin network
    const bitcoinNetwork =
      network === 'mainnet'
        ? bitcoin.networks.bitcoin
        : bitcoin.networks.testnet;

    // Decode PSBT
    const decoded = decodePSBT(psbtBase64, bitcoinNetwork, {
      recipientAmount: expectedValues.recipientAmount,
      feeRate: expectedValues.feeRate,
    });

    // Validate PSBT
    const validation = validatePSBT(psbtBase64, {
      recipientAmount: expectedValues.recipientAmount,
      feeRate: expectedValues.feeRate,
      network: bitcoinNetwork,
    });

    // Generate report
    const report = generatePSBTReport(psbtBase64, {
      recipientAmount: expectedValues.recipientAmount,
      feeRate: expectedValues.feeRate,
      network: bitcoinNetwork,
    });

    return NextResponse.json({
      success: true,
      decoded,
      validation,
      report,
    });
  } catch (error) {
    console.error('PSBT Decode Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to decode PSBT',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'PSBT Decoder API',
    usage: {
      method: 'POST',
      body: {
        psbtBase64: 'string (required) - Base64 encoded PSBT',
        expectedValues: {
          recipientAmount:
            'number (required) - Expected recipient amount in satoshis',
          feeRate: 'number (required) - Expected fee rate in sat/byte',
        },
        network:
          'string (optional) - "testnet" or "mainnet" (default: "testnet")',
      },
    },
    example: {
      psbtBase64:
        'cHNidP8BAJoCAAAAAvH6SBuZU/9irZdqsZEBO8A7dDbP/IthPvShG1vPlth5AQAAAAD/////1oeAg4+AWOYZcPWsblMuQAOKqnDGArGp/wwdFzcjnWgBAAAAAP////8C0AcAAAAAAAAWABQHAu/JE8L8DHYV5YKMFEoOf7HeElACAAAAAAAAFgAUjE7PGGy8fogQjpmzZcPb/JtNt3gAAAAAAAEBH3gFAAAAAAAAFgAUjE7PGGy8fogQjpmzZcPb/JtNt3gAAQEfeAUAAAAAAAAWABSMTs8YbLx+iBCOmbNlw9v8m023eAAAAA==',
      expectedValues: {
        recipientAmount: 2000,
        feeRate: 1,
      },
      network: 'testnet',
    },
  });
}
