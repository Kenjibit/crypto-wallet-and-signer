'use client';

import { useState, useCallback } from 'react';
import { Button, Status } from '@btc-wallet/ui';
import { Wallet as WalletIcon } from 'lucide-react';
import { Wallet } from '../libs/wallet-database';
import { Plus, Upload, Search } from 'lucide-react';
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
    icon: <WalletIcon size={24} />,
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

      // Directly select wallet and proceed
      const selected = walletOptions.find((option) => option.id === optionId);
      if (selected) {
        onWalletSelect(selected.wallet);
        // Don't call onClose() here - let the parent component handle modal closing
        // The parent will close the modal through the onWalletSelect callback
      }
    },
    [walletOptions, onWalletSelect]
  );

  const handleCreateSuccess = useCallback(
    (wallet: Wallet) => {
      setShowCreateModal(false);
      onWalletSelect(wallet);
      // Don't call onClose() here - let the parent component handle modal closing
    },
    [onWalletSelect]
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
      // Don't call onClose() here - let the parent component handle modal closing
    },
    [onWalletSelect]
  );

  if (!isOpen) return null;

  return (
    <>
      <ModalBase
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        className="wallet-selector-modal"
      >
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
              <WalletIcon size={64} className="empty-icon" />
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
