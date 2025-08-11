'use client';

import { useState } from 'react';
import {
  Header,
  MainContainer,
  Card,
  Button,
  TextArea,
  Input,
  Status,
} from '@btc-wallet/ui';
import { QRScannerModal } from './components/QRScannerModal';
import { QRCodeDisplay } from './components/QRCode';
import OfflineIndicator from './components/OfflineIndicator';
import InstallPrompt from './components/InstallPrompt';
import { Eye, EyeOff, Trash } from 'lucide-react';
import {
  parsePSBT,
  signPSBT,
  extractSignatures,
  validatePrivateKey as validatePrivateKeyLib,
} from '../libs/bitcoin';

interface PSBTInfo {
  inputs: number;
  outputs: number;
  network: 'testnet' | 'mainnet';
  rawPSBT: string;
}

interface SignatureData {
  inputIndex: number;
  publicKey: string;
  signature: string;
}

export default function SignerPage() {
  const [psbtInfo, setPsbtInfo] = useState<PSBTInfo | null>(null);
  const [privateKey, setPrivateKey] = useState<string>('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [signedPSBT, setSignedPSBT] = useState<string>('');
  const [signatures, setSignatures] = useState<SignatureData[] | null>(null);

  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [status, setStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);

  const handleScanPSBT = (result: string) => {
    try {
      setError('');
      const cleanedData = result.trim();

      // Parse the actual PSBT from QR data
      const info = parsePSBT(cleanedData);
      setPsbtInfo(info);
      setStatus({
        message: 'PSBT scanned successfully!',
        type: 'success',
      });
      setShowQRScanner(false);
    } catch {
      setError('Invalid PSBT format. Please scan a valid PSBT QR code.');
      setShowQRScanner(false);
    }
  };

  const validatePrivateKey = (key: string): boolean => {
    // Use the Bitcoin library validation function
    try {
      return validatePrivateKeyLib(key);
    } catch {
      return false;
    }
  };

  const handleSignPSBT = async () => {
    if (!psbtInfo || !privateKey) return;

    try {
      setIsLoading(true);
      setError('');

      // Sign the PSBT with the private key
      const signed = signPSBT(psbtInfo.rawPSBT, privateKey);
      setSignedPSBT(signed);

      setStatus({
        message: 'PSBT signed successfully!',
        type: 'success',
      });
    } catch {
      setError('Failed to sign PSBT. Please check your private key.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSignatures = async () => {
    if (!psbtInfo || !privateKey) return;

    try {
      setIsLoading(true);
      setError('');

      // Extract signatures from the signed PSBT
      const sigInfo = extractSignatures(psbtInfo.rawPSBT, privateKey);
      setSignatures(sigInfo);
      setStatus({
        message: 'Signatures generated successfully!',
        type: 'success',
      });
    } catch {
      setError('Failed to generate signatures. Please check your private key.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus({
        message: `${label} copied to clipboard!`,
        type: 'success',
      });
    } catch {
      setError(`Failed to copy ${label} to clipboard`);
    }
  };

  const handleClearAll = () => {
    setPsbtInfo(null);
    setPrivateKey('');
    setSignedPSBT('');
    setSignatures(null);

    setError('');
    setStatus(null);
  };

  const isPrivateKeyValid = privateKey ? validatePrivateKey(privateKey) : false;
  const canSign = Boolean(psbtInfo && isPrivateKeyValid);

  return (
    <MainContainer>
      <OfflineIndicator />
      <Header appType="signer" />

      {/* PSBT Scanner */}
      <Card title="Scan PSBT QR Code" icon="fas fa-camera">
        <div className="scannerSection">
          <div className="instructions">
            <h3>Instructions:</h3>
            <ol>
              <li>
                Point your camera at the PSBT QR code from the root project
              </li>
              <li>Wait for the QR code to be detected and parsed</li>
              <li>Verify the transaction details are correct</li>
              <li>Proceed to signing with your private key</li>
            </ol>
          </div>

          <div className="scannerActions">
            <Button
              onClick={() => setShowQRScanner(true)}
              variant="primary"
              icon="fas fa-camera"
            >
              Scan PSBT QR Code
            </Button>
            <div className="scannerStatus">
              {psbtInfo ? (
                <span className="success">✓ PSBT loaded successfully</span>
              ) : (
                <span>Ready to scan PSBT</span>
              )}
            </div>
          </div>
        </div>

        {/* PSBT Information */}
        {psbtInfo && (
          <div className="psbtInfo">
            <h3>PSBT Information:</h3>
            <div className="psbtData">
              <h4>Raw PSBT Data:</h4>
              <TextArea
                value={psbtInfo.rawPSBT}
                readOnly
                placeholder="PSBT data will appear here..."
                rows={4}
              />
              <div className="psbtActions">
                <Button
                  variant="secondary"
                  onClick={() =>
                    handleCopyToClipboard(psbtInfo.rawPSBT, 'PSBT')
                  }
                  icon="fas fa-copy"
                >
                  Copy PSBT
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setPsbtInfo(null)}
                  icon="fas fa-trash"
                >
                  Clear PSBT
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Private Key Input */}
      <Card title="Private Key" icon="fas fa-key">
        <div className="privateKeySection">
          <div className="privateKeyInstructions">
            <h3>Enter Your Private Key:</h3>
            <p>
              Enter your WIF format private key to sign the PSBT. Your key will
              be validated and used only for signing.
            </p>
          </div>

          <div className="privateKeyInput">
            <div className="inputWrapper">
              <Input
                type={showPrivateKey ? 'text' : 'password'}
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="e.g., cQ8pwwpeeTPECzddjU2H8hWVH7MaABMJ64EunL3nrUy5mEBaYxqQ"
                className={isPrivateKeyValid && privateKey ? 'validKey' : ''}
              />
              <div className="inputActions">
                <button
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="toggleButton"
                >
                  {showPrivateKey ? (
                    <EyeOff size={16} strokeWidth={2.5} />
                  ) : (
                    <Eye size={16} strokeWidth={2.5} />
                  )}
                </button>
                <button
                  onClick={() => setPrivateKey('')}
                  className="clearButton"
                >
                  <Trash size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="keyValidation">
              {privateKey ? (
                isPrivateKeyValid ? (
                  <span className="valid">✓ Valid private key</span>
                ) : (
                  <span className="invalid">✗ Invalid private key format</span>
                )
              ) : (
                <span className="noKey">No private key provided</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Signing Actions */}
      <Card title="Signing Actions" icon="fas fa-signature">
        <div className="signingActions">
          <Button
            onClick={handleSignPSBT}
            disabled={!canSign || isLoading}
            variant="primary"
            icon="fas fa-lock"
          >
            {isLoading ? 'Signing...' : 'Sign PSBT'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleGenerateSignatures}
            disabled={!canSign || isLoading}
            icon="fas fa-file-text"
          >
            {isLoading ? 'Generating...' : 'Generate Signatures'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleClearAll}
            icon="fas fa-trash"
          >
            Clear All Data
          </Button>
        </div>
      </Card>

      {/* Signed Transaction */}
      {signedPSBT && (
        <Card title="Signed Transaction" icon="fas fa-check-circle">
          <div className="signedTransaction">
            <h3>Signed PSBT:</h3>
            <TextArea
              value={signedPSBT}
              readOnly
              placeholder="Signed PSBT will appear here..."
              rows={4}
            />
            <div className="signedActions">
              <Button
                variant="secondary"
                onClick={() => handleCopyToClipboard(signedPSBT, 'Signed PSBT')}
                icon="fas fa-copy"
              >
                Copy Signed PSBT
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Signatures Display */}
      {signatures && (
        <Card title="Signatures Only" icon="fas fa-file-text">
          <div className="signaturesSection">
            <div className="airGappedInfo">
              <h3>Air-Gapped Workflow:</h3>
              <p>
                These are just the signatures. Transfer this QR code back to the
                device that created the PSBT to combine signatures with the
                original PSBT.
              </p>
            </div>

            <div className="signaturesList">
              <h4>Generated Signatures:</h4>
              {signatures.map((sig, index) => (
                <div key={index} className="signatureItem">
                  <span className="signatureIndex">{sig.inputIndex + 1}</span>
                  <div className="signatureDetails">
                    <div className="signatureTitle">
                      Input {sig.inputIndex + 1}
                    </div>
                    <div className="signatureData">
                      <div>
                        <div className="signatureLabel">Public Key:</div>
                        <div className="signatureValue">{sig.publicKey}</div>
                      </div>
                      <div>
                        <div className="signatureLabel">Signature:</div>
                        <div className="signatureValue">{sig.signature}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="qrCodeSection">
              <div className="qrCodeContainer">
                <QRCodeDisplay
                  data={JSON.stringify(signatures)}
                  size={200}
                  className="qrCode"
                />
              </div>

              <div className="signatureActions">
                <Button
                  variant="secondary"
                  onClick={() =>
                    handleCopyToClipboard(
                      JSON.stringify(signatures),
                      'signatures'
                    )
                  }
                  icon="fas fa-copy"
                >
                  Copy Signatures
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setSignatures(null)}
                  icon="fas fa-refresh"
                >
                  New Transaction
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="footer">
        <p>This tool signs Bitcoin transactions offline for maximum security</p>
        <p>
          All processing happens in your browser - no data is sent to any server
        </p>
      </div>

      {error && (
        <Status message={error} type="error" onDismiss={() => setError('')} />
      )}
      {status && (
        <Status
          message={status.message}
          type={status.type}
          onDismiss={() => setStatus(null)}
        />
      )}

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanResult={handleScanPSBT}
      />

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </MainContainer>
  );
}
