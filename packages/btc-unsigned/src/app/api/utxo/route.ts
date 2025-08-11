import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json(
      { error: 'Address parameter is required' },
      { status: 400 }
    );
  }

  const apis = [
    `https://blockstream.info/testnet/api/address/${address}/utxo`,
    `https://mempool.space/testnet/api/address/${address}/utxo`,
  ];

  for (const apiUrl of apis) {
    try {
      console.log(`Trying API: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Bitcoin-UTXO-Fetcher/1.0)',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Success from ${apiUrl}:`, data.length, 'UTXOs');

        return NextResponse.json(data);
      } else {
        console.log(`API ${apiUrl} returned status:`, response.status);
      }
    } catch (error) {
      console.error(`Error fetching from ${apiUrl}:`, error);
    }
  }

  return NextResponse.json(
    { error: 'Failed to fetch UTXOs from all APIs' },
    { status: 500 }
  );
}
