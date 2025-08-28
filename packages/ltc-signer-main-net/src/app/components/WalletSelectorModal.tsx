'use client';

import { useState, useCallback } from 'react';
import { Button, Status } from '@btc-wallet/ui';
import {
  Wallet,
  Plus,
  Upload,
  Search,
  Network,
  Calendar,
  Copy,
} from 'lucide-react';
import { useWalletDatabase } from '../hooks/useWalletDatabase';
import {
  ModalBase,
  ModalStep,
  ModalStepHeader,
  OptionSelector,
} from './modals';
import type { OptionItem } from './modals';
import { WalletCreationModal } from './WalletCreationModal';
import { WalletImportModal } from './WalletImportModal';

interface Wallet {
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

interface ImportedWalletData {
  id?: number;
  name?: string;
  address: string;
  publicKey?: string;
  encryptedPrivateKey?: string;
  encryptedMnemonic?: string;
  derivationPath?: string;
  network: string;
  cryptoType?: string;
  createdAt?: Date;
  updatedAt?: Date;
  isActive?: boolean;
}

interface WalletSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletSelect: (wallet: Wallet) => void;
  title?: string;
  description?: string;
  showCreateOption?: boolean;
  showImportOption?: boolean;
}

interface WalletOption extends OptionItem {
  wallet: Wallet;
  lastUsed?: Date;
}

export function WalletSelectorModal({
  isOpen,
  onClose,
  onWalletSelect,
  title = 'Select Wallet',
  description = 'Choose a wallet to use for this action',
  showCreateOption = true,
  showImportOption = true,
}: WalletSelectorModalProps) {
  const { wallets, loading, error } = useWalletDatabase();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [showWalletDetails, setShowWalletDetails] = useState(false);

  // Filter wallets based on search query
  const filteredWallets = wallets.filter(
    (wallet) =>
      wallet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wallet.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Convert wallets to option items
  const walletOptions: WalletOption[] = filteredWallets.map((wallet) => ({
    id: wallet.id?.toString() || 'unknown',
    title: wallet.name,
    description: `${wallet.network} • ${wallet.address.slice(
      0,
      8
    )}...${wallet.address.slice(-8)}`,
    icon: <Wallet size={24} />,
    wallet,
    lastUsed: wallet.updatedAt,
  }));

  // Create/Import options
  const actionOptions: OptionItem[] = [];

  if (showCreateOption) {
    actionOptions.push({
      id: 'create',
      title: 'Create New Wallet',
      description: 'Generate a new wallet with secure entropy',
      icon: <Plus size={24} />,
    });
  }

  if (showImportOption) {
    actionOptions.push({
      id: 'import',
      title: 'Import Wallet',
      description: 'Import existing wallet using mnemonic or private key',
      icon: <Upload size={24} />,
    });
  }

  const handleWalletSelect = useCallback(
    (optionId: string) => {
      if (optionId === 'create') {
        setShowCreateModal(true);
        return;
      }

      if (optionId === 'import') {
        setShowImportModal(true);
        return;
      }

      const selected = walletOptions.find((option) => option.id === optionId);
      if (selected) {
        setSelectedWallet(selected.wallet);
        setShowWalletDetails(true);
      }
    },
    [walletOptions]
  );

  const handleWalletConfirm = useCallback(() => {
    if (selectedWallet) {
      onWalletSelect(selectedWallet);
      onClose();
    }
  }, [selectedWallet, onWalletSelect, onClose]);

  const handleCreateSuccess = useCallback(
    (wallet: Wallet) => {
      setShowCreateModal(false);
      onWalletSelect(wallet);
      onClose();
    },
    [onWalletSelect, onClose]
  );

  const handleImportSuccess = useCallback(
    (wallet: ImportedWalletData) => {
      setShowImportModal(false);
      // Convert the imported wallet to the Wallet format expected by onWalletSelect
      const convertedWallet: Wallet = {
        id: wallet.id || Date.now(),
        name: wallet.name || 'Imported Wallet',
        address: wallet.address,
        publicKey: wallet.publicKey || '',
        encryptedPrivateKey: wallet.encryptedPrivateKey || '',
        encryptedMnemonic: wallet.encryptedMnemonic,
        derivationPath: wallet.derivationPath || "m/84'/2'/0'/0/0",
        network: wallet.network as 'mainnet' | 'testnet',
        cryptoType: wallet.cryptoType || 'LTC',
        createdAt: wallet.createdAt || new Date(),
        updatedAt: wallet.updatedAt || new Date(),
        isActive: wallet.isActive ?? true,
      };
      onWalletSelect(convertedWallet);
      onClose();
    },
    [onWalletSelect, onClose]
  );

  const handleBackFromDetails = useCallback(() => {
    setShowWalletDetails(false);
    setSelectedWallet(null);
  }, []);

  const handleCopyAddress = useCallback(async () => {
    if (selectedWallet?.address) {
      try {
        await navigator.clipboard.writeText(selectedWallet.address);
        // Could add a toast notification here
      } catch (error) {
        console.error('Failed to copy address:', error);
      }
    }
  }, [selectedWallet]);

  if (!isOpen) return null;

  return (
    <>
      <ModalBase
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        className="wallet-selector-modal"
        showBackButton={true}
        onBack={showWalletDetails ? handleBackFromDetails : onClose}
      >
        {!showWalletDetails && (
          <ModalStep>
            <ModalStepHeader title={title} description={description} />

            {/* Search Bar */}
            <div className="search-container">
              <div className="search-input-wrapper">
                <Search size={20} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search wallets by name or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {/* Wallet List */}
            {walletOptions.length > 0 && (
              <div className="wallets-section">
                <h4 className="section-title">Your Wallets</h4>
                <OptionSelector
                  options={walletOptions}
                  selectedId=""
                  onSelect={handleWalletSelect}
                  variant="vertical"
                />
              </div>
            )}

            {/* Action Options */}
            {actionOptions.length > 0 && (
              <div className="actions-section">
                <h4 className="section-title">Actions</h4>
                <OptionSelector
                  options={actionOptions}
                  selectedId=""
                  onSelect={handleWalletSelect}
                  variant="vertical"
                />
              </div>
            )}

            {/* Empty State */}
            {walletOptions.length === 0 && actionOptions.length === 0 && (
              <div className="empty-state">
                <Wallet size={64} className="empty-icon" />
                <h3>No Wallets Found</h3>
                <p>Create your first wallet to get started</p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  variant="primary"
                  className="create-first-wallet-btn"
                >
                  <Plus size={20} />
                  Create Wallet
                </Button>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading wallets...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="error-state">
                <Status message={error} type="error" />
              </div>
            )}
          </ModalStep>
        )}

        {/* Wallet Details View */}
        {showWalletDetails && selectedWallet && (
          <ModalStep variant="narrow">
            <ModalStepHeader
              title="Wallet Details"
              description="Review wallet information before proceeding"
            />

            <div className="wallet-details">
              <div className="detail-card">
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{selectedWallet.name}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Network:</span>
                  <span className="detail-value">
                    <Network size={16} />
                    {selectedWallet.network}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Address:</span>
                  <div className="address-container">
                    <span className="detail-value address">
                      {selectedWallet.address}
                    </span>
                    <Button
                      onClick={handleCopyAddress}
                      variant="ghost"
                      size="sm"
                      className="copy-btn"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Created:</span>
                  <span className="detail-value">
                    <Calendar size={16} />
                    {new Date(selectedWallet.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="wallet-actions">
                <Button
                  onClick={handleBackFromDetails}
                  variant="secondary"
                  className="back-btn"
                >
                  Back to Selection
                </Button>
                <Button
                  onClick={handleWalletConfirm}
                  variant="primary"
                  className="confirm-btn"
                >
                  <Wallet size={20} />
                  Use This Wallet
                </Button>
              </div>
            </div>
          </ModalStep>
        )}
      </ModalBase>

      {/* Create Wallet Modal */}
      <WalletCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateSuccess={handleCreateSuccess}
      />

      {/* Import Wallet Modal */}
      <WalletImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={handleImportSuccess}
      />
    </>
  );
}
