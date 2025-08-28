import Dexie, { Table } from 'dexie';

// Wallet interface
export interface Wallet {
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

// Transaction interface
export interface Transaction {
  id?: number;
  walletId: number;
  txid: string;
  amount: number;
  confirmations: number;
  blockHeight?: number;
  timestamp: Date;
  type: 'send' | 'receive' | 'internal';
  fee?: number;
  status: 'pending' | 'confirmed' | 'failed';
  rawTx?: string;
}

// Encryption metadata interface
export interface EncryptionMetadata {
  id?: number;
  walletId: number;
  algorithm: string;
  keyDerivation: string;
  salt: string;
  iterations: number;
  createdAt: Date;
}

// Database class extending Dexie
export class WalletDatabase extends Dexie {
  wallets!: Table<Wallet>;
  transactions!: Table<Transaction>;
  encryptionMetadata!: Table<EncryptionMetadata>;

  constructor() {
    super('WalletDatabase');

    // Define database schema
    this.version(1).stores({
      wallets: '++id, name, address, network, isActive, createdAt',
      transactions: '++id, walletId, txid, timestamp, status, type',
      encryptionMetadata: '++id, walletId, algorithm, createdAt',
    });

    // Add indexes for better query performance
    this.version(2).stores({
      wallets: '++id, name, address, network, isActive, createdAt, updatedAt',
      transactions:
        '++id, walletId, txid, timestamp, status, type, blockHeight',
      encryptionMetadata: '++id, walletId, algorithm, createdAt',
    });

    // Add cryptoType field
    this.version(3).stores({
      wallets:
        '++id, name, address, network, cryptoType, isActive, createdAt, updatedAt',
      transactions:
        '++id, walletId, txid, timestamp, status, type, blockHeight',
      encryptionMetadata: '++id, walletId, algorithm, createdAt',
    });
  }

  // Initialize database
  async initialize(): Promise<void> {
    try {
      await this.open();
      console.log('✅ Wallet database initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize wallet database:', error);
      throw error;
    }
  }

  // Close database
  async close(): Promise<void> {
    try {
      await super.close();
      console.log('✅ Wallet database closed successfully');
    } catch (error) {
      console.error('❌ Failed to close wallet database:', error);
      throw error;
    }
  }

  // Get database status
  async getStatus(): Promise<{ isOpen: boolean; version: number }> {
    try {
      const isOpen = this.isOpen();
      const version = this.verno;
      return { isOpen, version };
    } catch (error) {
      console.error('❌ Failed to get database status:', error);
      return { isOpen: false, version: 0 };
    }
  }

  // Clear all data (for testing/reset purposes)
  async clearAll(): Promise<void> {
    try {
      await this.transaction(
        'rw',
        [this.wallets, this.transactions, this.encryptionMetadata],
        async () => {
          await this.wallets.clear();
          await this.transactions.clear();
          await this.encryptionMetadata.clear();
        }
      );
      console.log('✅ All database data cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear database data:', error);
      throw error;
    }
  }
}

// Create and export database instance
export const walletDB = new WalletDatabase();

// Types are already exported above
