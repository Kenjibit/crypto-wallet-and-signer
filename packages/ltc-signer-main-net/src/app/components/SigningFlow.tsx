'use client';

import { useState } from 'react';
import { Card, Button, Input, TextArea, Status } from '@btc-wallet/ui';
import { Eye, EyeOff, Copy, CheckCircle, AlertCircle } from 'lucide-react';

interface SigningFlowProps {
  scannedData: string;
  importedWallet: any;
  createdWallet: any;
  onBack: () => void;
}

export function SigningFlow({ scannedData, importedWallet, createdWallet, onBack }: SigningFlowProps) {
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [signedPSBT, setSignedPSBT] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [step, setStep] = useState<'input' | 'signing' | 'complete'>('input');

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

      setIsSigning(true);
      setError('');
      setStatus('Signing transaction...');

      // Simulate signing process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock signed PSBT
      const mockSignedPSBT = 'signed-psbt-data-for-testing';
      setSignedPSBT(mockSignedPSBT);
      setStep('complete');
      setStatus('Transaction signed successfully!');

    } catch (err) {
      setError('Failed to sign transaction. Please try again.');
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

  const handleReset = () => {
    setPrivateKey('');
    setSignedPSBT('');
    setError('');
    setStatus('');
    setStep('input');
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
          <Input
            label="Wallet Type"
            value={wallet?.type || 'Unknown'}
            readOnly
          />
          <Input
            label="Network"
            value={wallet?.network || 'mainnet'}
            readOnly
          />
          {wallet?.address && (
            <Input
              label="Address"
              value={wallet.address}
              readOnly
            />
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

        <div className="next-steps">
          <h3>Next Steps:</h3>
          <ol>
            <li>Copy the signed PSBT data</li>
            <li>Transfer it back to your main device</li>
            <li>Broadcast the transaction</li>
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
      </div>
    </div>
  );
}

