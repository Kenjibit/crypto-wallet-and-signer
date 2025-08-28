import React, { useState } from 'react';
import {
  useDatabase,
  useDatabaseWallets,
  useDatabaseTransactions,
} from '../contexts/DatabaseContext';

export function DatabaseTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Use different hooks to test them
  const database = useDatabase();
  const wallets = useDatabaseWallets();
  const transactions = useDatabaseTransactions();

  const addTestResult = (result: string) => {
    setTestResults((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${result}`,
    ]);
  };

  const runDatabaseTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      addTestResult('🚀 Starting database tests...');

      // Test 1: Database initialization
      addTestResult('📊 Testing database initialization...');
      await database.databaseStatus.initialize();
      addTestResult('✅ Database initialized successfully');

      // Test 2: Database status
      addTestResult('📊 Testing database status...');
      await database.databaseStatus.checkStatus();
      const currentStatus = database.databaseStatus.status;
      addTestResult(
        `✅ Database status: Open=${currentStatus.isOpen}, Version=${currentStatus.version}`
      );

      // Test 3: Encryption test
      addTestResult('🔐 Testing encryption...');
      const encryptionTest = await database.testEncryption();
      addTestResult(
        `✅ Encryption test: ${encryptionTest ? 'PASSED' : 'FAILED'}`
      );

      // Test 4: Create test wallet
      addTestResult('💰 Testing wallet creation...');
      const testWallet = await database.createWallet(
        {
          name: 'Test Wallet',
          address: 'test123456789',
          publicKey: 'test-public-key',
          encryptedPrivateKey: 'test-private-key',
          derivationPath: "m/44'/2'/0'/0/0",
          network: 'testnet',
          cryptoType: 'LTC',
          isActive: true,
        },
        'pin',
        '123456'
      );
      addTestResult(`✅ Test wallet created with ID: ${testWallet.id}`);

      // Test 5: Create test transaction
      addTestResult('📝 Testing transaction creation...');
      const testTransaction = await database.createTransaction({
        walletId: testWallet.id!,
        txid: 'test-tx-123',
        amount: 0.001,
        confirmations: 0,
        timestamp: new Date(),
        type: 'receive',
        status: 'pending',
      });
      addTestResult(
        `✅ Test transaction created with ID: ${testTransaction.id}`
      );

      // Test 6: Search wallets
      addTestResult('🔍 Testing wallet search...');
      const searchResults = await database.searchWallets('Test');
      addTestResult(`✅ Wallet search found ${searchResults.length} results`);

      // Test 7: Get wallet transactions
      addTestResult('📊 Testing wallet transactions...');
      const walletTransactions = await database.getWalletTransactions(
        testWallet.id!
      );
      addTestResult(
        `✅ Found ${walletTransactions.length} transactions for wallet`
      );

      // Test 8: Update wallet
      addTestResult('✏️ Testing wallet update...');
      await database.updateWallet(testWallet.id!, {
        name: 'Updated Test Wallet',
      });
      addTestResult('✅ Wallet updated successfully');

      // Test 9: Export wallet data
      addTestResult('📤 Testing wallet export...');
      const exportedData = await database.exportWalletData(testWallet.id!);
      addTestResult(
        `✅ Wallet data exported: ${exportedData.transactions.length} transactions`
      );

      // Test 10: Clean up test data
      addTestResult('🧹 Cleaning up test data...');
      await database.deleteWallet(testWallet.id!);
      addTestResult('✅ Test wallet deleted successfully');

      addTestResult('🎉 All database tests completed successfully!');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      addTestResult(`❌ Test failed: ${errorMessage}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const testDatabaseConnection = async () => {
    try {
      addTestResult('🔌 Testing database connection...');
      await database.databaseStatus.initialize();
      await database.databaseStatus.checkStatus();
      const currentStatus = database.databaseStatus.status;
      addTestResult(
        `✅ Database connected: Open=${currentStatus.isOpen}, Version=${currentStatus.version}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      addTestResult(`❌ Database connection failed: ${errorMessage}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Database Test Component</h2>

      {/* Database Status */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Database Status</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Status:</strong>{' '}
            {database.databaseStatus.status.isInitialized
              ? '✅ Initialized'
              : '❌ Not Initialized'}
          </div>
          <div>
            <strong>Open:</strong>{' '}
            {database.databaseStatus.status.isOpen ? '✅ Yes' : '❌ No'}
          </div>
          <div>
            <strong>Version:</strong> {database.databaseStatus.status.version}
          </div>
          <div>
            <strong>Error:</strong>{' '}
            {database.databaseStatus.status.error || 'None'}
          </div>
        </div>
      </div>

      {/* Wallet Stats */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Wallet Statistics</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Total Wallets:</strong> {wallets.walletCount}
          </div>
          <div>
            <strong>Active Wallets:</strong> {wallets.activeWalletCount}
          </div>
          <div>
            <strong>Mainnet Wallets:</strong> {wallets.mainnetWalletCount}
          </div>
          <div>
            <strong>Testnet Wallets:</strong> {wallets.testnetWalletCount}
          </div>
        </div>
      </div>

      {/* Transaction Stats */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Transaction Statistics</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Total Transactions:</strong> {transactions.transactionCount}
          </div>
          <div>
            <strong>Pending:</strong> {transactions.pendingCount}
          </div>
          <div>
            <strong>Confirmed:</strong> {transactions.confirmedCount}
          </div>
        </div>
      </div>

      {/* Test Controls */}
      <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Test Controls</h3>
        <div className="flex gap-4">
          <button
            onClick={testDatabaseConnection}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Test Connection
          </button>
          <button
            onClick={runDatabaseTests}
            disabled={isRunning}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </button>
          <button
            onClick={clearTestResults}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear Results
          </button>
        </div>
      </div>

      {/* Test Results */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Test Results</h3>
        <div className="max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500">
              No test results yet. Run tests to see results.
            </p>
          ) : (
            <div className="space-y-1">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className="text-sm font-mono bg-white p-2 rounded border"
                >
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DatabaseTest;
