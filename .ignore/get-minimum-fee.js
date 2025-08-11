const axios = require('axios');

/**
 * Script to fetch minimum relay fee from Bitcoin testnet nodes
 * This helps determine the minimum fee required for transaction acceptance
 */

// Bitcoin testnet RPC endpoints (public nodes)
const TESTNET_NODES = [
  'https://blockstream.info/testnet/api',
  'https://testnet.aranguren.org/bitcoin-testnet/api',
  'https://testnet-api.bitmatrix.com/api',
];

/**
 * Get minimum relay fee from a Bitcoin testnet node
 */
async function getMinimumRelayFee(nodeUrl) {
  try {
    console.log(`\n🔍 Checking node: ${nodeUrl}`);

    // Method 1: Try to get mempool info (includes minrelaytxfee)
    const mempoolResponse = await axios.get(`${nodeUrl}/mempool`);
    console.log('✅ Mempool info available');

    if (mempoolResponse.data && mempoolResponse.data.minrelaytxfee) {
      const minFee = mempoolResponse.data.minrelaytxfee;
      console.log(`📊 Minimum relay fee: ${minFee} BTC/kB`);
      return minFee;
    }

    // Method 2: Try to get network info
    const networkResponse = await axios.get(`${nodeUrl}/network`);
    console.log('✅ Network info available');

    if (networkResponse.data && networkResponse.data.minrelaytxfee) {
      const minFee = networkResponse.data.minrelaytxfee;
      console.log(`📊 Minimum relay fee: ${minFee} BTC/kB`);
      return minFee;
    }

    console.log('❌ No minimum relay fee found in response');
    return null;
  } catch (error) {
    console.log(`❌ Error with ${nodeUrl}: ${error.message}`);
    return null;
  }
}

/**
 * Get current fee estimates and minimum relay fee
 */
async function getCurrentFeeInfo() {
  console.log('🚀 Fetching current Bitcoin testnet fee information...\n');

  // Get fee estimates from blockstream
  try {
    console.log('📡 Fetching fee estimates from Blockstream...');
    const feeResponse = await axios.get(
      'https://blockstream.info/testnet/api/fee-estimates'
    );
    console.log('✅ Fee estimates:', feeResponse.data);
  } catch (error) {
    console.log('❌ Could not fetch fee estimates:', error.message);
  }

  // Try to get minimum relay fee from different nodes
  const minFees = [];

  for (const nodeUrl of TESTNET_NODES) {
    const minFee = await getMinimumRelayFee(nodeUrl);
    if (minFee !== null) {
      minFees.push({ node: nodeUrl, minFee });
    }
  }

  // Calculate average minimum fee
  if (minFees.length > 0) {
    const avgMinFee =
      minFees.reduce((sum, item) => sum + item.minFee, 0) / minFees.length;
    console.log(`\n📊 Average minimum relay fee: ${avgMinFee} BTC/kB`);

    // Convert to sat/byte for easier comparison
    const satPerByte = Math.ceil((avgMinFee * 100000000) / 1000); // Convert BTC/kB to sat/byte
    console.log(`📊 Minimum fee rate: ${satPerByte} sat/byte`);

    return {
      minFees,
      averageMinFee: avgMinFee,
      minFeeRate: satPerByte,
    };
  } else {
    console.log('\n❌ Could not fetch minimum relay fee from any node');
    console.log('💡 Using conservative estimate: 1 sat/byte');
    return {
      minFees: [],
      averageMinFee: 0.00000001, // 1 sat/byte
      minFeeRate: 1,
    };
  }
}

/**
 * Test transaction fee against minimum requirement
 */
function testTransactionFee(txSize, txFee, minFeeRate) {
  console.log('\n🧪 Testing transaction fee...');
  console.log(`📏 Transaction size: ${txSize} bytes`);
  console.log(`💰 Transaction fee: ${txFee} satoshis`);
  console.log(`📊 Current fee rate: ${(txFee / txSize).toFixed(2)} sat/byte`);
  console.log(`📊 Minimum required: ${minFeeRate} sat/byte`);

  const currentFeeRate = txFee / txSize;
  const isSufficient = currentFeeRate >= minFeeRate;

  if (isSufficient) {
    console.log('✅ Fee is sufficient for network acceptance');
  } else {
    const neededFee = Math.ceil(txSize * minFeeRate);
    const additionalFee = neededFee - txFee;
    console.log('❌ Fee is too low for network acceptance');
    console.log(`💰 Additional fee needed: ${additionalFee} satoshis`);
    console.log(`💰 Total fee needed: ${neededFee} satoshis`);
  }

  return isSufficient;
}

// Main execution
async function main() {
  try {
    const feeInfo = await getCurrentFeeInfo();

    // Test with your transaction data
    console.log('\n' + '='.repeat(50));
    console.log('🧪 TESTING YOUR TRANSACTION');
    console.log('='.repeat(50));

    // Your transaction data
    const txSize = 324; // bytes (from your transaction)
    const txFee = 307; // satoshis (from your transaction)
    const minFeeRate = feeInfo.minFeeRate;

    testTransactionFee(txSize, txFee, minFeeRate);

    console.log('\n' + '='.repeat(50));
    console.log('📋 RECOMMENDATIONS');
    console.log('='.repeat(50));
    console.log('1. Use fee rate of at least 1.5 sat/byte for testnet');
    console.log('2. For mainnet, use current network fee estimates');
    console.log('3. Always check minimum relay fee before broadcasting');
    console.log(
      '4. Consider using dynamic fee calculation based on network conditions'
    );
  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  getCurrentFeeInfo,
  testTransactionFee,
};
