import React, { createContext, useContext, ReactNode } from 'react';
import { useWalletDatabase } from '../hooks/useWalletDatabase';

// Create the database context
const DatabaseContext = createContext<ReturnType<
  typeof useWalletDatabase
> | null>(null);

// Database provider component
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const database = useWalletDatabase();

  return (
    <DatabaseContext.Provider value={database}>
      {children}
    </DatabaseContext.Provider>
  );
}

// Hook to use the database context
export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}

// Hook to use only wallet operations
export function useDatabaseWallets() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error(
      'useDatabaseWallets must be used within a DatabaseProvider'
    );
  }

  return {
    wallets: context.wallets,
    activeWallets: context.activeWallets,
    mainnetWallets: context.mainnetWallets,
    testnetWallets: context.testnetWallets,
    walletCount: context.walletCount,
    activeWalletCount: context.activeWalletCount,
    mainnetWalletCount: context.mainnetWalletCount,
    testnetWalletCount: context.testnetWalletCount,
    loading: context.loading,
    error: context.error,
    createWallet: context.createWallet,
    updateWallet: context.updateWallet,
    deleteWallet: context.deleteWallet,
    searchWallets: context.searchWallets,
    getWalletById: context.getWalletById,
    getWalletByAddress: context.getWalletByAddress,
  };
}

// Hook to use only transaction operations
export function useDatabaseTransactions() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error(
      'useDatabaseTransactions must be used within a DatabaseProvider'
    );
  }

  return {
    transactions: context.transactions,
    pendingTransactions: context.pendingTransactions,
    confirmedTransactions: context.confirmedTransactions,
    transactionCount: context.transactionCount,
    pendingCount: context.pendingCount,
    confirmedCount: context.confirmedCount,
    loading: context.loading,
    error: context.error,
    createTransaction: context.createTransaction,
    updateTransaction: context.updateTransaction,
    deleteTransaction: context.deleteTransaction,
    getWalletTransactions: context.getWalletTransactions,
    getTransactionsByStatus: context.getTransactionsByStatus,
  };
}

// Hook to use only database status and management
export function useDatabaseManagement() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error(
      'useDatabaseManagement must be used within a DatabaseProvider'
    );
  }

  return {
    databaseStatus: context.databaseStatus,
    clearAllData: context.clearAllData,
    exportWalletData: context.exportWalletData,
    importWalletData: context.importWalletData,
    testEncryption: context.testEncryption,
  };
}

// Export the context for direct access if needed
export { DatabaseContext };

