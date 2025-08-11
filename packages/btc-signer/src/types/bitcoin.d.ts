export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  status: {
    confirmed: boolean;
    block_height?: number;
  };
}

export interface TransactionOutput {
  address: string;
  value: number;
}

export interface UnsignedTransaction {
  psbt: string; // Base64 encoded PSBT
  estimatedFee: number;
  changeAmount: number;
  utxosUsed: UTXO[];
  transactionSize: number;
  feeRate: string;
  totalInputs: number;
  totalOutputs: number;
  totalInputValue: number;
  totalOutputValue: number;
  network: string;
  timestamp: number;
}

export interface TransactionRequest {
  fromAddress: string;
  toAddress: string;
  amountSatoshis: number;
  feeRate?: 'slow' | 'normal' | 'fast' | 'priority';
  network?: 'testnet' | 'mainnet';
}

export interface FeeEstimate {
  slow: number;
  normal: number;
  fast: number;
  priority: number;
  timestamp: number;
}

export interface FeeCalculation {
  feeRate: string;
  satPerByte: number;
  inputCount: number;
  outputCount: number;
  estimatedSize: number;
  feeSatoshis: number;
  feeBTC: number;
  breakdown: {
    inputs: number;
    outputs: number;
    overhead: number;
  };
}

export interface UTXOSelectionResult {
  selectedUTXOs: UTXO[];
  totalValue: number;
  inputCount: number;
  changeAmount: number;
  feeSatoshis: number;
}

export interface UTXOBalance {
  totalBalance: number;
  confirmedUTXOs: UTXO[];
  unconfirmedUTXOs: UTXO[];
}

export interface PSBTResult {
  psbt: string; // Base64 encoded PSBT
  transactionSize: number;
  inputCount: number;
  outputCount: number;
  totalInputValue: number;
  totalOutputValue: number;
  feeSatoshis: number;
  changeAmount: number;
}

export interface TransactionError extends Error {
  code: string;
}
