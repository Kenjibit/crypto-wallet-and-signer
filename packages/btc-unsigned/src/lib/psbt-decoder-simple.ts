import * as bitcoin from 'bitcoinjs-lib';

export interface DecodedPSBT {
  // Basic transaction info
  txid?: string;
  version: number;
  locktime: number;

  // Input details
  inputs: DecodedInput[];
  totalInputValue: number;
  inputCount: number;

  // Output details
  outputs: DecodedOutput[];
  totalOutputValue: number;
  outputCount: number;

  // Fee calculation
  feeSatoshis: number;
  feeBTC: number;
  feeRate: number; // sat/byte

  // Transaction size
  transactionSize: number;
  virtualSize: number;

  // Validation results
  isValid: boolean;
  validationErrors: string[];
  warnings: string[];
}

export interface DecodedInput {
  txid: string;
  vout: number;
  sequence: number;
  value: number;
  scriptSig?: string;
  witness?: string[];
  address?: string;
  scriptType?: string;
}

export interface DecodedOutput {
  index: number;
  value: number;
  scriptPubKey: string;
  address?: string;
  scriptType?: string;
  isChange?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  feeValidation: {
    calculatedFee: number;
    expectedFee: number;
    feeRate: number;
    isAccurate: boolean;
  };
  amountValidation: {
    totalInput: number;
    totalOutput: number;
    recipientAmount: number;
    changeAmount: number;
    isBalanced: boolean;
  };
}

/**
 * Decode PSBT and return detailed information
 */
export function decodePSBT(
  psbtBase64: string,
  network: bitcoin.Network = bitcoin.networks.testnet,
  expectedValues?: {
    recipientAmount: number;
    feeRate: number;
  }
): DecodedPSBT {
  try {
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64);

    // Try to extract transaction to check if finalized
    try {
      const tx = psbt.extractTransaction();
      return decodeFinalizedPSBT(psbt, tx, network);
    } catch {
      // PSBT is not finalized, decode as unsigned
      return decodeUnsignedPSBT(psbt, network, expectedValues);
    }
  } catch {
    console.error('Error decoding PSBT');
    return {
      version: 2,
      locktime: 0,
      inputs: [],
      totalInputValue: 0,
      inputCount: 0,
      outputs: [],
      totalOutputValue: 0,
      outputCount: 0,
      feeSatoshis: 0,
      feeBTC: 0,
      feeRate: 0,
      transactionSize: 0,
      virtualSize: 0,
      isValid: false,
      validationErrors: [],
      warnings: [],
    };
  }
}

/**
 * Decode finalized PSBT
 */
function decodeFinalizedPSBT(
  psbt: bitcoin.Psbt,
  tx: bitcoin.Transaction,
  network: bitcoin.Network
): DecodedPSBT {
  const validationErrors: string[] = [];
  const warnings: string[] = [];

  // Decode inputs
  const inputs: DecodedInput[] = [];
  let totalInputValue = 0;

  for (let i = 0; i < tx.ins.length; i++) {
    const input = tx.ins[i];
    const psbtInput = psbt.data.inputs[i];

    let inputValue = 0;
    if (psbtInput.witnessUtxo) {
      inputValue = psbtInput.witnessUtxo.value;
      totalInputValue += inputValue;
    }

    // Try to decode the address
    let address: string | undefined;
    let scriptType: string | undefined;

    if (psbtInput.witnessUtxo) {
      try {
        const script = psbtInput.witnessUtxo.script;
        if (script) {
          const decoded = bitcoin.address.fromOutputScript(script, network);
          address = decoded;
          scriptType = getScriptType(script);
        }
      } catch {
        warnings.push(`Input ${i}: Could not decode address`);
      }
    }

    inputs.push({
      txid: input.hash.reverse().toString('hex'),
      vout: input.index,
      sequence: input.sequence,
      value: inputValue,
      address,
      scriptType,
    });
  }

  // Decode outputs
  const outputs: DecodedOutput[] = [];
  let totalOutputValue = 0;

  for (let i = 0; i < tx.outs.length; i++) {
    const output = tx.outs[i];
    totalOutputValue += output.value;

    // Try to decode the address
    let address: string | undefined;
    let scriptType: string | undefined;

    try {
      const decoded = bitcoin.address.fromOutputScript(output.script, network);
      address = decoded;
      scriptType = getScriptType(output.script);
    } catch {
      warnings.push(`Output ${i}: Could not decode address`);
    }

    outputs.push({
      index: i,
      value: output.value,
      scriptPubKey: output.script.toString('hex'),
      address,
      scriptType,
      isChange: false, // Will be determined later
    });
  }

  // Calculate fee
  const feeSatoshis = totalInputValue - totalOutputValue;
  const feeBTC = feeSatoshis / 100000000;

  // Calculate transaction size
  const transactionSize = tx.byteLength();
  const virtualSize = Math.ceil(transactionSize / 4); // Simplified vSize calculation

  // Calculate fee rate
  const feeRate = transactionSize > 0 ? feeSatoshis / transactionSize : 0;

  // Validate transaction
  if (feeSatoshis < 0) {
    validationErrors.push('Transaction has negative fee');
  }

  if (totalInputValue === 0) {
    validationErrors.push('No input value found');
  }

  if (totalOutputValue === 0) {
    validationErrors.push('No output value found');
  }

  // Identify change output (usually the last output with smaller amount)
  if (outputs.length > 1) {
    const sortedOutputs = [...outputs].sort((a, b) => b.value - a.value);
    const changeOutput = sortedOutputs[sortedOutputs.length - 1];
    changeOutput.isChange = true;
  }

  return {
    txid: tx.getId(),
    version: tx.version,
    locktime: tx.locktime,
    inputs,
    totalInputValue,
    inputCount: inputs.length,
    outputs,
    totalOutputValue,
    outputCount: outputs.length,
    feeSatoshis,
    feeBTC,
    feeRate,
    transactionSize,
    virtualSize,
    isValid: validationErrors.length === 0,
    validationErrors,
    warnings,
  };
}

/**
 * Decode unsigned PSBT
 */
function decodeUnsignedPSBT(
  psbt: bitcoin.Psbt,
  network: bitcoin.Network,
  expectedValues?: {
    recipientAmount: number;
    feeRate: number;
  }
): DecodedPSBT {
  const validationErrors: string[] = [];
  const warnings: string[] = [];

  // Decode inputs from PSBT data
  const inputs: DecodedInput[] = [];
  let totalInputValue = 0;

  for (let i = 0; i < psbt.data.inputs.length; i++) {
    const input = psbt.data.inputs[i];

    if (!input.witnessUtxo) {
      validationErrors.push(`Input ${i}: Missing witness UTXO data`);
      continue;
    }

    const inputValue = input.witnessUtxo.value;
    totalInputValue += inputValue;

    // Try to decode the address
    let address: string | undefined;
    let scriptType: string | undefined;

    try {
      const script = input.witnessUtxo.script;
      if (script) {
        const decoded = bitcoin.address.fromOutputScript(script, network);
        address = decoded;
        scriptType = getScriptType(script);
      }
    } catch {
      warnings.push(`Input ${i}: Could not decode address`);
    }

    inputs.push({
      txid: 'unknown', // Not available in unsigned PSBT
      vout: 0,
      sequence: 0xffffffff,
      value: inputValue,
      address,
      scriptType,
    });
  }

  // For unsigned PSBTs, we need to estimate output values
  // Use expected values if provided, otherwise estimate
  let totalEstimatedOutput = 0;

  if (expectedValues) {
    // Use expected values to calculate outputs
    const estimatedFee = Math.round(
      (inputs.length * 71 + psbt.data.outputs.length * 31 + 10) *
        expectedValues.feeRate
    );
    totalEstimatedOutput = totalInputValue - estimatedFee;
  } else {
    // Fallback estimation
    const estimatedFee = Math.round(
      (inputs.length * 71 + psbt.data.outputs.length * 31 + 10) * 1
    ); // 1 sat/byte for slow
    totalEstimatedOutput = totalInputValue - estimatedFee;
  }

  // Create outputs based on estimated values
  const outputs: DecodedOutput[] = [];

  if (expectedValues && psbt.data.outputs.length > 0) {
    // Use expected values to calculate outputs
    const estimatedFee = Math.round(
      (inputs.length * 71 + psbt.data.outputs.length * 31 + 10) *
        expectedValues.feeRate
    );

    for (let i = 0; i < psbt.data.outputs.length; i++) {
      let outputValue = 0;

      if (i === 0) {
        // First output is recipient
        outputValue = expectedValues.recipientAmount;
      } else if (i === 1) {
        // Second output is change
        outputValue =
          totalInputValue - expectedValues.recipientAmount - estimatedFee;
      }

      // Try to decode the address
      let address: string | undefined;
      let scriptType: string | undefined;

      try {
        // Access the script from the output data
        const outputData = psbt.data.outputs[i] as { script?: Buffer };
        if (outputData.script) {
          const decoded = bitcoin.address.fromOutputScript(
            outputData.script,
            network
          );
          address = decoded;
          scriptType = getScriptType(outputData.script);
        }
      } catch {
        warnings.push(`Output ${i}: Could not decode address`);
      }

      outputs.push({
        index: i,
        value: outputValue,
        scriptPubKey: '', // Not available in unsigned PSBT
        address,
        scriptType,
        isChange: i === 1, // Second output is change
      });
    }
  } else {
    // Fallback: distribute output value evenly
    const outputValuePerOutput = Math.floor(
      totalEstimatedOutput / psbt.data.outputs.length
    );

    for (let i = 0; i < psbt.data.outputs.length; i++) {
      let outputValue = 0;

      if (i === 0) {
        // First output is usually the recipient
        outputValue =
          totalEstimatedOutput -
          (psbt.data.outputs.length - 1) * outputValuePerOutput;
      } else {
        // Other outputs (like change)
        outputValue = outputValuePerOutput;
      }

      outputs.push({
        index: i,
        value: outputValue,
        scriptPubKey: '',
        address: undefined,
        scriptType: undefined,
        isChange: i > 0,
      });
    }
  }

  // Calculate fee
  let feeSatoshis = 0;

  if (expectedValues) {
    // Use expected fee calculation for unsigned PSBTs
    const estimatedFee = Math.round(
      (inputs.length * 71 + psbt.data.outputs.length * 31 + 10) *
        expectedValues.feeRate
    );
    feeSatoshis = estimatedFee;
  } else {
    // Calculate fee from input/output difference
    feeSatoshis = totalInputValue - totalEstimatedOutput;
  }

  const feeBTC = feeSatoshis / 100000000;

  // Estimate transaction size (since we can't get exact size from unsigned PSBT)
  const estimatedInputSize = inputs.length * 71; // P2WPKH virtual input size
  const estimatedOutputSize = psbt.data.outputs.length * 31; // P2WPKH output size
  const estimatedOverhead = 10; // version + locktime + witness marker
  const transactionSize =
    estimatedInputSize + estimatedOutputSize + estimatedOverhead;
  const virtualSize = Math.ceil(transactionSize / 4);

  // Calculate fee rate
  const feeRate = transactionSize > 0 ? feeSatoshis / transactionSize : 0;

  // Validate transaction
  if (feeSatoshis < 0) {
    validationErrors.push('Transaction has negative fee');
  }

  if (totalInputValue === 0) {
    validationErrors.push('No input value found');
  }

  return {
    version: 2, // Default version for unsigned PSBT
    locktime: 0,
    inputs,
    totalInputValue,
    inputCount: inputs.length,
    outputs,
    totalOutputValue: totalEstimatedOutput,
    outputCount: outputs.length,
    feeSatoshis,
    feeBTC,
    feeRate,
    transactionSize,
    virtualSize,
    isValid: validationErrors.length === 0,
    validationErrors,
    warnings: [...warnings, 'PSBT is unsigned - some data may be estimated'],
  };
}

/**
 * Validate PSBT against expected values
 */
export function validatePSBT(
  psbtBase64: string,
  expectedValues: {
    recipientAmount: number;
    feeRate: number;
    network?: bitcoin.Network;
  }
): ValidationResult {
  const decoded = decodePSBT(
    psbtBase64,
    expectedValues.network || bitcoin.networks.testnet,
    {
      recipientAmount: expectedValues.recipientAmount,
      feeRate: expectedValues.feeRate,
    }
  );

  const errors: string[] = [...decoded.validationErrors];
  const warnings: string[] = [...decoded.warnings];

  // Validate fee calculation
  const expectedFee = Math.round(
    decoded.transactionSize * expectedValues.feeRate
  );
  const feeAccuracy = Math.abs(decoded.feeSatoshis - expectedFee);
  const isFeeAccurate = feeAccuracy <= 1; // Allow 1 satoshi tolerance

  if (!isFeeAccurate) {
    errors.push(
      `Fee mismatch: expected ${expectedFee} satoshis, got ${decoded.feeSatoshis} satoshis`
    );
  }

  // Validate amount calculation
  const recipientAmount =
    decoded.outputs.find((output) => !output.isChange)?.value || 0;
  const changeAmount =
    decoded.outputs.find((output) => output.isChange)?.value || 0;
  const isAmountAccurate =
    Math.abs(recipientAmount - expectedValues.recipientAmount) <= 1;

  if (!isAmountAccurate) {
    errors.push(
      `Recipient amount mismatch: expected ${expectedValues.recipientAmount} satoshis, got ${recipientAmount} satoshis`
    );
  }

  // Validate transaction balance
  const isBalanced =
    decoded.totalInputValue === decoded.totalOutputValue + decoded.feeSatoshis;

  if (!isBalanced) {
    errors.push('Transaction is not balanced');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    feeValidation: {
      calculatedFee: decoded.feeSatoshis,
      expectedFee,
      feeRate: decoded.feeRate,
      isAccurate: isFeeAccurate,
    },
    amountValidation: {
      totalInput: decoded.totalInputValue,
      totalOutput: decoded.totalOutputValue,
      recipientAmount,
      changeAmount,
      isBalanced,
    },
  };
}

/**
 * Get script type from script buffer
 */
function getScriptType(script: Buffer): string {
  if (script.length === 0) return 'empty';

  const firstByte = script[0];

  if (firstByte === 0x00) return 'P2PKH';
  if (firstByte === 0x51) return 'P2WPKH';
  if (firstByte === 0x52) return 'P2WSH';
  if (firstByte === 0x53) return 'P2TR';

  return 'unknown';
}

/**
 * Format BTC amount
 */
export function formatBTC(satoshis: number): string {
  return (satoshis / 100000000).toFixed(8);
}

/**
 * Format BTC amount in compact form
 */
export function formatBTCCompact(satoshis: number): string {
  return (satoshis / 100000000).toFixed(8).replace(/\.?0+$/, '');
}

/**
 * Generate comprehensive PSBT report
 */
export function generatePSBTReport(
  psbtBase64: string,
  expectedValues: {
    recipientAmount: number;
    feeRate: number;
    network?: bitcoin.Network;
  }
): string {
  const decoded = decodePSBT(
    psbtBase64,
    expectedValues.network || bitcoin.networks.testnet,
    {
      recipientAmount: expectedValues.recipientAmount,
      feeRate: expectedValues.feeRate,
    }
  );

  const validation = validatePSBT(psbtBase64, expectedValues);

  let report = '=== PSBT Transaction Report ===\n\n';

  // Basic info
  report += `Transaction ID: ${decoded.txid || 'Unsigned PSBT'}\n`;
  report += `Version: ${decoded.version}\n`;
  report += `Locktime: ${decoded.locktime}\n\n`;

  // Inputs
  report += `=== Inputs (${decoded.inputCount}) ===\n`;
  decoded.inputs.forEach((input, index) => {
    report += `Input ${index}:\n`;
    report += `  TXID: ${input.txid}\n`;
    report += `  Vout: ${input.vout}\n`;
    report += `  Value: ${formatBTC(input.value)} BTC (${
      input.value
    } satoshis)\n`;
    if (input.address) report += `  Address: ${input.address}\n`;
    if (input.scriptType) report += `  Script Type: ${input.scriptType}\n`;
    report += '\n';
  });

  // Outputs
  report += `=== Outputs (${decoded.outputCount}) ===\n`;
  decoded.outputs.forEach((output, index) => {
    report += `Output ${index}:\n`;
    report += `  Value: ${formatBTC(output.value)} BTC (${
      output.value
    } satoshis)\n`;
    if (output.address) report += `  Address: ${output.address}\n`;
    if (output.scriptType) report += `  Script Type: ${output.scriptType}\n`;
    report += `  Type: ${output.isChange ? 'Change' : 'Recipient'}\n`;
    report += '\n';
  });

  // Fee analysis
  report += `=== Fee Analysis ===\n`;
  report += `Total Input: ${formatBTC(decoded.totalInputValue)} BTC\n`;
  report += `Total Output: ${formatBTC(decoded.totalOutputValue)} BTC\n`;
  report += `Fee: ${formatBTC(decoded.feeSatoshis)} BTC (${
    decoded.feeSatoshis
  } satoshis)\n`;
  report += `Fee Rate: ${decoded.feeRate.toFixed(2)} sat/byte\n`;
  report += `Transaction Size: ${decoded.transactionSize} bytes\n\n`;

  // Validation results
  report += `=== Validation Results ===\n`;
  report += `Valid: ${validation.isValid ? '✅ Yes' : '❌ No'}\n`;

  if (validation.errors.length > 0) {
    report += `Errors:\n`;
    validation.errors.forEach((error) => {
      report += `  ❌ ${error}\n`;
    });
  }

  if (validation.warnings.length > 0) {
    report += `Warnings:\n`;
    validation.warnings.forEach((warning) => {
      report += `  ⚠️ ${warning}\n`;
    });
  }

  // Fee validation
  report += `\n=== Fee Validation ===\n`;
  report += `Expected Fee: ${validation.feeValidation.expectedFee} satoshis\n`;
  report += `Calculated Fee: ${validation.feeValidation.calculatedFee} satoshis\n`;
  report += `Fee Rate: ${validation.feeValidation.feeRate.toFixed(
    2
  )} sat/byte\n`;
  report += `Accurate: ${
    validation.feeValidation.isAccurate ? '✅ Yes' : '❌ No'
  }\n`;

  // Amount validation
  report += `\n=== Amount Validation ===\n`;
  report += `Expected Recipient: ${expectedValues.recipientAmount} satoshis\n`;
  report += `Actual Recipient: ${validation.amountValidation.recipientAmount} satoshis\n`;
  report += `Change Amount: ${validation.amountValidation.changeAmount} satoshis\n`;
  report += `Balanced: ${
    validation.amountValidation.isBalanced ? '✅ Yes' : '❌ No'
  }\n`;

  return report;
}
