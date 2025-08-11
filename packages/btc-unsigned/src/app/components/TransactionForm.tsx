'use client';

import { useState, useEffect, useCallback } from 'react';
import { UTXO, FeeEstimate } from '../../types/bitcoin';
import {
  getFeeRates,
  estimateFee,
  TransactionFormData,
} from '../../lib/bitcoin';
import FeeSelector from './FeeSelector';
import { Button, Input } from '@btc-wallet/ui';
import { Coins } from 'lucide-react';

export default function TransactionForm({
  onCreateTransaction,
  onFetchUTXOs,
  balance,
  utxos,
}: {
  onCreateTransaction: (data: TransactionFormData) => void;
  onFetchUTXOs: (address: string) => void;
  balance: number;
  utxos: UTXO[];
}) {
  const [formData, setFormData] = useState<TransactionFormData>({
    fromAddress: 'tb1q338v7xrvh3lgsyywnxekts7mljd5mdmctx9u7l',
    toAddress: 'tb1qqupwljgnct7qcas4ukpgc9z2pelmrhsj07x5hk',
    amount: '0.0001',
    currency: 'btc',
    amountSummary: '0.00010000 BTC',
    feeSummary: '0.00010000 BTC',
    totalSummary: '0.00020000 BTC',
  });

  const [feeRate, setFeeRate] = useState('normal');
  const [feeRates, setFeeRates] = useState<FeeEstimate | null>(null);
  const [estimatedFee, setEstimatedFee] = useState<number | undefined>(
    undefined
  );
  const [isLoadingFees, setIsLoadingFees] = useState(false);
  const [isEstimatingFee, setIsEstimatingFee] = useState(false);

  // Load fee rates on component mount
  useEffect(() => {
    loadFeeRates();
  }, []);

  const loadFeeRates = async () => {
    try {
      setIsLoadingFees(true);
      const rates = await getFeeRates();
      setFeeRates(rates);
    } catch (error) {
      console.error('Failed to load fee rates:', error);
    } finally {
      setIsLoadingFees(false);
    }
  };

  const estimateTransactionFee = useCallback(async () => {
    try {
      setIsEstimatingFee(true);
      const amountValue = parseFloat(formData.amount) || 0;
      if (amountValue <= 0) return;

      // Use existing fee rates if available, otherwise fetch them
      let currentFeeRates = feeRates;
      if (!currentFeeRates) {
        currentFeeRates = await getFeeRates();
        setFeeRates(currentFeeRates);
      }

      const feeEstimate = await estimateFee(
        {
          ...formData,
          feeRate,
        },
        utxos,
        currentFeeRates
      );

      setEstimatedFee(feeEstimate.estimatedFee);
    } catch (error) {
      console.error('Failed to estimate fee:', error);
      setEstimatedFee(undefined);
    } finally {
      setIsEstimatingFee(false);
    }
  }, [formData, utxos, feeRate, feeRates]);

  // Estimate fee when form data changes
  useEffect(() => {
    if (
      utxos.length > 0 &&
      formData.amount &&
      formData.fromAddress &&
      formData.toAddress
    ) {
      estimateTransactionFee();
    }
  }, [formData, utxos, feeRate, estimateTransactionFee]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateTransaction({
      ...formData,
      feeRate,
    });
  };

  const updateSummary = useCallback(() => {
    const amountValue = parseFloat(formData.amount) || 0;
    let amountInBTC = amountValue;

    // Convert to BTC if needed (simplified conversion)
    if (formData.currency !== 'btc') {
      const conversionRate =
        formData.currency === 'usd' ? 1 / 30000 : 1 / 32000;
      amountInBTC = amountValue * conversionRate;
    }

    const feeBTC = estimatedFee ? estimatedFee / 100000000 : 0;
    const totalBTC = amountInBTC + feeBTC;

    setFormData((prev) => ({
      ...prev,
      amountSummary: `${amountInBTC.toFixed(8)} BTC`,
      feeSummary: `${feeBTC.toFixed(8)} BTC`,
      totalSummary: `${totalBTC.toFixed(8)} BTC`,
    }));
  }, [formData.amount, formData.currency, estimatedFee]);

  // Update summary when estimated fee changes
  useEffect(() => {
    updateSummary();
  }, [formData.amount, formData.currency, estimatedFee, updateSummary]);

  return (
    <form onSubmit={handleSubmit}>
      <div className="input-group">
        <div className="input-with-button">
          <Input
            label="From Address"
            icon="fas fa-wallet"
            type="text"
            id="fromAddress"
            name="fromAddress"
            value={formData.fromAddress}
            onChange={handleChange}
            placeholder="Your Bitcoin testnet address"
            size="md"
            variant="default"
            hideLabel={true}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              console.log('Fetch UTXOs button clicked');
              onFetchUTXOs(formData.fromAddress);
            }}
            icon="fas fa-sync-alt"
          >
            Fetch UTXOs
          </Button>
        </div>
        <div className="balance-display" id="balanceDisplay">
          <Coins size={16} strokeWidth={2.5} /> Balance:
          <span id="balanceValue"> {balance.toFixed(8)} </span> BTC
        </div>
      </div>

      <div className="input-group">
        <Input
          label="To Address"
          icon="fas fa-user"
          type="text"
          id="toAddress"
          name="toAddress"
          value={formData.toAddress}
          onChange={handleChange}
          placeholder="Recipient Bitcoin testnet address"
          size="md"
          variant="default"
        />
      </div>

      <div className="amount-container">
        <div className="input-group flex-1">
          <Input
            label="Amount"
            icon="fas fa-coins"
            type="number"
            id="amount"
            name="amount"
            min="0.00000001"
            step="0.00000001"
            value={formData.amount}
            onChange={handleChange}
            placeholder="0.00000000"
            size="md"
            variant="default"
          />
        </div>
      </div>

      {/* Fee Selector Component */}
      <FeeSelector
        selectedRate={feeRate}
        onRateChange={setFeeRate}
        feeRates={feeRates}
        estimatedFee={estimatedFee}
        isLoading={isLoadingFees || isEstimatingFee}
      />

      <div className="summary">
        <div className="summary-item">
          <div>Amount to send:</div>
          <div id="amountSummary">{formData.amountSummary}</div>
        </div>
        <div className="summary-item">
          <div>Transaction fee:</div>
          <div id="feeSummary">{formData.feeSummary}</div>
        </div>
        <div className="summary-item">
          <div>
            <strong>Total to deduct:</strong>
          </div>
          <div id="totalSummary">
            <strong>{formData.totalSummary}</strong>
          </div>
        </div>
      </div>

      <div className="btn-container">
        <Button
          type="submit"
          variant="primary"
          disabled={isLoadingFees || isEstimatingFee || !estimatedFee}
          icon="fas fa-file-invoice"
        >
          Create Transaction
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (confirm('Are you sure you want to reset all fields?')) {
              setFormData({
                fromAddress: 'tb1q338v7xrvh3lgsyywnxekts7mljd5mdmctx9u7l',
                toAddress: 'tb1qqupwljgnct7qcas4ukpgc9z2pelmrhsj07x5hk',
                amount: '0.0001',
                currency: 'btc',
                amountSummary: '0.00010000 BTC',
                feeSummary: '0.00010000 BTC',
                totalSummary: '0.00020000 BTC',
              });
              setFeeRate('normal');
              setEstimatedFee(undefined);
            }
          }}
          icon="fas fa-redo"
        >
          Reset
        </Button>
      </div>
    </form>
  );
}
