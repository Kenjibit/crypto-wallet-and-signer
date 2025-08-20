'use client';

import { useState } from 'react';
import { Card, Button, Input, TextArea, Status } from '@btc-wallet/ui';
import { Upload, Eye, EyeOff, Key, FileText } from 'lucide-react';

interface WalletImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (wallet: any) => void;
}

export function WalletImportModal({ isOpen, onClose, onImportSuccess }: WalletImportModalProps) {
  const [importType, setImportType] = useState<'mnemonic' | 'private-key'>('mnemonic');
  const [mnemonic, setMnemonic] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string>('');

  const handleImport = async () => {
    try {
      setIsImporting(true);
      setError('');

      if (importType === 'mnemonic' && !mnemonic.trim()) {
        setError('Please enter a valid mnemonic phrase');
        return;
      }

      if (importType === 'private-key' && !privateKey.trim()) {
        setError('Please enter a valid private key');
        return;
      }

      // Simulate wallet import - in real implementation, you would validate and derive the wallet
      const mockWallet = {
        type: importType,
        address: 'mock-ltc-address-for-testing',
        network: 'mainnet',
        imported: true
      };

      onImportSuccess(mockWallet);
    } catch (err) {
      setError('Failed to import wallet. Please check your input.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setMnemonic('');
    setPrivateKey('');
    setPassphrase('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="wallet-import-modal">
      <Card title="Import Wallet" className="import-card">
        <div className="import-content">
          <div className="import-type-selector">
            <Button
              variant={importType === 'mnemonic' ? 'primary' : 'secondary'}
              onClick={() => setImportType('mnemonic')}
              className="type-button"
            >
              <FileText size={20} />
              Mnemonic Phrase
            </Button>
            <Button
              variant={importType === 'private-key' ? 'primary' : 'secondary'}
              onClick={() => setImportType('private-key')}
              className="type-button"
            >
              <Key size={20} />
              Private Key
            </Button>
          </div>

          {importType === 'mnemonic' ? (
            <div className="mnemonic-input">
              <TextArea
                label="Mnemonic Phrase"
                placeholder="Enter your 12, 15, 18, 21, or 24 word mnemonic phrase"
                value={mnemonic}
                onChange={(e) => setMnemonic(e.target.value)}
                rows={4}
                helperText="Enter the words separated by spaces"
              />
              <Input
                label="Passphrase (optional)"
                placeholder="BIP39 passphrase if you set one"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                type="password"
                helperText="Leave empty if you don't use a passphrase"
              />
            </div>
          ) : (
            <div className="private-key-input">
              <div className="input-wrapper">
                <Input
                  label="Private Key"
                  placeholder="Enter your WIF format private key"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  type={showPrivateKey ? 'text' : 'password'}
                  helperText="Your private key in WIF format"
                />
                <button
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="toggle-button"
                >
                  {showPrivateKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="import-error">
              <Status message={error} type="error" />
            </div>
          )}

          <div className="import-actions">
            <Button onClick={handleReset} variant="ghost">
              Reset
            </Button>
            <Button onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              loading={isImporting}
              variant="primary"
              disabled={!mnemonic.trim() && !privateKey.trim()}
            >
              <Upload size={20} />
              Import Wallet
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

