import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    console.log('Server: Fetching current fee rates from mempool.space...');
    console.log(
      'Server: URL being called: https://mempool.space/testnet/api/v1/fees/recommended'
    );

    // Try mempool.space first (primary source)
    try {
      const mempoolResponse = await axios.get(
        `https://mempool.space/testnet/api/v1/fees/recommended?t=${Date.now()}`,
        {
          timeout: 5000, // 5 second timeout
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Bitcoin-Testnet-App/1.0',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );

      console.log(
        'Server: Mempool.space response status:',
        mempoolResponse.status
      );
      console.log('Server: Mempool.space response data:', mempoolResponse.data);

      if (mempoolResponse.status === 200 && mempoolResponse.data) {
        // Check if all values are 1 (testnet is quiet)
        const allOnes =
          mempoolResponse.data.fastestFee === 1 &&
          mempoolResponse.data.halfHourFee === 1 &&
          mempoolResponse.data.hourFee === 1 &&
          mempoolResponse.data.economyFee === 1;

        if (allOnes) {
          console.log(
            'Server: Testnet appears quiet, using realistic testnet values'
          );
          // Use realistic testnet values instead of throwing error
          const testnetRates = {
            slow: 1,
            normal: 2,
            fast: 4,
            priority: 8,
            timestamp: Date.now(),
          };
          return NextResponse.json(testnetRates);
        }

        // Convert to FeeEstimate format using the real API values
        const feeEstimate = {
          slow: Number(mempoolResponse.data.economyFee) || 2,
          normal: Number(mempoolResponse.data.hourFee) || 564,
          fast: Number(mempoolResponse.data.halfHourFee) || 614,
          priority: Number(mempoolResponse.data.fastestFee) || 670,
          timestamp: Date.now(),
        };

        console.log(
          'Server: Final parsed fee rates from mempool.space:',
          feeEstimate
        );
        return NextResponse.json(feeEstimate);
      }
    } catch (mempoolError) {
      console.log('Server: Mempool.space failed, trying blockstream...');
      console.log('Server: Mempool error:', mempoolError);
    }

    // Fallback to blockstream
    console.log('Server: Fetching fee rates from blockstream...');
    console.log(
      'Server: URL being called: https://blockstream.info/testnet/api/fee-estimates'
    );

    const blockstreamResponse = await axios.get(
      `https://blockstream.info/testnet/api/fee-estimates?t=${Date.now()}`,
      {
        timeout: 5000, // 5 second timeout
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Bitcoin-Testnet-App/1.0',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );

    console.log(
      'Server: Blockstream response status:',
      blockstreamResponse.status
    );
    console.log('Server: Blockstream response data:', blockstreamResponse.data);

    if (blockstreamResponse.status === 200 && blockstreamResponse.data) {
      // Blockstream uses different format: {"144":54.019,"504":54.019,"1008":54.019}
      // Convert to our format
      const blockstreamData = blockstreamResponse.data;

      // Map blockstream format to our format
      // 144 blocks = ~1 day (economy)
      // 504 blocks = ~3.5 days (normal)
      // 1008 blocks = ~1 week (slow)
      const feeEstimate = {
        slow: Number(blockstreamData['1008']) || 2,
        normal: Number(blockstreamData['504']) || 564,
        fast: Number(blockstreamData['144']) || 614,
        priority: Number(blockstreamData['144']) || 670, // Use fastest available
        timestamp: Date.now(),
      };

      console.log(
        'Server: Final parsed fee rates from blockstream:',
        feeEstimate
      );
      return NextResponse.json(feeEstimate);
    }

    throw new Error('Both APIs failed');
  } catch (error) {
    console.log(
      'Server: ⚠️  Could not fetch current fee rates from either API, using defaults'
    );
    console.log('Server: Error details:', error);
    console.log(
      'Server: Error message:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    console.log(
      'Server: Error response:',
      (error as { response?: { data?: unknown } })?.response?.data
    );

    // Fallback values - more realistic for testnet
    const fallbackRates = {
      slow: 1,
      normal: 2,
      fast: 4,
      priority: 8,
      timestamp: Date.now(),
    };

    return NextResponse.json(fallbackRates);
  }
}
