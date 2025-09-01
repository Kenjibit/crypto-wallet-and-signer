import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { walletDB } from '../libs/wallet-database';
import WalletDatabaseOperations from '../libs/wallet-database-operations';
import {
  Wallet,
  Transaction,
  EncryptionMetadata,
} from '../libs/wallet-database';
import { WalletEncryption } from '../libs/wallet-encryption';

// Database status hook
export function useDatabaseStatus() {
  const [status, setStatus] = useState<{
    isOpen: boolean;
    version: number;
    isInitialized: boolean;
    error: string | null;
  }>({
    isOpen: false,
    version: 0,
    isInitialized: false,
    error: null,
  });

  const checkStatus = useCallback(async () => {
    try {
      const dbStatus = await WalletDatabaseOperations.getDatabaseStatus();
      setStatus((prev) => ({
        ...prev,
        isOpen: dbStatus.isOpen,
        version: dbStatus.version,
        error: null,
      }));
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  const initialize = useCallback(async () => {
    try {
      await WalletDatabaseOperations.initializeDatabase();
      setStatus((prev) => ({
        ...prev,
        isInitialized: true,
        error: null,
      }));
      await checkStatus();
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [checkStatus]);

  const close = useCallback(async () => {
    try {
      await WalletDatabaseOperations.closeDatabase();
      setStatus((prev) => ({
        ...prev,
        isOpen: false,
        isInitialized: false,
      }));
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    status,
    initialize,
    close,
    checkStatus,
  };
}

// Wallets hook
export function useWallets() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbInitialized, setDbInitialized] = useState(false);

  // Initialize database on first use
  useEffect(() => {
    const initializeDatabase = async (retryCount = 0) => {
      try {
        await WalletDatabaseOperations.initializeDatabase();
        setDbInitialized(true);
        setError(null);
      } catch (err) {
        console.error(
          `Failed to initialize database (attempt ${retryCount + 1}):`,
          err
        );

        // Retry up to 3 times for transient errors
        if (
          retryCount < 3 &&
          err instanceof Error &&
          err.name === 'DatabaseClosedError'
        ) {
          console.log('Retrying database initialization...');
          setTimeout(
            () => initializeDatabase(retryCount + 1),
            1000 * (retryCount + 1)
          );
          return;
        }

        setError(
          err instanceof Error ? err.message : 'Database initialization failed'
        );
      }
    };

    if (!dbInitialized && !error) {
      initializeDatabase();
    }
  }, [dbInitialized, error]);

  // Live query for all wallets - only if database is initialized
  const wallets = useLiveQuery<Wallet[]>(
    () =>
      dbInitialized
        ? walletDB.wallets.toArray()
        : Promise.resolve([] as Wallet[]),
    [dbInitialized]
  );

  // Live query for active wallets - only if database is initialized
  const activeWallets = useLiveQuery<Wallet[]>(
    () =>
      dbInitialized
        ? walletDB.wallets.filter((wallet) => wallet.isActive).toArray()
        : Promise.resolve([] as Wallet[]),
    [dbInitialized]
  );

  // Live query for mainnet wallets - only if database is initialized
  const mainnetWallets = useLiveQuery<Wallet[]>(
    () =>
      dbInitialized
        ? walletDB.wallets
            .filter((wallet) => wallet.network === 'mainnet')
            .toArray()
        : Promise.resolve([] as Wallet[]),
    [dbInitialized]
  );

  // Live query for testnet wallets - only if database is initialized
  const testnetWallets = useLiveQuery<Wallet[]>(
    () =>
      dbInitialized
        ? walletDB.wallets
            .filter((wallet) => wallet.network === 'testnet')
            .toArray()
        : Promise.resolve([] as Wallet[]),
    [dbInitialized]
  );

  const createWallet = useCallback(
    async (
      walletData: Omit<Wallet, 'id' | 'createdAt' | 'updatedAt'>,
      encryptionMethod: 'pin' | 'passkey',
      secret: string | ArrayBuffer
    ): Promise<Wallet> => {
      setLoading(true);
      setError(null);

      try {
        const wallet = await WalletDatabaseOperations.createWallet(
          walletData,
          encryptionMethod,
          secret
        );
        setLoading(false);
        return wallet;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create wallet';
        setError(errorMessage);
        setLoading(false);
        throw err;
      }
    },
    []
  );

  const updateWallet = useCallback(
    async (
      id: number,
      updates: Partial<Omit<Wallet, 'id' | 'createdAt'>>
    ): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        await WalletDatabaseOperations.updateWallet(id, updates);
        setLoading(false);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update wallet';
        setError(errorMessage);
        setLoading(false);
        throw err;
      }
    },
    []
  );

  const deleteWallet = useCallback(async (id: number): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await WalletDatabaseOperations.deleteWallet(id);
      setLoading(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete wallet';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  }, []);

  const searchWallets = useCallback(
    async (query: string): Promise<Wallet[]> => {
      try {
        return await WalletDatabaseOperations.searchWalletsByName(query);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to search wallets';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  const getWalletById = useCallback(
    async (id: number): Promise<Wallet | undefined> => {
      try {
        return await WalletDatabaseOperations.getWallet(id);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to get wallet';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  const getWalletByAddress = useCallback(
    async (address: string): Promise<Wallet | undefined> => {
      try {
        return await WalletDatabaseOperations.getWalletByAddress(address);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to get wallet by address';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  // Computed values
  const walletCount = useMemo(() => wallets?.length || 0, [wallets]);
  const activeWalletCount = useMemo(
    () => activeWallets?.length || 0,
    [activeWallets]
  );
  const mainnetWalletCount = useMemo(
    () => mainnetWallets?.length || 0,
    [mainnetWallets]
  );
  const testnetWalletCount = useMemo(
    () => testnetWallets?.length || 0,
    [testnetWallets]
  );

  return {
    // Data
    wallets: wallets || [],
    activeWallets: activeWallets || [],
    mainnetWallets: mainnetWallets || [],
    testnetWallets: testnetWallets || [],

    // Counts
    walletCount,
    activeWalletCount,
    mainnetWalletCount,
    testnetWalletCount,

    // State
    loading,
    error,
    dbInitialized, // Export for combined status

    // Operations
    createWallet,
    updateWallet,
    deleteWallet,
    searchWallets,
    getWalletById,
    getWalletByAddress,
  };
}

// Transactions hook
export function useTransactions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbInitialized, setDbInitialized] = useState(false);

  // Initialize database on first use
  useEffect(() => {
    const initializeDatabase = async (retryCount = 0) => {
      try {
        await WalletDatabaseOperations.initializeDatabase();
        setDbInitialized(true);
        setError(null);
      } catch (err) {
        console.error(
          `Failed to initialize database (attempt ${retryCount + 1}):`,
          err
        );

        // Retry up to 3 times for transient errors
        if (
          retryCount < 3 &&
          err instanceof Error &&
          err.name === 'DatabaseClosedError'
        ) {
          console.log('Retrying database initialization...');
          setTimeout(
            () => initializeDatabase(retryCount + 1),
            1000 * (retryCount + 1)
          );
          return;
        }

        setError(
          err instanceof Error ? err.message : 'Database initialization failed'
        );
      }
    };

    if (!dbInitialized && !error) {
      initializeDatabase();
    }
  }, [dbInitialized, error]);

  // Live query for all transactions - only if database is initialized
  const transactions = useLiveQuery<Transaction[]>(
    () =>
      dbInitialized
        ? walletDB.transactions.toArray()
        : Promise.resolve([] as Transaction[]),
    [dbInitialized]
  );

  // Live query for pending transactions - only if database is initialized
  const pendingTransactions = useLiveQuery<Transaction[]>(
    () =>
      dbInitialized
        ? walletDB.transactions.where('status').equals('pending').toArray()
        : Promise.resolve([] as Transaction[]),
    [dbInitialized]
  );

  // Live query for confirmed transactions - only if database is initialized
  const confirmedTransactions = useLiveQuery<Transaction[]>(
    () =>
      dbInitialized
        ? walletDB.transactions.where('status').equals('confirmed').toArray()
        : Promise.resolve([] as Transaction[]),
    [dbInitialized]
  );

  const createTransaction = useCallback(
    async (transactionData: Omit<Transaction, 'id'>): Promise<Transaction> => {
      setLoading(true);
      setError(null);

      try {
        const transaction = await WalletDatabaseOperations.createTransaction(
          transactionData
        );
        setLoading(false);
        return transaction;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create transaction';
        setError(errorMessage);
        setLoading(false);
        throw err;
      }
    },
    []
  );

  const updateTransaction = useCallback(
    async (
      id: number,
      updates: Partial<Omit<Transaction, 'id'>>
    ): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        await WalletDatabaseOperations.updateTransaction(id, updates);
        setLoading(false);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update transaction';
        setError(errorMessage);
        setLoading(false);
        throw err;
      }
    },
    []
  );

  const deleteTransaction = useCallback(async (id: number): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await WalletDatabaseOperations.deleteTransaction(id);
      setLoading(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete transaction';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getWalletTransactions = useCallback(
    async (walletId: number): Promise<Transaction[]> => {
      try {
        return await WalletDatabaseOperations.getWalletTransactions(walletId);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to get wallet transactions';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  const getTransactionsByStatus = useCallback(
    async (status: Transaction['status']): Promise<Transaction[]> => {
      try {
        return await WalletDatabaseOperations.getTransactionsByStatus(status);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to get transactions by status';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  // Computed values
  const transactionCount = useMemo(
    () => transactions?.length || 0,
    [transactions]
  );
  const pendingCount = useMemo(
    () => pendingTransactions?.length || 0,
    [pendingTransactions]
  );
  const confirmedCount = useMemo(
    () => confirmedTransactions?.length || 0,
    [confirmedTransactions]
  );

  return {
    // Data
    transactions: transactions || [],
    pendingTransactions: pendingTransactions || [],
    confirmedTransactions: confirmedTransactions || [],

    // Counts
    transactionCount,
    pendingCount,
    confirmedCount,

    // State
    loading,
    error,
    dbInitialized, // Export for combined status

    // Operations
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getWalletTransactions,
    getTransactionsByStatus,
  };
}

// Combined database status that tracks all hooks
const useCombinedDatabaseStatus = () => {
  const databaseStatus = useDatabaseStatus();
  const walletsHook = useWallets();
  const transactionsHook = useTransactions();

  // Synchronize initialization state - database is initialized if any hook has initialized it
  const combinedInitialized = databaseStatus.status.isInitialized || walletsHook.dbInitialized || transactionsHook.dbInitialized;
  const combinedError = databaseStatus.status.error || walletsHook.error || transactionsHook.error;

  const combinedStatus = {
    ...databaseStatus.status,
    isInitialized: combinedInitialized,
    error: combinedError,
  };

  // Debug logging
  console.log('🔍 Combined Database Status:', {
    databaseStatusIsInitialized: databaseStatus.status.isInitialized,
    walletsHookDbInitialized: walletsHook.dbInitialized,
    transactionsHookDbInitialized: transactionsHook.dbInitialized,
    combinedInitialized,
    combinedError,
    timestamp: new Date().toISOString(),
  });

  return {
    ...databaseStatus,
    status: combinedStatus,
  };
};

// Main database hook that combines everything
export function useWalletDatabase(): {
  databaseStatus: {
    status: {
      isOpen: boolean;
      version: number;
      isInitialized: boolean;
      error: string | null;
    };
    initialize: () => Promise<void>;
    close: () => Promise<void>;
    checkStatus: () => Promise<void>;
  };
  wallets: Wallet[];
  activeWallets: Wallet[];
  mainnetWallets: Wallet[];
  testnetWallets: Wallet[];
  walletCount: number;
  activeWalletCount: number;
  mainnetWalletCount: number;
  testnetWalletCount: number;
  loading: boolean;
  error: string | null;
  createWallet: (
    walletData: Omit<Wallet, 'id' | 'createdAt' | 'updatedAt'>,
    encryptionMethod: 'pin' | 'passkey',
    secret: string | ArrayBuffer
  ) => Promise<Wallet>;
  updateWallet: (
    id: number,
    updates: Partial<Omit<Wallet, 'id' | 'createdAt'>>
  ) => Promise<void>;
  deleteWallet: (id: number) => Promise<void>;
  searchWallets: (query: string) => Promise<Wallet[]>;
  getWalletById: (id: number) => Promise<Wallet | undefined>;
  getWalletByAddress: (address: string) => Promise<Wallet | undefined>;
  transactions: Transaction[];
  pendingTransactions: Transaction[];
  confirmedTransactions: Transaction[];
  transactionCount: number;
  pendingCount: number;
  confirmedCount: number;
  createTransaction: (
    transactionData: Omit<Transaction, 'id'>
  ) => Promise<Transaction>;
  updateTransaction: (
    id: number,
    updates: Partial<Omit<Transaction, 'id'>>
  ) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  getWalletTransactions: (walletId: number) => Promise<Transaction[]>;
  getTransactionsByStatus: (
    status: Transaction['status']
  ) => Promise<Transaction[]>;
  clearAllData: () => Promise<void>;
  exportWalletData: (walletId: number) => Promise<{
    wallet: Wallet;
    transactions: Transaction[];
    encryptionMetadata: EncryptionMetadata | undefined;
  }>;
  importWalletData: (
    walletData: {
      wallet: Omit<Wallet, 'id' | 'createdAt' | 'updatedAt'>;
      transactions: Omit<Transaction, 'id' | 'walletId'>[];
      encryptionMetadata: Omit<EncryptionMetadata, 'id' | 'walletId'>;
    },
    encryptionMethod: 'pin' | 'passkey',
    secret: string | ArrayBuffer
  ) => Promise<Wallet>;
  testEncryption: () => Promise<boolean>;
} {
  const databaseStatus = useCombinedDatabaseStatus();
  const walletsHook = useWallets();
  const transactions = useTransactions();

  const clearAllData = useCallback(async (): Promise<void> => {
    try {
      await WalletDatabaseOperations.clearAllData();
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }, []);

  const exportWalletData = useCallback(async (walletId: number) => {
    try {
      return await WalletDatabaseOperations.exportWalletData(walletId);
    } catch (error) {
      console.error('Failed to export wallet data:', error);
      throw error;
    }
  }, []);

  const importWalletData = useCallback(
    async (
      walletData: {
        wallet: Omit<Wallet, 'id' | 'createdAt' | 'updatedAt'>;
        transactions: Omit<Transaction, 'id' | 'walletId'>[];
        encryptionMetadata: Omit<EncryptionMetadata, 'id' | 'walletId'>;
      },
      encryptionMethod: 'pin' | 'passkey',
      secret: string | ArrayBuffer
    ): Promise<Wallet> => {
      try {
        return await WalletDatabaseOperations.importWalletData(
          walletData,
          encryptionMethod,
          secret
        );
      } catch (error) {
        console.error('Failed to import wallet data:', error);
        throw error;
      }
    },
    []
  );

  const testEncryption = useCallback(async (): Promise<boolean> => {
    try {
      return await WalletEncryption.testEncryption();
    } catch (error) {
      console.error('Encryption test failed:', error);
      return false;
    }
  }, []);

  return {
    // Database status
    databaseStatus,

    // Wallets
    ...walletsHook,

    // Transactions
    ...transactions,

    // Utility operations
    clearAllData,
    exportWalletData,
    importWalletData,
    testEncryption,
  };
}

// Note: Individual hooks are available through the main useWalletDatabase hook
