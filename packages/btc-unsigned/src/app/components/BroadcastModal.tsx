'use client';

import { useState } from 'react';
import { Button, Card } from '@btc-wallet/ui';
import { SignatureData } from '../../lib/broadcast';
import { parseSignatureQR } from '../../lib/qr-generator';
import { QRScannerModal } from '@btc-wallet/ui';
import {
  AlertTriangle,
  FileSignature,
  Inbox,
  Trash,
  RadioTower,
} from 'lucide-react';
import styles from './BroadcastModal.module.css';

interface BroadcastModalProps {
  psbt: string;
  isOpen: boolean;
  onClose: () => void;
  onBroadcast: (signatures: SignatureData[]) => void;
}

export function BroadcastModal({
  isOpen,
  onClose,
  onBroadcast,
}: BroadcastModalProps) {
  const [signatures, setSignatures] = useState<SignatureData[]>([]);
  const [error, setError] = useState<string>('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  if (!isOpen) return null;

  const handleAddSignature = (signature: SignatureData) => {
    // Check for duplicate signatures
    const isDuplicate = signatures.some(
      (sig) =>
        sig.inputIndex === signature.inputIndex &&
        sig.publicKey === signature.publicKey
    );

    if (isDuplicate) {
      setError('Signature from this address has already been added');
      return;
    }

    setSignatures((prev) => [...prev, signature]);
    setError('');
  };

  const handleScanResult = (result: string) => {
    console.log('QR Scanner - Raw result received:', result);
    console.log('QR Scanner - Result length:', result.length);
    console.log('QR Scanner - Result type:', typeof result);
    console.log('QR Scanner - First 100 characters:', result.substring(0, 100));
    console.log(
      'QR Scanner - Last 100 characters:',
      result.substring(Math.max(0, result.length - 100))
    );

    // First, try to parse as signature QR code
    try {
      console.log('QR Scanner - Attempting to parse signature QR...');
      console.log('QR Scanner - Raw result for signature parsing:', result);

      const signatureDataArray = parseSignatureQR(result);
      console.log(
        'QR Scanner - Parsed signature data array:',
        signatureDataArray
      );

      // Add all signatures from the array
      signatureDataArray.forEach((signatureData, index) => {
        console.log(`QR Scanner - Adding signature ${index}:`, signatureData);
        handleAddSignature(signatureData);
      });

      setShowQRScanner(false);
      return;
    } catch (signatureError) {
      console.log(
        "QR Scanner - Not a signature QR code, checking if it's a PSBT..."
      );
      console.log('QR Scanner - Signature parsing error:', signatureError);
    }

    // If not a signature QR, check if it's a PSBT QR code
    try {
      console.log("QR Scanner - Checking if it's a PSBT QR code...");
      console.log('QR Scanner - Result starts with:', result.substring(0, 10));
      console.log(
        'QR Scanner - Is base64 pattern match:',
        /^[A-Za-z0-9+/]*={0,2}$/.test(result)
      );

      // Check if it looks like a PSBT (base64 string, typically starts with 'cHNidP')
      if (
        result.startsWith('cHNidP') ||
        /^[A-Za-z0-9+/]*={0,2}$/.test(result)
      ) {
        console.log('QR Scanner - Detected PSBT QR code');
        setError(
          'This is a PSBT QR code. Please scan a signature QR code instead.'
        );
        setShowQRScanner(false);
        return;
      } else {
        console.log('QR Scanner - Not a PSBT QR code');
      }
    } catch (psbtError) {
      console.log('QR Scanner - Error checking PSBT format:', psbtError);
    }

    // If neither signature nor PSBT, show generic error
    console.error('QR Scanner - Unknown QR code format');
    console.log('QR Scanner - Full unknown data:', result);
    setError('Unknown QR code format. Please scan a signature QR code.');
    setShowQRScanner(false);
  };

  const handleBroadcast = async () => {
    if (signatures.length === 0) {
      setError('Please add at least one signature');
      return;
    }

    setBroadcasting(true);
    try {
      await onBroadcast(signatures);
      onClose();
    } catch (error) {
      setError(
        `Broadcast failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setBroadcasting(false);
    }
  };

  const removeSignature = (index: number) => {
    setSignatures((prev) => prev.filter((_, i) => i !== index));
  };

  const startScanning = () => {
    setShowQRScanner(true);
    setError('');
  };

  return (
    <>
      <div className={styles.modalOverlay}>
        <div className={styles.modalContainer}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>
              <RadioTower size={20} strokeWidth={2.5} />
              Broadcast Transaction
            </h2>
            <button onClick={onClose} className={styles.closeButton}>
              ×
            </button>
          </div>

          <div className={styles.modalContent}>
            {/* Step 1: Signature Collection */}
            <Card
              title="1. Collect Signatures"
              icon="fas fa-signature"
              variant="outlined"
              padding="lg"
            >
              <div className={styles.signatureSection}>
                {/* QR Scanner */}
                <div className={styles.scannerSection}>
                  <Button
                    onClick={startScanning}
                    variant="secondary"
                    icon="fas fa-camera"
                    className={styles.scanButton}
                  >
                    Start Scanning Signatures
                  </Button>
                </div>

                {/* Error Display */}
                {error && (
                  <div className={styles.errorContainer}>
                    <AlertTriangle size={16} strokeWidth={2.5} />
                    <p className={styles.errorText}>{error}</p>
                  </div>
                )}

                {/* Signatures List */}
                <div className={styles.signaturesSection}>
                  <h4 className={styles.signaturesTitle}>
                    <FileSignature size={16} strokeWidth={2.5} />
                    Collected Signatures ({signatures.length})
                  </h4>
                  {signatures.length === 0 ? (
                    <div className={styles.emptySignatures}>
                      <Inbox size={16} strokeWidth={2.5} />
                      <p>No signatures collected yet</p>
                    </div>
                  ) : (
                    <div className={styles.signaturesList}>
                      {signatures.map((sig, index) => (
                        <div key={index} className={styles.signatureItem}>
                          <div className={styles.signatureInfo}>
                            <div className={styles.signatureInput}>
                              Input {sig.inputIndex}
                            </div>
                            <div className={styles.signatureKey}>
                              {sig.publicKey.substring(0, 20)}...
                            </div>
                            {sig.address && (
                              <div className={styles.signatureAddress}>
                                {sig.address}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeSignature(index)}
                            className={styles.removeButton}
                          >
                            <Trash size={16} strokeWidth={2.5} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Step 2: Broadcast Button */}
            <Card
              title="2. Broadcast Transaction"
              icon="fas fa-broadcast-tower"
              variant="outlined"
              padding="lg"
            >
              <div className={styles.broadcastSection}>
                <div className={styles.broadcastStatus}>
                  <div className={styles.statusDot}></div>
                  <span className={styles.statusText}>
                    {signatures.length === 0
                      ? 'Add at least one signature to broadcast'
                      : `Ready to broadcast with ${signatures.length} signature(s)`}
                  </span>
                </div>

                <Button
                  onClick={handleBroadcast}
                  disabled={signatures.length === 0 || broadcasting}
                  variant="primary"
                  icon="fas fa-broadcast-tower"
                  loading={broadcasting}
                  className={styles.broadcastButton}
                >
                  {broadcasting ? 'Broadcasting...' : 'Broadcast Transaction'}
                </Button>

                {signatures.length > 0 && (
                  <p className={styles.broadcastDescription}>
                    This will combine all signatures and broadcast to the
                    Bitcoin network
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanResult={handleScanResult}
      />
    </>
  );
}
