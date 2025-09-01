export interface LTCUTXO {
  txid: string;
  vout: number;
  value: number;
  status: {
    confirmed: boolean;
    block_height?: number;
  };
}

export interface LTCTransactionOutput {
  address: string;
  value: number;
}

export interface LTCUnsignedTransaction {
  psbt: string; // Base64 encoded PSBT
  estimatedFee: number;
  changeAmount: number;
  utxosUsed: LTCUTXO[];
  transactionSize: number;
  feeRate: string;
  totalInputs: number;
  totalOutputs: number;
  totalInputValue: number;
  totalOutputValue: number;
  network: 'mainnet' | 'testnet';
  timestamp: number;
}

export interface LTCTransactionRequest {
  fromAddress: string;
  toAddress: string;
  amountSatoshis: number;
  feeRate?: 'slow' | 'normal' | 'fast' | 'priority';
  network?: 'mainnet' | 'testnet';
}

export interface LTCFeeEstimate {
  slow: number;
  normal: number;
  fast: number;
  priority: number;
  timestamp: number;
}

export interface LTCFeeCalculation {
  feeRate: string;
  satPerByte: number;
  inputCount: number;
  outputCount: number;
  estimatedSize: number;
  feeSatoshis: number;
  feeLTC: number;
  breakdown: {
    inputs: number;
    outputs: number;
    overhead: number;
  };
}

export interface LTCUTXOSelectionResult {
  selectedUTXOs: LTCUTXO[];
  totalValue: number;
  inputCount: number;
  changeAmount: number;
  feeSatoshis: number;
}

export interface LTCUTXOBalance {
  totalBalance: number;
  confirmedUTXOs: LTCUTXO[];
  unconfirmedUTXOs: LTCUTXO[];
}

export interface LTCPSBTResult {
  psbt: string; // Base64 encoded PSBT
  transactionSize: number;
  inputCount: number;
  outputCount: number;
  totalInputValue: number;
  totalOutputValue: number;
  feeSatoshis: number;
  changeAmount: number;
}

export interface LTCPSBTInfo {
  inputs: number;
  outputs: number;
  network: 'mainnet' | 'testnet';
  rawPSBT: string;
}

export interface LTCSignature {
  inputIndex: number;
  publicKey: string;
  signature: string;
}

export interface LTCTransactionError extends Error {
  code: string;
}

export type LTCNetwork = 'mainnet' | 'testnet';
