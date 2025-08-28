import {
  walletDB,
  Wallet,
  Transaction,
  EncryptionMetadata,
} from './wallet-database';
import { WalletEncryption } from './wallet-encryption';

export class WalletDatabaseOperations {
  /**
   * Initialize the database
   */
  static async initializeDatabase(): Promise<void> {
    try {
      await walletDB.initialize();
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Close the database
   */
  static async closeDatabase(): Promise<void> {
    try {
      await walletDB.close();
    } catch (error) {
      console.error('❌ Failed to close database:', error);
      throw error;
    }
  }

  /**
   * Get database status
   */
  static async getDatabaseStatus(): Promise<{
    isOpen: boolean;
    version: number;
  }> {
    return await walletDB.getStatus();
  }

  // ===== WALLET OPERATIONS =====

  /**
   * Create a new wallet
   */
  static async createWallet(
    walletData: Omit<Wallet, 'id' | 'createdAt' | 'updatedAt'>,
    encryptionMethod: 'pin' | 'passkey',
    secret: string | ArrayBuffer
  ): Promise<Wallet> {
    try {
      // Encrypt sensitive data
      let encryptedPrivateKey: string;
      let encryptedMnemonic: string | undefined;

      if (encryptionMethod === 'pin') {
        const pin = secret as string;
        const encrypted = await WalletEncryption.encryptWithPIN(
          walletData.encryptedPrivateKey,
          pin,
          0 // Temporary ID, will be updated after wallet creation
        );
        encryptedPrivateKey = encrypted.encryptedData;

        if (walletData.encryptedMnemonic) {
          const encryptedMnemonicResult = await WalletEncryption.encryptWithPIN(
            walletData.encryptedMnemonic,
            pin,
            0
          );
          encryptedMnemonic = encryptedMnemonicResult.encryptedData;
        }
      } else {
        const signature = secret as ArrayBuffer;
        const encrypted = await WalletEncryption.encryptWithPasskey(
          walletData.encryptedPrivateKey,
          signature,
          0
        );
        encryptedPrivateKey = encrypted.encryptedData;

        if (walletData.encryptedMnemonic) {
          const encryptedMnemonicResult =
            await WalletEncryption.encryptWithPasskey(
              walletData.encryptedMnemonic,
              signature,
              0
            );
          encryptedMnemonic = encryptedMnemonicResult.encryptedData;
        }
      }

      // Create wallet record
      const wallet: Omit<Wallet, 'id'> = {
        ...walletData,
        encryptedPrivateKey,
        encryptedMnemonic,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const walletId = await walletDB.wallets.add(wallet);

      // Update encryption metadata with correct wallet ID
      if (encryptionMethod === 'pin') {
        await walletDB.encryptionMetadata
          .where('walletId')
          .equals(0)
          .modify({ walletId });
      }

      const createdWallet = await walletDB.wallets.get(walletId);
      if (!createdWallet) {
        throw new Error('Failed to retrieve created wallet');
      }

      console.log(`✅ Wallet created successfully with ID: ${walletId}`);
      return createdWallet;
    } catch (error) {
      console.error('❌ Failed to create wallet:', error);
      throw error;
    }
  }

  /**
   * Get wallet by ID
   */
  static async getWallet(id: number): Promise<Wallet | undefined> {
    try {
      return await walletDB.wallets.get(id);
    } catch (error) {
      console.error(`❌ Failed to get wallet ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get wallet by address
   */
  static async getWalletByAddress(
    address: string
  ): Promise<Wallet | undefined> {
    try {
      return await walletDB.wallets.where('address').equals(address).first();
    } catch (error) {
      console.error(`❌ Failed to get wallet by address ${address}:`, error);
      throw error;
    }
  }

  /**
   * Get all wallets
   */
  static async getAllWallets(): Promise<Wallet[]> {
    try {
      return await walletDB.wallets.toArray();
    } catch (error) {
      console.error('❌ Failed to get all wallets:', error);
      throw error;
    }
  }

  /**
   * Get active wallets
   */
  static async getActiveWallets(): Promise<Wallet[]> {
    try {
      return await walletDB.wallets
        .filter((wallet) => wallet.isActive)
        .toArray();
    } catch (error) {
      console.error('❌ Failed to get active wallets:', error);
      throw error;
    }
  }

  /**
   * Get wallets by network
   */
  static async getWalletsByNetwork(
    network: 'mainnet' | 'testnet'
  ): Promise<Wallet[]> {
    try {
      return await walletDB.wallets
        .filter((wallet) => wallet.network === network)
        .toArray();
    } catch (error) {
      console.error(`❌ Failed to get wallets by network ${network}:`, error);
      throw error;
    }
  }

  /**
   * Search wallets by name
   */
  static async searchWalletsByName(query: string): Promise<Wallet[]> {
    try {
      return await walletDB.wallets
        .filter((wallet) =>
          wallet.name.toLowerCase().includes(query.toLowerCase())
        )
        .toArray();
    } catch (error) {
      console.error(`❌ Failed to search wallets by name ${query}:`, error);
      throw error;
    }
  }

  /**
   * Update wallet
   */
  static async updateWallet(
    id: number,
    updates: Partial<Omit<Wallet, 'id' | 'createdAt'>>
  ): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      await walletDB.wallets.update(id, updateData);
      console.log(`✅ Wallet ${id} updated successfully`);
    } catch (error) {
      console.error(`❌ Failed to update wallet ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete wallet
   */
  static async deleteWallet(id: number): Promise<void> {
    try {
      // Delete related records first
      await walletDB.transactions.where('walletId').equals(id).delete();

      await walletDB.encryptionMetadata.where('walletId').equals(id).delete();

      // Delete wallet
      await walletDB.wallets.delete(id);
      console.log(`✅ Wallet ${id} deleted successfully`);
    } catch (error) {
      console.error(`❌ Failed to delete wallet ${id}:`, error);
      throw error;
    }
  }

  // ===== TRANSACTION OPERATIONS =====

  /**
   * Create a new transaction
   */
  static async createTransaction(
    transactionData: Omit<Transaction, 'id'>
  ): Promise<Transaction> {
    try {
      const transaction: Omit<Transaction, 'id'> = {
        ...transactionData,
        timestamp: new Date(),
      };

      const transactionId = await walletDB.transactions.add(transaction);
      const createdTransaction = await walletDB.transactions.get(transactionId);

      if (!createdTransaction) {
        throw new Error('Failed to retrieve created transaction');
      }

      console.log(
        `✅ Transaction created successfully with ID: ${transactionId}`
      );
      return createdTransaction;
    } catch (error) {
      console.error('❌ Failed to create transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  static async getTransaction(id: number): Promise<Transaction | undefined> {
    try {
      return await walletDB.transactions.get(id);
    } catch (error) {
      console.error(`❌ Failed to get transaction ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get transactions for a wallet
   */
  static async getWalletTransactions(walletId: number): Promise<Transaction[]> {
    try {
      return await walletDB.transactions
        .where('walletId')
        .equals(walletId)
        .reverse()
        .sortBy('timestamp');
    } catch (error) {
      console.error(
        `❌ Failed to get transactions for wallet ${walletId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get transactions by status
   */
  static async getTransactionsByStatus(
    status: Transaction['status']
  ): Promise<Transaction[]> {
    try {
      return await walletDB.transactions
        .where('status')
        .equals(status)
        .reverse()
        .sortBy('timestamp');
    } catch (error) {
      console.error(
        `❌ Failed to get transactions by status ${status}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Update transaction
   */
  static async updateTransaction(
    id: number,
    updates: Partial<Omit<Transaction, 'id'>>
  ): Promise<void> {
    try {
      await walletDB.transactions.update(id, updates);
      console.log(`✅ Transaction ${id} updated successfully`);
    } catch (error) {
      console.error(`❌ Failed to update transaction ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete transaction
   */
  static async deleteTransaction(id: number): Promise<void> {
    try {
      await walletDB.transactions.delete(id);
      console.log(`✅ Transaction ${id} deleted successfully`);
    } catch (error) {
      console.error(`❌ Failed to delete transaction ${id}:`, error);
      throw error;
    }
  }

  // ===== UTILITY OPERATIONS =====

  /**
   * Get wallet count
   */
  static async getWalletCount(): Promise<number> {
    try {
      return await walletDB.wallets.count();
    } catch (error) {
      console.error('❌ Failed to get wallet count:', error);
      throw error;
    }
  }

  /**
   * Get transaction count
   */
  static async getTransactionCount(): Promise<number> {
    try {
      return await walletDB.transactions.count();
    } catch (error) {
      console.error('❌ Failed to get transaction count:', error);
      throw error;
    }
  }

  /**
   * Clear all data (for testing/reset purposes)
   */
  static async clearAllData(): Promise<void> {
    try {
      await walletDB.clearAll();
      console.log('✅ All database data cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear all data:', error);
      throw error;
    }
  }

  /**
   * Export wallet data (for backup purposes)
   */
  static async exportWalletData(walletId: number): Promise<{
    wallet: Wallet;
    transactions: Transaction[];
    encryptionMetadata: EncryptionMetadata | undefined;
  }> {
    try {
      const wallet = await this.getWallet(walletId);
      if (!wallet) {
        throw new Error(`Wallet ${walletId} not found`);
      }

      const transactions = await this.getWalletTransactions(walletId);
      const encryptionMetadata = await walletDB.encryptionMetadata
        .where('walletId')
        .equals(walletId)
        .first();

      return {
        wallet,
        transactions,
        encryptionMetadata,
      };
    } catch (error) {
      console.error(
        `❌ Failed to export wallet data for wallet ${walletId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Import wallet data (for restore purposes)
   */
  static async importWalletData(
    walletData: {
      wallet: Omit<Wallet, 'id' | 'createdAt' | 'updatedAt'>;
      transactions: Omit<Transaction, 'id' | 'walletId'>[];
      encryptionMetadata: Omit<EncryptionMetadata, 'id' | 'walletId'>;
    },
    encryptionMethod: 'pin' | 'passkey',
    secret: string | ArrayBuffer
  ): Promise<Wallet> {
    try {
      // Create wallet first
      const wallet = await this.createWallet(
        walletData.wallet,
        encryptionMethod,
        secret
      );

      // Import transactions
      for (const transaction of walletData.transactions) {
        await this.createTransaction({
          ...transaction,
          walletId: wallet.id!,
        });
      }

      // Import encryption metadata
      await walletDB.encryptionMetadata.add({
        ...walletData.encryptionMetadata,
        walletId: wallet.id!,
        createdAt: new Date(),
      });

      console.log(
        `✅ Wallet data imported successfully for wallet ${wallet.id}`
      );
      return wallet;
    } catch (error) {
      console.error('❌ Failed to import wallet data:', error);
      throw error;
    }
  }
}

// Export the operations class
export default WalletDatabaseOperations;
