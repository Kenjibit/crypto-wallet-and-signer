'use client';

import { useState, useCallback } from 'react';
import { Button, Status } from '@btc-wallet/ui';
import {
  Eye,
  EyeOff,
  Key,
  FileText,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Copy,
} from 'lucide-react';
import {
  createLTCWallet,
  createLTCWalletFromPrivateKey,
} from '../libs/ltc-wallet';
import { useAuth } from '../contexts/AuthContext';
import { useWalletDatabase } from '../hooks/useWalletDatabase';
import {
  ModalBase,
  ModalStep,
  ModalStepHeader,
  OptionSelector,
} from './modals';
import type { OptionItem } from './modals';
import { validateImportData } from '../utils/wallet-import-validation';

interface WalletImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (wallet: ImportedWallet) => void;
}

interface ImportedWallet {
  id?: number;
  name: string;
  address: string;
  publicKey: string;
  encryptedPrivateKey: string;
  encryptedMnemonic?: string;
  derivationPath: string;
  network: 'mainnet' | 'testnet';
  cryptoType: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  lastSync?: Date;
}

interface ImportData {
  type: 'mnemonic' | 'private-key';
  mnemonic?: string;
  privateKey?: string;
  passphrase?: string;
}

export function WalletImportModal({
  isOpen,
  onClose,
  onImportSuccess,
}: WalletImportModalProps) {
  const [step, setStep] = useState<'import-input' | 'name-input' | 'review'>(
    'import-input'
  );
  const [importType, setImportType] = useState<'mnemonic' | 'private-key'>(
    'mnemonic'
  );
  const [mnemonic, setMnemonic] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [walletName, setWalletName] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [importedWallet, setImportedWallet] = useState<ImportedWallet | null>(
    null
  );

  const { authState } = useAuth();
  const { createWallet } = useWalletDatabase();

  // Define import type options using our OptionItem interface
  const importOptions: OptionItem[] = [
    {
      id: 'mnemonic',
      title: 'Mnemonic Phrase',
      description: 'Import using 12, 15, 18, 21, or 24 word recovery phrase',
      icon: <FileText size={24} />,
    },
    {
      id: 'private-key',
      title: 'Private Key',
      description: 'Import using WIF format private key',
      icon: <Key size={24} />,
    },
  ];

  const validateInput = useCallback(
    (
      type: 'mnemonic' | 'private-key',
      value: string,
      passphrase?: string
    ): { isValid: boolean; errors: string[] } => {
      const importData = {
        type,
        [type === 'mnemonic' ? 'mnemonic' : 'privateKey']: value,
        passphrase: passphrase || undefined,
      };

      return validateImportData(importData);
    },
    []
  );

  const createWalletFromImport = useCallback(async (importData: ImportData) => {
    try {
      setStatus('Creating LTC wallet from import...');

      let walletResult;

      if (importData.type === 'mnemonic') {
        if (!importData.mnemonic) {
          throw new Error('Mnemonic is required');
        }

        walletResult = await createLTCWallet(
          importData.mnemonic,
          importData.passphrase || '',
          'p2wpkh', // Native SegWit for LTC
          'mainnet', // Litecoin mainnet
          { account: 0, change: 0, index: 0 }
        );
      } else {
        // Private key import
        if (!importData.privateKey) {
          throw new Error('Private key is required');
        }

        walletResult = createLTCWalletFromPrivateKey(
          importData.privateKey,
          'p2wpkh', // Native SegWit for LTC
          'mainnet' // Litecoin mainnet
        );
      }

      // Generate a default wallet name for fallback only
      const defaultName = `Imported LTC Wallet ${new Date().toLocaleDateString()}`;
      setWalletName('');

      const ltcWallet: ImportedWallet = {
        name: defaultName,
        address: walletResult.address,
        publicKey: walletResult.publicKeyHex || '',
        encryptedPrivateKey: walletResult.wif, // This will be encrypted later
        encryptedMnemonic: importData.mnemonic, // This will be encrypted later
        derivationPath: walletResult.path,
        network: 'mainnet',
        cryptoType: 'LTC',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      setImportedWallet(ltcWallet);
      setStatus('Wallet imported successfully! Enter a name for your wallet.');
      setStep('name-input');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to import wallet. Please try again.';
      setError(errorMessage);
      setStatus('');
    } finally {
      setIsImporting(false);
    }
  }, []);

  const handleImport = useCallback(async () => {
    try {
      setIsImporting(true);
      setError('');
      setStatus('');

      let validationResult;
      let importData: ImportData;

      if (importType === 'mnemonic') {
        validationResult = validateInput(
          'mnemonic',
          mnemonic,
          passphrase.trim() || undefined
        );

        if (!validationResult.isValid) {
          setError(validationResult.errors.join(', '));
          return;
        }

        importData = {
          type: 'mnemonic',
          mnemonic: mnemonic.trim(),
          passphrase: passphrase.trim() || undefined,
        };
      } else {
        validationResult = validateInput('private-key', privateKey);

        if (!validationResult.isValid) {
          setError(validationResult.errors.join(', '));
          return;
        }

        importData = {
          type: 'private-key',
          privateKey: privateKey.trim(),
        };
      }

      await createWalletFromImport(importData);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to import wallet. Please try again.';
      setError(errorMessage);
    } finally {
      setIsImporting(false);
    }
  }, [
    importType,
    mnemonic,
    privateKey,
    passphrase,
    validateInput,
    createWalletFromImport,
  ]);

  const handleBack = useCallback(() => {
    if (step === 'name-input') {
      setStep('import-input');
    } else if (step === 'review') {
      setStep('name-input');
    } else {
      onClose();
    }
  }, [step, onClose]);

  const handleNameSubmit = useCallback(async () => {
    if (!importedWallet) return;

    try {
      setStatus('Saving wallet to database...');

      // Update the wallet name (use default if empty)
      const finalName =
        walletName.trim() ||
        `Imported LTC Wallet ${new Date().toLocaleDateString()}`;

      // Update the imported wallet with the final name
      const walletWithName = { ...importedWallet, name: finalName };
      setImportedWallet(walletWithName);

      // Create wallet data for database
      const walletData = {
        name: finalName,
        address: walletWithName.address,
        publicKey: walletWithName.publicKey,
        encryptedPrivateKey: walletWithName.encryptedPrivateKey,
        encryptedMnemonic: walletWithName.encryptedMnemonic,
        derivationPath: walletWithName.derivationPath,
        network: walletWithName.network,
        cryptoType: walletWithName.cryptoType,
        isActive: true,
      };

      // Save to database
      const savedWallet = await createWallet(
        walletData,
        authState.method || 'pin',
        authState.method === 'passkey' ? new ArrayBuffer(0) : '0000' // Placeholder for PIN
      );

      setStatus('Wallet saved successfully!');

      // Update the imported wallet with the database ID
      const walletWithId = { ...walletWithName, id: savedWallet.id };
      setImportedWallet(walletWithId);

      // Go to review step
      setStep('review');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to save wallet: ${errorMessage}. Please try again.`);
      setStatus('');
    }
  }, [walletName, importedWallet, createWallet, authState.method]);

  const handleScanToSign = useCallback(() => {
    if (importedWallet) {
      onImportSuccess(importedWallet);
      onClose();
    }
  }, [importedWallet, onImportSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Import LTC Wallet"
      className="wallet-import-modal"
      showBackButton={true}
      onBack={step === 'import-input' ? onClose : handleBack}
    >
      {step === 'import-input' && (
        <ModalStep>
          <ModalStepHeader
            title="Choose Import Method"
            description="Select how you want to import your existing wallet"
          />

          <OptionSelector
            options={importOptions}
            selectedId={importType}
            onSelect={(type) =>
              setImportType(type as 'mnemonic' | 'private-key')
            }
            variant="grid"
          />

          <div className="import-input-section">
            {importType === 'mnemonic' ? (
              <div className="mnemonic-input">
                <label htmlFor="mnemonic" className="input-label">
                  Mnemonic Phrase
                </label>
                <textarea
                  id="mnemonic"
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  placeholder="Enter your 12, 15, 18, 21, or 24 word mnemonic phrase"
                  className="mnemonic-textarea"
                  rows={4}
                />
                <p className="input-helper">
                  Enter the words separated by spaces
                </p>

                <label htmlFor="passphrase" className="input-label">
                  Passphrase (optional)
                </label>
                <input
                  id="passphrase"
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="BIP39 passphrase if you set one"
                  className="passphrase-input-field"
                />
                <p className="input-helper">
                  Leave empty if you don&apos;t use a passphrase
                </p>
              </div>
            ) : (
              <div className="private-key-input">
                <label htmlFor="private-key" className="input-label">
                  Private Key
                </label>
                <div className="input-wrapper">
                  <input
                    id="private-key"
                    type={showPrivateKey ? 'text' : 'password'}
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="Enter your WIF format private key"
                    className="private-key-input-field"
                  />
                  <button
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="toggle-button"
                  >
                    {showPrivateKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="input-helper">Your private key in WIF format</p>
              </div>
            )}
          </div>

          <div className="import-actions">
            <button
              onClick={handleImport}
              className="import-button"
              disabled={isImporting || (!mnemonic.trim() && !privateKey.trim())}
            >
              <ArrowRight size={24} className="icon-left" />
              <div className="button-content">
                <h4>
                  {isImporting
                    ? 'Importing...'
                    : importType === 'mnemonic'
                    ? 'Import from Recovery Phrase'
                    : 'Import from Private Key'}
                </h4>
                <p>
                  {isImporting
                    ? 'Processing your wallet data...'
                    : importType === 'mnemonic'
                    ? 'Import your wallet using recovery phrase'
                    : 'Import your wallet using private key'}
                </p>
              </div>
              <ArrowLeft size={20} className="icon-right" />
            </button>
          </div>

          {status && (
            <div className="import-status">
              <Status message={status} type="success" />
            </div>
          )}

          {error && (
            <div className="import-error">
              <Status message={error} type="error" />
            </div>
          )}
        </ModalStep>
      )}

      {step === 'name-input' && importedWallet && (
        <ModalStep variant="narrow">
          <ModalStepHeader
            title="Name Your Imported Wallet"
            description="Give your imported wallet a memorable name to help you identify it later"
          />

          <div className="name-input-container">
            <div className="input-group">
              <label htmlFor="wallet-name" className="input-label">
                Wallet Name
              </label>
              <input
                id="wallet-name"
                type="text"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="Enter a name for your wallet"
                className="name-input-field"
                autoFocus
              />
              <p className="input-helper">
                Leave empty to use the default name: {importedWallet.name}
              </p>
            </div>

            <div className="name-actions">
              <Button
                onClick={handleNameSubmit}
                variant="primary"
                className="name-submit-btn"
                disabled={isImporting}
              >
                Continue
              </Button>
            </div>
          </div>
        </ModalStep>
      )}

      {step === 'review' && importedWallet && (
        <ModalStep>
          <div className="wallet-summary">
            <h3>Wallet Imported Successfully!</h3>

            <div className="wallet-info-summary">
              <div className="info-row">
                <span className="info-label">Name:</span>
                <span className="info-value">{importedWallet.name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Import Method:</span>
                <span className="info-value">
                  {importType === 'mnemonic'
                    ? 'Recovery Phrase'
                    : 'Private Key'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Crypto Type:</span>
                <span className="info-value">{importedWallet.cryptoType}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Network:</span>
                <span className="info-value">{importedWallet.network}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Imported:</span>
                <span className="info-value">
                  {importedWallet.createdAt.toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Only show mnemonic for private key imports, not mnemonic imports */}
            {importedWallet.encryptedMnemonic &&
              importType === 'private-key' && (
                <div className="mnemonic-section">
                  <div className="section-header">
                    <h4>Your Recovery Phrase</h4>
                    <button
                      onClick={() => setShowMnemonic(!showMnemonic)}
                      className="toggle-button"
                    >
                      {showMnemonic ? <EyeOff size={16} /> : <Eye size={16} />}
                      {showMnemonic ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  <div className="mnemonic-display">
                    {showMnemonic ? (
                      <div className="mnemonic-words">
                        {importedWallet.encryptedMnemonic
                          .split(' ')
                          .map((word, index) => (
                            <span key={index} className="word">
                              {index + 1}. {word}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <div className="mnemonic-hidden">
                        •••• •••• •••• •••• •••• •••• •••• •••• •••• •••• ••••
                        ••••
                      </div>
                    )}
                  </div>

                  <p className="mnemonic-warning">
                    <AlertCircle size={16} />
                    Write down these words and store them securely offline.
                    Never share them with anyone.
                  </p>
                </div>
              )}

            <div className="address-section">
              <h4>Your Litecoin Address</h4>
              <div className="address-display">
                <code>{importedWallet.address}</code>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(importedWallet.address)
                  }
                  className="copy-button"
                >
                  <Copy size={16} />
                  Copy
                </button>
              </div>
            </div>

            {passphrase && (
              <div className="passphrase-section">
                <h4>Passphrase</h4>
                <p>You&apos;ve set a passphrase for additional security.</p>
              </div>
            )}
          </div>

          <div className="review-actions-single">
            <Button
              onClick={handleScanToSign}
              variant="primary"
              className="scan-to-sign-button"
            >
              Scan to Sign
            </Button>
          </div>
        </ModalStep>
      )}
    </ModalBase>
  );
}
