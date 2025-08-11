# Working Bitcoin Transaction Signer

## 🎯 Overview

This project demonstrates how to successfully sign and broadcast Bitcoin testnet transactions using Node.js and the bitcoinjs-lib library. The solution handles native SegWit (P2WPKH) transactions with proper signature formatting.

## ✅ Success Story

**Transaction Hash**: `689d2337171d0cffa9b102c670aa8a03402e536eacf57019e658808f838087d6`

- **From**: `tb1q338v7xrvh3lgsyywnxekts7mljd5mdmctx9u7l`
- **To**: `tb1qsk0etmzwq4z0tm8s95kmj8d2typ0lrykt53qp0`
- **Amount**: 8,000 satoshis
- **Status**: ✅ Successfully broadcast and confirmed

## 📋 Prerequisites

### Dependencies

```bash
npm install bitcoinjs-lib ecpair tiny-secp256k1 axios
```

### Required Information

- **Private Key**: WIF format (starts with 'c' for testnet)
- **From Address**: The address you want to spend from
- **To Address**: The address you want to send to
- **Amount**: Transaction amount in satoshis
- **Fee**: Transaction fee in satoshis

## 🔧 Working Solution

### Core Components

#### 1. Library Setup

```javascript
const bitcoin = require('bitcoinjs-lib');
const { ECPairFactory } = require('ecpair');
const axios = require('axios');

// Testnet network configuration
const network = bitcoin.networks.testnet;

// Create ECPair factory with tiny-secp256k1
const ECPair = ECPairFactory(require('tiny-secp256k1'));
```

#### 2. Transaction Configuration

```javascript
// Wallet configuration
const fromAddress = 'tb1q338v7xrvh3lgsyywnxekts7mljd5mdmctx9u7l';
const toAddress = 'tb1qsk0etmzwq4z0tm8s95kmj8d2typ0lrykt53qp0';
const amountSatoshis = 8000;
const feeSatoshis = 1000;

// Private key in WIF format
const privateKeyWIF = 'cQ8pwwpeeTPECzddjU2H8hWVH7MaABMJ64EunL3nrUy5mEBaYxqQ';
```

#### 3. PSBT Transaction Creation

```javascript
// Create PSBT (Partially Signed Bitcoin Transaction)
const psbt = new bitcoin.Psbt({ network });

// Add input with witness UTXO
psbt.addInput({
  hash: selectedUtxo.txid,
  index: selectedUtxo.vout,
  witnessUtxo: {
    script: Buffer.from(output.scriptpubkey, 'hex'),
    value: selectedUtxo.value,
  },
});

// Add outputs
psbt.addOutput({
  address: toAddress,
  value: amountSatoshis,
});

// Add change output if needed
const changeAmount = selectedUtxo.value - amountSatoshis - feeSatoshis;
if (changeAmount > 546) {
  psbt.addOutput({
    address: fromAddress,
    value: changeAmount,
  });
}
```

#### 4. Custom Signer with Buffer Conversion

```javascript
// Create a custom signer that properly handles Buffer conversion
const customSigner = {
  publicKey: Buffer.from(keyPair.publicKey),
  sign: (hash) => {
    const signature = keyPair.sign(hash);
    return Buffer.from(signature);
  },
};

psbt.signInput(0, customSigner);
psbt.finalizeAllInputs();
const tx = psbt.extractTransaction();
```

## 🚀 Complete Working Script

```javascript
const bitcoin = require('bitcoinjs-lib');
const { ECPairFactory } = require('ecpair');
const axios = require('axios');

// Testnet network configuration
const network = bitcoin.networks.testnet;
const ECPair = ECPairFactory(require('tiny-secp256k1'));

// Configuration
const fromAddress = 'YOUR_FROM_ADDRESS';
const toAddress = 'YOUR_TO_ADDRESS';
const amountSatoshis = 8000;
const feeSatoshis = 1000;
const privateKeyWIF = 'YOUR_PRIVATE_KEY_WIF';

async function signAndBroadcastTransaction() {
  try {
    console.log('=== Bitcoin Testnet Transaction Signer ===');
    console.log(`From: ${fromAddress}`);
    console.log(`To: ${toAddress}`);
    console.log(`Amount: ${amountSatoshis} satoshis`);
    console.log(`Fee: ${feeSatoshis} satoshis`);

    // Import private key
    const keyPair = ECPair.fromWIF(privateKeyWIF, network);
    console.log('✅ Private key loaded');

    // Get UTXOs
    const utxoResponse = await axios.get(
      `https://blockstream.info/testnet/api/address/${fromAddress}/utxo`
    );
    const utxos = utxoResponse.data;

    if (utxos.length === 0) {
      console.log('❌ No UTXOs found!');
      return;
    }

    // Calculate available balance (only confirmed UTXOs)
    const confirmedUtxos = utxos.filter((utxo) => utxo.status.confirmed);
    const totalAvailable = confirmedUtxos.reduce(
      (sum, utxo) => sum + utxo.value,
      0
    );
    console.log(`Total available: ${totalAvailable} satoshis`);

    // Check balance
    const totalNeeded = amountSatoshis + feeSatoshis;
    if (totalAvailable < totalNeeded) {
      console.log(
        `❌ Insufficient balance! Need ${totalNeeded}, have ${totalAvailable}`
      );
      return;
    }

    // Select largest UTXO
    const selectedUtxo = confirmedUtxos.reduce((largest, utxo) =>
      utxo.value > largest.value ? utxo : largest
    );

    // Get transaction details
    const txResponse = await axios.get(
      `https://blockstream.info/testnet/api/tx/${selectedUtxo.txid}`
    );
    const output = txResponse.data.vout[selectedUtxo.vout];

    // Create PSBT
    const psbt = new bitcoin.Psbt({ network });
    psbt.addInput({
      hash: selectedUtxo.txid,
      index: selectedUtxo.vout,
      witnessUtxo: {
        script: Buffer.from(output.scriptpubkey, 'hex'),
        value: selectedUtxo.value,
      },
    });

    psbt.addOutput({
      address: toAddress,
      value: amountSatoshis,
    });

    // Add change output
    const changeAmount = selectedUtxo.value - amountSatoshis - feeSatoshis;
    if (changeAmount > 546) {
      psbt.addOutput({
        address: fromAddress,
        value: changeAmount,
      });
    }

    // Sign transaction
    const customSigner = {
      publicKey: Buffer.from(keyPair.publicKey),
      sign: (hash) => Buffer.from(keyPair.sign(hash)),
    };

    psbt.signInput(0, customSigner);
    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    const txHex = tx.toHex();

    // Broadcast transaction
    const broadcastResponse = await axios.post(
      'https://blockstream.info/testnet/api/tx',
      txHex,
      { headers: { 'Content-Type': 'text/plain' } }
    );

    if (broadcastResponse.status === 200) {
      const txHash = broadcastResponse.data;
      console.log('✅ Transaction sent successfully!');
      console.log(`Transaction Hash: ${txHash}`);
      console.log(`Explorer: https://blockstream.info/testnet/tx/${txHash}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

signAndBroadcastTransaction();
```

## 🔍 Key Lessons Learned

### ✅ What Works

1. **PSBT Approach**: Using Partially Signed Bitcoin Transactions
2. **Buffer Conversion**: Converting Uint8Array to Buffer for signatures
3. **Custom Signer**: Creating a signer that returns Buffer signatures
4. **Proper UTXO Selection**: Using confirmed UTXOs with sufficient balance
5. **Reasonable Transaction Amounts**: Staying within UTXO limits

### ❌ What Doesn't Work

1. **Manual Transaction Creation**: Prone to signature format errors
2. **Direct ECPair Usage**: Signature format incompatibility
3. **secp256k1 Library**: Compatibility issues with ecpair
4. **Small Transaction Amounts**: May hit dust limits
5. **Unconfirmed UTXOs**: Can cause transaction failures

### 🎯 Critical Success Factors

1. **Correct Private Key**: Must match the FROM address
2. **Buffer Format**: All signatures and public keys must be Buffer
3. **PSBT Framework**: Handles signature format automatically
4. **Confirmed UTXOs**: Only use confirmed transactions as inputs
5. **Sufficient Balance**: Ensure UTXO can cover amount + fee

## 📁 Project Structure

```
btc-unsigned-testnet/
├── .testPython/
│   ├── new_wallet_transaction.js          # Working solution
│   ├── transaction_debug_log.md           # Debug history
│   ├── SOLUTION_SUMMARY.md               # Problem analysis
│   └── working_solution_fixed.js         # Alternative approach
├── WORKING_BITCOIN_TRANSACTION_SIGNER.md # This documentation
└── package.json
```

## 🚀 Usage Instructions

1. **Install Dependencies**:

   ```bash
   npm install bitcoinjs-lib ecpair tiny-secp256k1 axios
   ```

2. **Configure Transaction**:

   - Update `fromAddress`, `toAddress`, `amountSatoshis`, `feeSatoshis`
   - Provide the correct `privateKeyWIF` for the FROM address

3. **Run Transaction**:
   ```bash
   node .testPython/new_wallet_transaction.js
   ```

## 🔗 Resources

- [bitcoinjs-lib Documentation](https://github.com/bitcoinjs/bitcoinjs-lib)
- [ECPair Documentation](https://github.com/bitcoinjs/ecpair)
- [Bitcoin Testnet Explorer](https://blockstream.info/testnet)
- [SegWit Transaction Format](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki)

## ✅ Verification

The working transaction can be verified at:
https://blockstream.info/testnet/tx/689d2337171d0cffa9b102c670aa8a03402e536eacf57019e658808f838087d6

This solution provides a robust foundation for Bitcoin transaction signing that can be adapted for different scenarios and requirements.
