'use client';

import { useState, useEffect } from 'react';
import {
  MainContainer,
  Card,
  Button,
  Status,
  QRScannerModal,
} from '@btc-wallet/ui';
import { OfflineIndicator, InstallPrompt } from '@btc-wallet/my-pwa';
import {
  WalletImportModal,
  WalletCreationModal,
  SigningFlow,
  AuthSetupModal,
  HelperModal,
  AuthVerificationModal,
  WalletSelectorModal,
} from './components';
// TestControlPanel import removed for production
import { useAuth } from './contexts/AuthContext';
import { QrCode, Upload, Plus, ArrowLeft, Wallet } from 'lucide-react';

type AppMode = 'main' | 'scan' | 'scan-qr' | 'import' | 'create' | 'signing';

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

interface ImportedWallet {
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

export default function LTCMainPage() {
  const { authState, sessionAuthenticated } = useAuth();
  const [currentMode, setCurrentMode] = useState<AppMode>('main');
  const [scannedData, setScannedData] = useState<string>('');
  const [importedWallet, setImportedWallet] = useState<Wallet | null>(null);
  const [createdWallet, setCreatedWallet] = useState<Wallet | null>(null);
  const [status, setStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);

  // Authentication modals
  const [showAuthSetup, setShowAuthSetup] = useState(false);
  const [showAuthVerification, setShowAuthVerification] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [justCompletedAuthSetup, setJustCompletedAuthSetup] = useState(false);
  const [helperInfo, setHelperInfo] = useState<{
    show: boolean;
    title: string;
    content: string;
  }>({ show: false, title: '', content: '' });

  // Monitor auth state changes in main page
  useEffect(() => {
    console.log('🔍 Main page: Auth state changed:', {
      status: authState.status,
      method: authState.method,
      hasCredentialId: !!authState.credentialId,
      sessionAuthenticated,
      timestamp: new Date().toISOString(),
    });

    // Check localStorage state for debugging
    if (typeof window !== 'undefined') {
      try {
        const savedAuth = localStorage.getItem('ltc-signer-auth');
        console.log(
          '🔍 Main page: localStorage auth state:',
          savedAuth ? JSON.parse(savedAuth) : null
        );
      } catch (error) {
        console.error('🔍 Main page: Failed to read localStorage:', error);
      }
    }
  }, [authState, sessionAuthenticated]);

  const handleBackToMain = () => {
    setCurrentMode('main');
    setScannedData('');
    setImportedWallet(null);
    setCreatedWallet(null);
  };

  const handleScanSuccess = (data: string) => {
    setScannedData(data);
    setCurrentMode('signing');
  };

  const handleImportSuccess = (wallet: ImportedWallet) => {
    // Convert ImportedWallet to Wallet format for internal use
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
    setImportedWallet(convertedWallet);
    setCurrentMode('signing');
  };

  const handleCreateSuccess = (wallet: Wallet) => {
    setCreatedWallet(wallet);
    setCurrentMode('signing');
  };

  const handleHelperClick = (
    title: string,
    content: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setHelperInfo({ show: true, title, content });
  };

  // Authentication handlers
  const requireAuth = (action: () => void) => {
    console.log('🔐 requireAuth called:', {
      justCompletedAuthSetup,
      authState: {
        status: authState.status,
        method: authState.method,
        hasCredentialId: !!authState.credentialId,
      },
      sessionAuthenticated,
      timestamp: new Date().toISOString(),
    });

    // If user just completed auth setup, execute action directly
    if (justCompletedAuthSetup) {
      console.log('🔐 Executing action directly due to justCompletedAuthSetup');
      setJustCompletedAuthSetup(false); // Reset the flag
      action();
      return;
    }

    // Check if there's existing authentication in localStorage
    let hasExistingAuth = false;
    if (typeof window !== 'undefined') {
      try {
        const savedAuth = localStorage.getItem('ltc-signer-auth');
        console.log(
          '🔐 requireAuth: localStorage auth state:',
          savedAuth ? JSON.parse(savedAuth) : null
        );
        if (savedAuth) {
          const parsedAuth = JSON.parse(savedAuth);
          hasExistingAuth =
            parsedAuth &&
            parsedAuth.method &&
            (parsedAuth.status === 'authenticated' || parsedAuth.credentialId);
          console.log('🔐 requireAuth: hasExistingAuth:', hasExistingAuth, {
            parsedAuth,
            hasMethod: !!parsedAuth.method,
            hasStatus: !!parsedAuth.status,
            hasCredentialId: !!parsedAuth.credentialId,
          });
        }
      } catch (error) {
        console.error('Failed to check localStorage auth state:', error);
      }
    }

    // If user is authenticated with passkey AND has authenticated in this session, execute action directly
    if (
      authState.status === 'authenticated' &&
      authState.method === 'passkey' &&
      sessionAuthenticated
    ) {
      action();
      return;
    }

    // If user is authenticated with PIN AND has authenticated in this session, require PIN verification for each action
    if (
      authState.status === 'authenticated' &&
      authState.method === 'pin' &&
      sessionAuthenticated
    ) {
      setPendingAction(() => action);
      setShowAuthVerification(true);
      return;
    }

    // If user has stored credentials but hasn't authenticated in this session, show verification
    if (authState.status === 'authenticated' && !sessionAuthenticated) {
      setPendingAction(() => action);
      setShowAuthVerification(true);
      return;
    }

    // If user has existing auth in localStorage but current authState is not authenticated,
    // show verification instead of auth setup
    if (hasExistingAuth && authState.status !== 'authenticated') {
      console.log(
        '🔐 requireAuth: Showing auth verification due to existing auth in localStorage'
      );
      setPendingAction(() => action);
      setShowAuthVerification(true);
      return;
    }

    // If user is unauthenticated and has no existing auth, show auth setup
    if (authState.status === 'unauthenticated' && !hasExistingAuth) {
      console.log('🔐 requireAuth: Showing auth setup due to no existing auth');
      setPendingAction(() => action);
      setShowAuthSetup(true);
      return;
    }

    // Fallback: show auth verification
    console.log('🔐 requireAuth: Fallback - showing auth verification');
    setPendingAction(() => action);
    setShowAuthVerification(true);
  };

  const handleAuthSetupComplete = () => {
    console.log('✅ handleAuthSetupComplete called');
    console.log('✅ Current authState in main page:', authState);
    console.log('✅ authState.status in main page:', authState.status);
    console.log('✅ authState.method in main page:', authState.method);
    console.log('✅ Setting justCompletedAuthSetup to true');

    setShowAuthSetup(false);

    // After passkey setup, user is automatically authenticated
    // Set flag to bypass additional verification
    setJustCompletedAuthSetup(true);

    if (pendingAction) {
      console.log('✅ Executing pending action directly');
      console.log('✅ About to call pendingAction, authState is:', authState);

      // Additional safeguard: Ensure auth state is consistent
      if (
        authState.status === 'authenticated' ||
        authState.method === 'passkey' ||
        authState.method === 'pin'
      ) {
        console.log('✅ Auth state validated, proceeding with action');
        // Execute the action directly - no need for additional verification
        pendingAction();
        setPendingAction(null);
      } else {
        console.warn('⚠️ Auth state inconsistent, waiting for state update');
        // Wait a bit more for state to stabilize
        setTimeout(() => {
          console.log('✅ Retrying pending action after delay');
          pendingAction();
          setPendingAction(null);
        }, 100);
      }
    } else {
      console.log('✅ No pending action to execute');
    }
  };

  const handleAuthVerificationSuccess = () => {
    setShowAuthVerification(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const renderMainScreen = () => (
    <div className="main-screen">
      <div className="main-content">
        <div className="action-buttons">
          <div
            className="action-card scan-card clickable"
            onClick={() => requireAuth(() => setCurrentMode('scan'))}
            role="button"
            tabIndex={0}
            aria-label="Scan to Sign - Scan a PSBT QR code to sign Bitcoin transactions"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                requireAuth(() => setCurrentMode('scan'));
              }
            }}
          >
            <Card className="card-content-wrapper">
              <div className="card-content">
                <div className="card-icon" aria-hidden="true">
                  <QrCode size={48} />
                </div>
                <h3>Scan to Sign</h3>
              </div>
              <button
                className="helper-icon"
                onClick={(e) =>
                  handleHelperClick(
                    'PSBT Signing',
                    'Scan a Partially Signed Bitcoin Transaction (PSBT) QR code from your wallet or transaction builder. This allows you to sign transactions offline for enhanced security.',
                    e
                  )
                }
                aria-label="Get help about PSBT signing"
                type="button"
                tabIndex={0}
              >
                ?
              </button>
            </Card>
          </div>

          <div
            className="action-card import-card clickable"
            onClick={() => requireAuth(() => setCurrentMode('import'))}
            role="button"
            tabIndex={0}
            aria-label="Import Wallet - Import an existing wallet using your recovery phrase"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                requireAuth(() => setCurrentMode('import'));
              }
            }}
          >
            <Card className="card-content-wrapper">
              <div className="card-content">
                <div className="card-icon" aria-hidden="true">
                  <Upload size={48} />
                </div>
                <h3>Import Wallet</h3>
              </div>
              <button
                className="helper-icon"
                onClick={(e) =>
                  handleHelperClick(
                    'Wallet Import',
                    "Import an existing wallet using your 12 or 24-word recovery phrase (mnemonic) or private key. This allows you to manage wallets you've created elsewhere.",
                    e
                  )
                }
                aria-label="Get help about wallet import"
                type="button"
                tabIndex={0}
              >
                ?
              </button>
            </Card>
          </div>

          <div
            className="action-card create-card clickable"
            onClick={() => {
              requireAuth(() => {
                setCurrentMode('create');
              });
            }}
            role="button"
            tabIndex={0}
            aria-label="Create Wallet - Create a new wallet with secure random generation"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                requireAuth(() => {
                  setCurrentMode('create');
                });
              }
            }}
          >
            <Card className="card-content-wrapper">
              <div className="card-content">
                <div className="card-icon" aria-hidden="true">
                  <Plus size={48} />
                </div>
                <h3>Create Wallet</h3>
              </div>
              <button
                className="helper-icon"
                onClick={(e) =>
                  handleHelperClick(
                    'Wallet Creation',
                    'Create a new wallet with cryptographically secure random generation. The system combines camera, microphone, and OS entropy sources to ensure maximum security for your private keys.',
                    e
                  )
                }
                aria-label="Get help about wallet creation"
                type="button"
                tabIndex={0}
              >
                ?
              </button>
            </Card>
          </div>
        </div>
      </div>

      {/* Helper Modal */}
      <HelperModal
        isOpen={helperInfo.show}
        title={helperInfo.title}
        content={helperInfo.content}
        onClose={() => setHelperInfo({ show: false, title: '', content: '' })}
      />
    </div>
  );

  const renderScanScreen = () => (
    <div className="scan-screen">
      <div className="screen-header">
        <Button
          onClick={handleBackToMain}
          variant="ghost"
          className="back-button"
        >
          <ArrowLeft size={20} />
          Back
        </Button>
        <h2>Select Wallet for Signing</h2>
      </div>

      <WalletSelectorModal
        isOpen={true}
        onClose={handleBackToMain}
        onWalletSelect={() => {
          // After wallet selection, proceed to QR scanning
          setCurrentMode('scan-qr');
        }}
        title="Select Wallet for Signing"
        description="Choose a wallet to use for signing this transaction"
        showCreateOption={false}
        showImportOption={false}
      />
    </div>
  );

  const renderScanQRScreen = () => (
    <div className="scan-screen">
      <div className="screen-header">
        <Button
          onClick={() => setCurrentMode('scan')}
          variant="ghost"
          className="back-button"
        >
          <ArrowLeft size={20} />
          Back to Wallet Selection
        </Button>
        <h2>Scan PSBT</h2>
      </div>

      <div className="scan-content">
        <Card title="Scan PSBT QR Code" className="scan-card">
          <div className="scan-instructions">
            <p>Point your camera at the PSBT QR code to begin signing</p>
          </div>
          <QRScannerModal
            isOpen={true}
            onClose={() => setCurrentMode('scan')}
            onScanResult={handleScanSuccess}
          />
        </Card>
      </div>
    </div>
  );

  const renderImportScreen = () => (
    <div className="scan-screen">
      <div className="screen-header">
        <Button
          onClick={handleBackToMain}
          variant="ghost"
          className="back-button"
        >
          <ArrowLeft size={20} />
          Back
        </Button>
        <h2>Import Wallet</h2>
      </div>

      <WalletImportModal
        isOpen={true}
        onClose={handleBackToMain}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );

  const renderCreateScreen = () => (
    <div className="scan-screen">
      <div className="screen-header">
        <Button
          onClick={handleBackToMain}
          variant="ghost"
          className="back-button"
        >
          <ArrowLeft size={20} />
          Back
        </Button>
        <h2>Create Wallet</h2>
      </div>

      <WalletCreationModal
        isOpen={true}
        onClose={handleBackToMain}
        onCreateSuccess={handleCreateSuccess}
      />
    </div>
  );

  const renderSigningScreen = () => (
    <div className="scan-screen">
      <div className="screen-header">
        <Button
          onClick={handleBackToMain}
          variant="ghost"
          className="back-button"
        >
          <ArrowLeft size={20} />
          Back
        </Button>
        <h2>Sign Transaction</h2>
      </div>

      <SigningFlow
        scannedData={scannedData}
        importedWallet={importedWallet}
        createdWallet={createdWallet}
        onBack={handleBackToMain}
      />
    </div>
  );

  const renderCurrentMode = () => {
    switch (currentMode) {
      case 'scan':
        return renderScanScreen();
      case 'scan-qr':
        return renderScanQRScreen();
      case 'import':
        return renderImportScreen();
      case 'create':
        return renderCreateScreen();
      case 'signing':
        return renderSigningScreen();
      default:
        return renderMainScreen();
    }
  };

  return (
    <>
      <MainContainer>
        <OfflineIndicator />

        {renderCurrentMode()}

        {status && (
          <Status
            message={status.message}
            type={status.type}
            onDismiss={() => setStatus(null)}
          />
        )}

        <InstallPrompt />

        {/* Test Control Panel removed for production */}
      </MainContainer>

      {/* Authentication Modals */}
      <AuthSetupModal
        isOpen={showAuthSetup}
        onComplete={handleAuthSetupComplete}
        onClose={() => setShowAuthSetup(false)}
      />

      <AuthVerificationModal
        isOpen={showAuthVerification}
        onSuccess={handleAuthVerificationSuccess}
        onClose={() => setShowAuthVerification(false)}
        title="Authentication Required"
        message="Please authenticate to continue with this action"
      />
    </>
  );
}
