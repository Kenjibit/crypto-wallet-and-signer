'use client';

import { useState, useEffect } from 'react';
import {
  MainContainer,
  Header,
  Card,
  Button,
  Status,
  QRScannerModal,
} from '@btc-wallet/ui';
import { OfflineIndicator, InstallPrompt } from '@btc-wallet/my-pwa';
import { WalletImportModal } from './components/WalletImportModal';
import { WalletCreationModal } from './components/WalletCreationModal';
import { SigningFlow } from './components/SigningFlow';
import { AuthSetupModal } from './components/AuthSetupModal';
import { AuthVerificationModal } from './components/AuthVerificationModal';
// TestControlPanel import removed for production
import { useAuth } from './contexts/AuthContext';
import {
  QrCode,
  Upload,
  Plus,
  ArrowLeft,
  Camera,
  Wallet,
  Shield,
} from 'lucide-react';

type AppMode = 'main' | 'scan' | 'import' | 'create' | 'signing';

export default function LTCMainPage() {
  const { authState, sessionAuthenticated } = useAuth();
  const [currentMode, setCurrentMode] = useState<AppMode>('main');
  const [scannedData, setScannedData] = useState<string>('');
  const [importedWallet, setImportedWallet] = useState<any>(null);
  const [createdWallet, setCreatedWallet] = useState<any>(null);
  const [status, setStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);

  // Authentication modals
  const [showAuthSetup, setShowAuthSetup] = useState(false);
  const [showAuthVerification, setShowAuthVerification] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [justCompletedAuthSetup, setJustCompletedAuthSetup] = useState(false);

  // Monitor auth state changes in main page
  useEffect(() => {
    // Auth state monitoring for debugging purposes
  }, [authState]);

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

  const handleImportSuccess = (wallet: any) => {
    setImportedWallet(wallet);
    setCurrentMode('signing');
  };

  const handleCreateSuccess = (wallet: any) => {
    setCreatedWallet(wallet);
    setCurrentMode('signing');
  };

  // Authentication handlers
  const requireAuth = (action: () => void) => {
    // If user just completed auth setup, execute action directly
    if (justCompletedAuthSetup) {
      setJustCompletedAuthSetup(false); // Reset the flag
      action();
      return;
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

    // If user is unauthenticated, show auth setup
    if (authState.status === 'unauthenticated') {
      setPendingAction(() => action);
      setShowAuthSetup(true);
      return;
    }

    // Fallback: show auth verification
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
          >
            <Card className="card-content-wrapper">
              <div className="card-content">
                <div className="card-icon">
                  <QrCode size={48} />
                </div>
                <h3>Scan to Sign</h3>
                <p>Scan a PSBT QR code to sign transactions</p>
              </div>
            </Card>
          </div>

          <div
            className="action-card import-card clickable"
            onClick={() => requireAuth(() => setCurrentMode('import'))}
          >
            <Card className="card-content-wrapper">
              <div className="card-content">
                <div className="card-icon">
                  <Upload size={48} />
                </div>
                <h3>Import Wallet</h3>
                <p>Import existing wallet from mnemonic or private key</p>
              </div>
            </Card>
          </div>

          <div
            className="action-card create-card clickable"
            onClick={() => {
              requireAuth(() => {
                setCurrentMode('create');
              });
            }}
          >
            <Card className="card-content-wrapper">
              <div className="card-content">
                <div className="card-icon">
                  <Plus size={48} />
                </div>
                <h3>Create Wallet</h3>
                <p>Generate a new wallet with enhanced entropy</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
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
        <h2>Scan PSBT</h2>
      </div>

      <div className="scan-content">
        <Card title="Scan PSBT QR Code" className="scan-card">
          <div className="scan-instructions">
            <p>Point your camera at the PSBT QR code to begin signing</p>
          </div>
          <QRScannerModal
            isOpen={true}
            onClose={handleBackToMain}
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
