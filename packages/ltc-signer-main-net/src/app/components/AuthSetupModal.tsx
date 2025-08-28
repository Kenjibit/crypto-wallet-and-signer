import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@btc-wallet/ui';
import { Fingerprint, Smartphone, Shield } from 'lucide-react';
import { useAuth, AuthMethod } from '../contexts/AuthContext';
import { useEffect } from 'react';
import {
  ModalBase,
  ModalStep,
  ModalStepHeader,
  OptionSelector,
  NumericKeypad,
} from './modals';
import type { OptionItem } from './modals';

interface AuthSetupModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onClose: () => void;
}

export const AuthSetupModal: React.FC<AuthSetupModalProps> = ({
  isOpen,
  onComplete,
  onClose,
}) => {
  const { authState, createPasskey, setPinCode } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<AuthMethod | null>(null);
  const [step, setStep] = useState<
    'choose' | 'pin-enter' | 'pin-confirm' | 'confirm'
  >('choose');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  // Use ref to track current auth state for polling
  const currentAuthState = useRef(authState);
  currentAuthState.current = authState;

  // Memoize the handlePinSetupDirect function
  const handlePinSetupDirect = useCallback(async () => {
    try {
      await setPinCode(pin, confirmPin);
      setStep('confirm');
    } catch {
      setError('Failed to set PIN code. Please try again.');
    }
  }, [pin, confirmPin, setPinCode]);

  // Watch for when confirmation PIN is complete to auto-verify
  useEffect(() => {
    if (step === 'pin-confirm' && confirmPin.length === 4) {
      if (pin === confirmPin) {
        // PINs match, proceed to setup
        handlePinSetupDirect();
      } else {
        setError('PIN codes do not match');
        setConfirmPin('');
      }
    }
  }, [confirmPin, pin, step, handlePinSetupDirect]);

  // Monitor auth state changes in the modal
  useEffect(() => {
    console.log('🔍 AuthSetupModal: Auth state changed in modal:', authState);

    // Auto-advance to confirm step when authentication succeeds
    if (
      authState.status === 'authenticated' &&
      step === 'choose' &&
      selectedMethod === 'passkey'
    ) {
      console.log(
        '🔍 AuthSetupModal: Auto-advancing to confirm step due to auth state change'
      );
      setStep('confirm');
    }
  }, [authState, step, selectedMethod]);

  // Monitor when auth state becomes authenticated
  useEffect(() => {
    if (authState.status === 'authenticated') {
      console.log(
        '🔍 AuthSetupModal: Auth state is now authenticated in modal!'
      );
    }
  }, [authState.status]);

  if (!isOpen) return null;

  // Define authentication options using the OptionItem interface
  const authOptions: OptionItem[] = [
    ...(authState.isPasskeySupported
      ? [
          {
            id: 'passkey',
            title: 'Passkey (Recommended)',
            description:
              'Use Face ID, Touch ID, or fingerprint for secure authentication',
            icon: <Fingerprint size={24} />,
          },
        ]
      : []),
    {
      id: 'pin',
      title: 'PIN Code',
      description: 'Create a 4-digit PIN code for quick wallet access',
      icon: <Smartphone size={24} />,
    },
  ];

  const handleMethodSelect = (method: string) => {
    const authMethod = method as AuthMethod;
    setSelectedMethod(authMethod);
    if (authMethod === 'passkey') {
      // Go directly to passkey creation, no intermediate step
      handlePasskeySetup();
    } else {
      setStep('pin-enter');
    }
    setError('');
  };

  const handlePasskeySetup = async () => {
    // Auto-generate a username for wallet app (user doesn't need to remember it)
    const autoUsername = `ltc-wallet-${Date.now()}`;

    console.log(
      '📱 AuthSetupModal: Starting passkey setup with username:',
      autoUsername
    );
    console.log(
      '📱 AuthSetupModal: Auth state before createPasskey:',
      authState
    );

    const success = await createPasskey(autoUsername, 'LTC Wallet User');

    console.log('📱 AuthSetupModal: createPasskey returned:', success);

    if (success) {
      // Passkey created successfully
      // The useEffect will automatically advance to confirm step when auth state updates
      console.log('📱 AuthSetupModal: Passkey creation returned success');
      console.log(
        '📱 AuthSetupModal: Waiting for auth state to update via useEffect...'
      );
    } else {
      console.log('📱 AuthSetupModal: Passkey creation failed');
      setError('Failed to create passkey. Please try again.');
    }
  };

  const handleBack = () => {
    if (step === 'pin-enter' || step === 'pin-confirm') {
      setStep('choose');
      setPin('');
      setConfirmPin('');
      setError('');
    } else if (step === 'confirm') {
      setStep('choose');
      setSelectedMethod(null);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  // Smart back button behavior
  const handleBackButton = () => {
    if (step === 'choose') {
      onClose();
    } else {
      handleBack();
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Setup Authentication"
      className="auth-setup-modal"
      showBackButton={true}
      onBack={handleBackButton}
    >
      {step === 'choose' && (
        <ModalStep variant="narrow">
          <ModalStepHeader
            title="Choose Authentication Method"
            description="Select how you want to secure your wallet. Passkey is recommended for modern devices."
          />

          <OptionSelector
            options={authOptions}
            selectedId={selectedMethod || undefined}
            onSelect={handleMethodSelect}
            variant="vertical"
          />

          <div className="passkey-notice">
            <Shield size={20} />
            <span>
              Passkey provides the highest security and convenience. PIN codes
              are stored locally on your device.
            </span>
          </div>
        </ModalStep>
      )}

      {step === 'pin-enter' && (
        <ModalStep variant="narrow">
          <ModalStepHeader
            title="Setup PIN Code"
            description="Create a 4-digit PIN code for quick wallet access"
          />

          <div className="pin-setup-container">
            <NumericKeypad
              value={pin}
              onChange={setPin}
              maxLength={4}
              label="Enter PIN Code"
              placeholder="Enter 4-digit PIN"
              step="enter"
              onStepComplete={() => setStep('pin-confirm')}
            />
          </div>
        </ModalStep>
      )}

      {step === 'pin-confirm' && (
        <ModalStep variant="narrow">
          <ModalStepHeader
            title="Confirm PIN Code"
            description="Please confirm your 4-digit PIN code"
          />

          <div className="pin-setup-container">
            <NumericKeypad
              value={confirmPin}
              onChange={setConfirmPin}
              maxLength={4}
              label="Confirm PIN Code"
              placeholder="Confirm 4-digit PIN"
              step="confirm"
            />

            {error && <div className="error-message">{error}</div>}
          </div>
        </ModalStep>
      )}

      {step === 'confirm' && (
        <ModalStep variant="narrow">
          <ModalStepHeader
            title="Authentication Setup Complete!"
            description={`Your wallet is now secured with ${
              selectedMethod === 'passkey' ? 'a passkey' : 'a PIN code'
            }`}
          />

          <div className="success-container">
            <div className="success-icon">
              <Shield size={48} className="success-shield" />
            </div>

            <div className="success-summary">
              <div className="summary-item">
                <span className="summary-label">Authentication Method:</span>
                <span className="summary-value">
                  {selectedMethod === 'passkey' ? 'Passkey' : 'PIN Code'}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Status:</span>
                <span className="summary-value success">Secured</span>
              </div>
            </div>

            <div className="success-actions">
              <Button onClick={handleComplete} className="primary">
                Continue to Wallet
              </Button>
            </div>
          </div>
        </ModalStep>
      )}
    </ModalBase>
  );
};
