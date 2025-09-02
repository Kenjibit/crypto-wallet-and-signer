'use client';

import { useState } from 'react';
import { Card, Button, Input, TextArea, Status } from '@btc-wallet/ui';
import { Eye, EyeOff, Copy, CheckCircle, Wallet } from 'lucide-react';
import {
  parseLTCPSBT,
  signLTCPSBT,
  validateLTCPrivateKey,
  getLTCSignedTransactionHex,
  extractLTCSignatures,
} from '../libs/ltc-psbt';

interface SimpleWallet {
  id?: number;
  name?: string;
  address?: string;
  publicKey?: string;
  encryptedPrivateKey?: string;
  derivationPath?: string;
  network?: 'mainnet' | 'testnet';
  cryptoType?: string;
  createdAt?: Date;
  updatedAt?: Date;
  isActive?: boolean;
  lastSync?: Date;
}

interface SigningFlowProps {
  scannedData: string;
  importedWallet: SimpleWallet | null;
  createdWallet: SimpleWallet | null;
  onBack: () => void;
}

export function SigningFlow({
  scannedData,
  importedWallet,
  createdWallet,
  onBack,
}: SigningFlowProps) {
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [signedPSBT, setSignedPSBT] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [step, setStep] = useState<
    'input' | 'signing' | 'complete' | 'signatures'
  >('input');

  const [signedTxHex, setSignedTxHex] = useState<string>('');
  const [signatures, setSignatures] = useState<
    import('../types/ltc-psbt').LTCSignature[] | null
  >(null);

  const wallet = importedWallet || createdWallet;

  const handleSignTransaction = async () => {
    try {
      if (!privateKey.trim()) {
        setError('Please enter your private key');
        return;
      }

      if (!scannedData) {
        setError('No PSBT data to sign');
        return;
      }

      // Validate private key format
      if (!validateLTCPrivateKey(privateKey.trim())) {
        setError('Invalid LTC private key format. Please check your WIF key.');
        return;
      }

      setIsSigning(true);
      setError('');
      setStatus('Parsing PSBT...');

      // Parse the PSBT first
      try {
        const parsedPsbtInfo = parseLTCPSBT(scannedData.trim());
        setStatus(
          `PSBT parsed: ${parsedPsbtInfo.inputs} inputs, ${parsedPsbtInfo.outputs} outputs (${parsedPsbtInfo.network})`
        );
      } catch {
        setError('Invalid PSBT format. Please scan a valid LTC PSBT QR code.');
        setIsSigning(false);
        return;
      }

      setStatus('Signing transaction...');

      // Sign the PSBT with the private key
      const signedPSBT = signLTCPSBT(scannedData.trim(), privateKey.trim());
      setSignedPSBT(signedPSBT);

      // Extract the signed transaction hex
      try {
        const txHex = getLTCSignedTransactionHex(signedPSBT);
        setSignedTxHex(txHex);
        setStatus(
          'Transaction signed successfully! Extracting transaction hex...'
        );
      } catch (hexError) {
        console.warn('Could not extract transaction hex:', hexError);
        setStatus('Transaction signed successfully! (Could not extract hex)');
      }

      setStep('complete');
    } catch (error) {
      console.error('LTC signing error:', error);
      setError(
        `Failed to sign LTC transaction: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setIsSigning(false);
    }
  };

  const handleCopyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`${label} copied to clipboard!`);
      setTimeout(() => setStatus(''), 3000);
    } catch {
      setError(`Failed to copy ${label} to clipboard`);
    }
  };

  const handleGenerateSignatures = async () => {
    try {
      if (!scannedData || !privateKey.trim()) {
        setError('No PSBT data or private key to generate signatures');
        return;
      }

      setIsSigning(true);
      setError('');
      setStatus('Generating signatures...');

      // Extract signatures from the PSBT
      const sigInfo = extractLTCSignatures(
        scannedData.trim(),
        privateKey.trim()
      );
      setSignatures(sigInfo);
      setStep('signatures');
      setStatus('Signatures generated successfully!');
    } catch (error) {
      console.error('LTC signature generation error:', error);
      setError(
        `Failed to generate LTC signatures: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setIsSigning(false);
    }
  };

  const handleReset = () => {
    setPrivateKey('');
    setSignedPSBT('');
    setError('');
    setStatus('');
    setStep('input');
    setSignedTxHex('');
    setSignatures(null);
  };

  const renderInputStep = () => (
    <div className="signing-input">
      <Card title="Transaction Details" className="transaction-card">
        <div className="psbt-info">
          <TextArea
            label="PSBT Data"
            value={scannedData}
            readOnly
            rows={4}
            helperText="PSBT data from scanned QR code"
          />
        </div>
      </Card>

      <Card title="Wallet Information" className="wallet-card">
        <div className="wallet-info">
          <div className="wallet-header">
            <Wallet size={24} className="wallet-icon" />
            <div className="wallet-details">
              <h4 className="wallet-name">
                {wallet?.name || 'Unknown Wallet'}
              </h4>
              <p className="wallet-network">{wallet?.network || 'mainnet'}</p>
            </div>
          </div>

          {wallet?.address && (
            <div className="wallet-address">
              <span className="address-label">Address:</span>
              <div className="address-container">
                <span className="address-value">{wallet.address}</span>
                <Button
                  onClick={() =>
                    handleCopyToClipboard(wallet.address!, 'Address')
                  }
                  variant="ghost"
                  size="sm"
                  className="copy-btn"
                >
                  <Copy size={16} />
                </Button>
              </div>
            </div>
          )}

          {wallet?.cryptoType && (
            <div className="wallet-crypto-type">
              <span className="crypto-label">Crypto Type:</span>
              <span className="crypto-value">{wallet.cryptoType}</span>
            </div>
          )}
        </div>
      </Card>

      <Card title="Sign Transaction" className="signing-card">
        <div className="private-key-input">
          <div className="input-wrapper">
            <Input
              label="Private Key (WIF)"
              placeholder="Enter your WIF format private key"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              type={showPrivateKey ? 'text' : 'password'}
              helperText="Your private key to sign the transaction"
            />
            <button
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="toggle-button"
            >
              {showPrivateKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="signing-actions">
          <Button onClick={onBack} variant="secondary">
            Back
          </Button>
          <Button
            onClick={handleSignTransaction}
            loading={isSigning}
            variant="primary"
            disabled={!privateKey.trim() || isSigning}
          >
            <CheckCircle size={20} />
            Sign Transaction
          </Button>
          <Button
            onClick={handleGenerateSignatures}
            loading={isSigning}
            variant="secondary"
            disabled={!privateKey.trim() || isSigning}
          >
            <Copy size={20} />
            Generate Signatures Only
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="signing-complete">
      <Card title="Transaction Signed Successfully!" className="complete-card">
        <div className="success-icon">
          <CheckCircle size={64} color="#10b981" />
        </div>

        <div className="signed-psbt">
          <TextArea
            label="Signed PSBT"
            value={signedPSBT}
            readOnly
            rows={4}
            helperText="This is your signed transaction data"
          />

          <div className="copy-actions">
            <Button
              onClick={() => handleCopyToClipboard(signedPSBT, 'Signed PSBT')}
              variant="secondary"
            >
              <Copy size={20} />
              Copy Signed PSBT
            </Button>
          </div>
        </div>

        {signedTxHex && (
          <div className="signed-transaction-hex">
            <TextArea
              label="Signed Transaction Hex"
              value={signedTxHex}
              readOnly
              rows={4}
              helperText="This is your signed transaction in hex format for broadcasting"
            />

            <div className="copy-actions">
              <Button
                onClick={() =>
                  handleCopyToClipboard(signedTxHex, 'Transaction Hex')
                }
                variant="secondary"
              >
                <Copy size={20} />
                Copy Transaction Hex
              </Button>
            </div>
          </div>
        )}

        <div className="next-steps">
          <h3>Next Steps:</h3>
          <ol>
            <li>Copy the signed PSBT data or transaction hex</li>
            <li>Transfer it back to your main device</li>
            <li>Broadcast the transaction using the hex format</li>
            <li>Wait for network confirmation</li>
          </ol>
        </div>

        <div className="complete-actions">
          <Button onClick={handleReset} variant="secondary">
            Sign Another Transaction
          </Button>
          <Button onClick={onBack} variant="primary">
            Back to Main Menu
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderSignaturesStep = () => (
    <div className="signatures-complete">
      <Card
        title="Signatures Generated Successfully!"
        className="signatures-card"
      >
        <div className="success-icon">
          <CheckCircle size={64} color="#10b981" />
        </div>

        <div className="air-gapped-info">
          <h3>Air-Gapped Workflow:</h3>
          <p>
            These are just the signatures. Transfer this data back to the device
            that created the PSBT to combine signatures with the original PSBT.
          </p>
        </div>

        <div className="signatures-list">
          <h4>Generated Signatures:</h4>
          {signatures?.map((sig, index) => (
            <div key={index} className="signature-item">
              <span className="signature-index">{sig.inputIndex + 1}</span>
              <div className="signature-details">
                <div className="signature-title">
                  Input {sig.inputIndex + 1}
                </div>
                <div className="signature-data">
                  <div>
                    <div className="signature-label">Public Key:</div>
                    <div className="signature-value">{sig.publicKey}</div>
                  </div>
                  <div>
                    <div className="signature-label">Signature:</div>
                    <div className="signature-value">{sig.signature}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="signatures-actions">
          <Button
            onClick={() =>
              handleCopyToClipboard(JSON.stringify(signatures), 'Signatures')
            }
            variant="secondary"
          >
            <Copy size={20} />
            Copy Signatures
          </Button>
          <Button onClick={handleReset} variant="primary">
            New Transaction
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="signing-flow">
      <div className="signing-content">
        {error && (
          <div className="signing-error">
            <Status message={error} type="error" />
          </div>
        )}

        {status && (
          <div className="signing-status">
            <Status message={status} type="success" />
          </div>
        )}

        {step === 'input' && renderInputStep()}
        {step === 'complete' && renderCompleteStep()}
        {step === 'signatures' && renderSignaturesStep()}
      </div>
    </div>
  );
}
