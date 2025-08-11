'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UnsignedTransaction } from '../../types/bitcoin';
import { Button, Card } from '@btc-wallet/ui';
import { SignatureData } from '../../lib/broadcast';
import { FileCode, Info } from 'lucide-react';

export default function TransactionOutput({
  unsignedTransaction,
  onCopyPSBT,
  onExportJSON,
  onBroadcast,
  onOpenBroadcastModal,
}: {
  unsignedTransaction: UnsignedTransaction | null;
  onCopyPSBT: () => void;
  onExportJSON: () => void;
  onBroadcast?: (signatures: SignatureData[]) => void;
  onOpenBroadcastModal: () => void;
}) {
  const [qrValue, setQrValue] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'psbt' | 'details'>('psbt');

  // Update QR value when transaction changes
  useEffect(() => {
    if (unsignedTransaction?.psbt) {
      try {
        // Use PSBT for QR code
        const cleanPSBT = unsignedTransaction.psbt.replace(/[\n\s]/g, '');

        // Validate base64 format
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanPSBT)) {
          throw new Error(
            'Invalid PSBT format - contains non-base64 characters'
          );
        }

        // Validate length (minimum 10 characters)
        if (cleanPSBT.length < 10) {
          throw new Error(`PSBT too short (${cleanPSBT.length} characters)`);
        }

        setQrValue(cleanPSBT);
        setError('');
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : 'Invalid transaction data';
        setError(errorMessage);
        setQrValue('');
      }
    } else {
      setQrValue('');
      setError('No transaction data available');
    }
  }, [unsignedTransaction]);

  const formatBTC = (satoshis: number): string => {
    return (satoshis / 100000000).toFixed(8);
  };

  if (!unsignedTransaction) {
    return (
      <div className="transaction-output">
        <div className="text-center text-gray-500 py-8">
          <FileCode size={48} strokeWidth={2.5} className="mb-4" />
          <p>No transaction generated yet</p>
          <p className="text-sm">Create a transaction to see the PSBT here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-output">
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          onClick={() => setActiveTab('psbt')}
          className={`tab-button ${activeTab === 'psbt' ? 'active' : ''}`}
        >
          <FileCode size={16} strokeWidth={2.5} />
          PSBT
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
        >
          <Info size={16} strokeWidth={2.5} />
          Details
        </button>
      </div>

      {/* PSBT Tab */}
      {activeTab === 'psbt' && (
        <div>
          {/* QR Code Container - Always Visible */}
          <div className="qr-code-container">
            {qrValue ? (
              <div className="bg-white p-4 rounded-lg w-full max-w-[320px]">
                <QRCodeSVG
                  value={qrValue}
                  size={320}
                  level="H"
                  includeMargin={true}
                  style={{ width: '100%', height: 'auto' }}
                />
              </div>
            ) : (
              <div className="bg-gray-700 border-2 border-dashed border-gray-600 rounded-xl w-full max-w-[320px] aspect-square flex items-center justify-center text-gray-500">
                {error || 'No transaction to display'}
              </div>
            )}
          </div>

          {/* Copy PSBT Button - Full Width Below QR */}
          <div className="btn-container">
            {onBroadcast && (
              <Button
                type="button"
                onClick={onOpenBroadcastModal}
                variant="primary"
                icon="fas fa-broadcast-tower"
              >
                Broadcast Transaction
              </Button>
            )}
            <Button
              type="button"
              onClick={onCopyPSBT}
              variant="secondary"
              icon="fas fa-copy"
            >
              Copy PSBT
            </Button>
          </div>
        </div>
      )}

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              title="Transaction Details"
              icon="fas fa-info-circle"
              variant="outlined"
              padding="md"
            >
              <div className="space-y-2 text-sm">
                <div className="summary-item">
                  <span>Network:</span>
                  <span className="value font-mono">
                    {unsignedTransaction.network}
                  </span>
                </div>
                <div className="summary-item">
                  <span>Fee Rate:</span>
                  <span className="value font-mono">
                    {unsignedTransaction.feeRate}
                  </span>
                </div>
                <div className="summary-item">
                  <span>Transaction Size:</span>
                  <span className="value font-mono">
                    {unsignedTransaction.transactionSize} bytes
                  </span>
                </div>
                <div className="summary-item">
                  <span>Inputs:</span>
                  <span className="value font-mono">
                    {unsignedTransaction.totalInputs}
                  </span>
                </div>
                <div className="summary-item">
                  <span>Outputs:</span>
                  <span className="value font-mono">
                    {unsignedTransaction.totalOutputs}
                  </span>
                </div>
              </div>
            </Card>

            <Card
              title="Amounts"
              icon="fas fa-coins"
              variant="outlined"
              padding="md"
            >
              <div className="space-y-2 text-sm">
                <div className="summary-item">
                  <span>Total Input:</span>
                  <span className="value font-mono">
                    {formatBTC(unsignedTransaction.totalInputValue)} BTC
                  </span>
                </div>
                <div className="summary-item">
                  <span>Recipient Amount:</span>
                  <span className="value font-mono">
                    {formatBTC(
                      unsignedTransaction.totalOutputValue -
                        unsignedTransaction.changeAmount
                    )}{' '}
                    BTC
                  </span>
                </div>
                <div className="summary-item">
                  <span>Total Output:</span>
                  <span className="value font-mono">
                    {formatBTC(unsignedTransaction.totalOutputValue)} BTC
                  </span>
                </div>
                <div className="summary-item">
                  <span>Fee:</span>
                  <span
                    className="value font-mono"
                    style={{ color: 'var(--color-warning)' }}
                  >
                    {formatBTC(unsignedTransaction.estimatedFee)} BTC
                  </span>
                </div>
                <div className="summary-item">
                  <span>Change:</span>
                  <span
                    className="value font-mono"
                    style={{ color: 'var(--color-success)' }}
                  >
                    {formatBTC(unsignedTransaction.changeAmount)} BTC
                  </span>
                </div>
              </div>
            </Card>
          </div>

          <Card
            title="UTXOs Used"
            icon="fas fa-list"
            variant="outlined"
            padding="md"
          >
            <div className="space-y-2 text-sm">
              {unsignedTransaction.utxosUsed.map((utxo, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-2 bg-gray-700 rounded"
                >
                  <div className="flex-1">
                    <div className="font-mono text-xs text-gray-400 truncate">
                      {utxo.txid}:{utxo.vout}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono">{formatBTC(utxo.value)} BTC</div>
                    <div className="text-xs text-gray-400">
                      {utxo.status.confirmed ? 'Confirmed' : 'Unconfirmed'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="btn-container">
            <Button
              type="button"
              onClick={onExportJSON}
              variant="secondary"
              icon="fas fa-file-code"
            >
              Export JSON
            </Button>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mt-4 p-3 bg-red-900 text-red-100 rounded-lg">
          <strong>QR Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
