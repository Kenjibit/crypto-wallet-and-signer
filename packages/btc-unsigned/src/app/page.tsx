'use client';

import { useState } from 'react';
import { Header, MainContainer, Card, Status } from '@btc-wallet/ui';
import TransactionForm from './components/TransactionForm';
import TransactionOutput from './components/TransactionOutput';
import TransactionDetails from './components/TransactionDetails';
import { BroadcastModal } from './components/BroadcastModal';
import { InstallPrompt, OfflineIndicator } from '@btc-wallet/my-pwa';
import { UTXO, UnsignedTransaction } from '../types/bitcoin';
import { SignatureData } from '../lib/broadcast';
import {
  fetchUTXOs,
  generateTransaction,
  TransactionFormData,
} from '../lib/bitcoin';

export default function Home() {
  const [utxos, setUtxos] = useState<UTXO[]>([]);
  const [balance, setBalance] = useState(0);
  const [unsignedTransaction, setUnsignedTransaction] =
    useState<UnsignedTransaction | null>(null);
  const [status, setStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  const handleFetchUTXOs = async (address: string) => {
    console.log('Fetch UTXOs clicked for address:', address);
    try {
      setStatus({ message: 'Fetching UTXOs...', type: 'warning' });
      console.log(
        'Making fetch request to:',
        `https://blockstream.info/testnet/api/address/${address}/utxo`
      );
      const utxos = await fetchUTXOs(address);
      console.log('UTXOs received:', utxos);
      setUtxos(utxos);

      // Calculate balance
      const totalBalance =
        utxos.reduce((sum, utxo) => sum + utxo.value, 0) / 100000000;
      setBalance(totalBalance);

      setStatus({
        message: `Fetched ${
          utxos.length
        } UTXOs with balance: ${totalBalance.toFixed(8)} BTC`,
        type: 'success',
      });
    } catch (error) {
      console.error('Fetch UTXOs error:', error);
      setStatus({
        message:
          error instanceof Error ? error.message : 'Failed to fetch UTXOs',
        type: 'error',
      });
    }
  };

  const handleCreateTransaction = async (formData: TransactionFormData) => {
    try {
      setStatus({ message: 'Creating transaction...', type: 'warning' });
      const transaction = await generateTransaction(formData, utxos);
      setUnsignedTransaction(transaction);
      setStatus({
        message: 'Transaction created successfully!',
        type: 'success',
      });
    } catch (error) {
      setStatus({
        message:
          error instanceof Error
            ? error.message
            : 'Transaction creation failed',
        type: 'error',
      });
    }
  };

  const handleCopyPSBT = () => {
    if (unsignedTransaction) {
      navigator.clipboard.writeText(unsignedTransaction.psbt);
      setStatus({ message: 'PSBT copied to clipboard!', type: 'success' });
    }
  };

  const handleExportJSON = () => {
    if (unsignedTransaction) {
      const jsonData = JSON.stringify(unsignedTransaction, null, 2);
      navigator.clipboard.writeText(jsonData);
      setStatus({
        message: 'Transaction JSON copied to clipboard!',
        type: 'success',
      });
    }
  };

  const handleBroadcast = async (signatures: SignatureData[]) => {
    if (!unsignedTransaction) {
      setStatus({
        message: 'No transaction to broadcast',
        type: 'error',
      });
      return;
    }

    try {
      setStatus({ message: 'Broadcasting transaction...', type: 'warning' });

      const response = await fetch('/api/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          psbt: unsignedTransaction.psbt,
          signatures,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus({
          message: `Transaction broadcast successfully! TXID: ${
            result.broadcastResult?.txid || 'Unknown'
          }`,
          type: 'success',
        });
      } else {
        setStatus({
          message: `Broadcast failed: ${result.message}`,
          type: 'error',
        });
      }
    } catch (error) {
      setStatus({
        message: `Broadcast error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        type: 'error',
      });
    }
  };

  return (
    <MainContainer>
      <OfflineIndicator />
      <Header appType="creator" />

      <Card title="Transaction Details" icon="fas fa-money-bill-wave">
        <TransactionForm
          onCreateTransaction={handleCreateTransaction}
          onFetchUTXOs={handleFetchUTXOs}
          balance={balance}
          utxos={utxos}
        />
      </Card>

      <Card title="Generated Transaction" icon="fas fa-file-code">
        <TransactionOutput
          unsignedTransaction={unsignedTransaction}
          onCopyPSBT={handleCopyPSBT}
          onExportJSON={handleExportJSON}
          onBroadcast={handleBroadcast}
          onOpenBroadcastModal={() => setShowBroadcastModal(true)}
        />
      </Card>

      <TransactionDetails />

      <div className="footer">
        <p>
          This tool creates valid Bitcoin transactions with proper UTXO
          references
        </p>
        <p>
          All processing happens in your browser - no data is sent to any server
        </p>
      </div>

      {status && (
        <Status
          message={status.message}
          type={status.type}
          onDismiss={() => setStatus(null)}
        />
      )}

      {/* Broadcast Modal at root level */}
      {unsignedTransaction && (
        <BroadcastModal
          psbt={unsignedTransaction.psbt}
          isOpen={showBroadcastModal}
          onClose={() => setShowBroadcastModal(false)}
          onBroadcast={handleBroadcast}
        />
      )}

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </MainContainer>
  );
}
