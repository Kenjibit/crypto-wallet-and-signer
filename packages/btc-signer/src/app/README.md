# PSBT Signature Collector

This page allows you to collect signatures for PSBTs (Partially Signed Bitcoin Transactions) by scanning QR codes from signing devices.

## Features

- **PSBT Input**: Paste or scan PSBT QR codes
- **Signature Collection**: Scan signature QR codes from hardware wallets or signing devices
- **Duplicate Prevention**: Automatically prevents duplicate signatures
- **Export Functionality**: Copy PSBT and signatures to clipboard
- **Demo Mode**: Load sample data to see how the tool works

## How to Use

### 1. Input PSBT

- Paste a PSBT string directly into the text area, or
- Click "Scan PSBT QR Code" to scan a PSBT from a QR code

### 2. Collect Signatures

- Click "Start Scanning Signatures" to open the QR scanner
- Scan signature QR codes from your signing devices
- Each signature will be added to the collection
- Remove individual signatures if needed

### 3. Export Data

- Copy the PSBT to clipboard
- Export all collected signatures as JSON
- Clear all data when finished

## QR Code Formats

### PSBT QR Codes

- Must start with 'cHNidP' (base64 encoded PSBT)
- Can be scanned from transaction creation tools

### Signature QR Codes

- Must be valid JSON format
- Should contain: `inputIndex`, `publicKey`, `signature`
- Optional: `address`, `timestamp`

## Example Signature Format

```json
[
  {
    "inputIndex": 0,
    "publicKey": "02a1b2c3d4e5f678901234567890123456789012345678901234567890123456",
    "signature": "3045022100a1b2c3d4e5f678901234567890123456789012345678901234567890123456789002200a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
    "address": "tb1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
  }
]
```

## Technical Details

- Built with Next.js and React
- Uses the same design system as the main transaction creator
- QR scanning powered by jsQR library
- All processing happens in the browser
- No data is sent to external servers

## Navigation

Use the navigation bar to switch between:

- **Create Transaction**: Main page for creating unsigned transactions
- **Collect Signatures**: This page for collecting signatures
