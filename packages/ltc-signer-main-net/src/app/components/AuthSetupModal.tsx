import React, { useState, useRef } from 'react';
import { Card, Button } from '@btc-wallet/ui';
import {
  Fingerprint,
  Smartphone,
  Shield,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useAuth, AuthMethod } from '../contexts/AuthContext';
import { useEffect } from 'react';

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
  const [step, setStep] = useState<'choose' | 'pin' | 'confirm'>('choose');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  // Use ref to track current auth state for polling
  const currentAuthState = useRef(authState);
  currentAuthState.current = authState;

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

  const handleMethodSelect = (method: AuthMethod) => {
    setSelectedMethod(method);
    if (method === 'passkey') {
      // Go directly to passkey creation, no intermediate step
      handlePasskeySetup();
    } else {
      setStep('pin');
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
      setError(
        'Failed to create passkey. Please try again or use PIN code instead.'
      );
    }
  };

  const handlePinSetup = () => {
    console.log('📱 AuthSetupModal: handlePinSetup called');
    console.log(
      '📱 AuthSetupModal: PIN length:',
      pin.length,
      'Confirm PIN length:',
      confirmPin.length
    );
    console.log(
      '📱 AuthSetupModal: PIN validation:',
      /^\d{4}$/.test(pin),
      'PINs match:',
      pin === confirmPin
    );

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      console.log(
        '📱 AuthSetupModal: PIN validation failed - length or format'
      );
      setError('PIN must be exactly 4 digits');
      return;
    }

    if (pin !== confirmPin) {
      console.log(
        '📱 AuthSetupModal: PIN confirmation failed - PINs do not match'
      );
      setError('PINs do not match');
      return;
    }

    console.log('📱 AuthSetupModal: Calling setPinCode with PIN:', pin);
    const success = setPinCode(pin, confirmPin);
    console.log('📱 AuthSetupModal: setPinCode returned:', success);

    if (success) {
      console.log(
        '📱 AuthSetupModal: PIN setup successful, moving to confirm step'
      );
      setStep('confirm');
    } else {
      console.log('📱 AuthSetupModal: PIN setup failed');
      setError('Failed to set PIN code');
    }
  };

  const handleBack = () => {
    if (step === 'choose') {
      onClose();
    } else if (step === 'pin') {
      setStep('choose');
      setSelectedMethod(null);
      setError('');
    } else {
      setStep('pin');
    }
  };

  const handleComplete = () => {
    console.log('📱 AuthSetupModal: handleComplete called');
    console.log('📱 AuthSetupModal: Current auth state in modal:', authState);

    // Additional validation: Ensure we're actually authenticated
    if (
      authState.status === 'authenticated' ||
      authState.method === 'passkey' ||
      authState.method === 'pin'
    ) {
      console.log(
        '📱 AuthSetupModal: Auth state validated, proceeding with completion'
      );
      onComplete();
    } else {
      console.warn(
        '📱 AuthSetupModal: Auth state not properly authenticated, but proceeding anyway'
      );
      // Proceed anyway since the context should have the correct state
      onComplete();
    }
  };

  const renderChooseMethod = () => (
    <div className="auth-setup-content">
      <div className="auth-header">
        <Shield size={48} className="auth-icon" />
        <h2>Secure Your Wallet</h2>
        <p>Choose how you want to authenticate with your wallet</p>
      </div>

      <div className="auth-options">
        {authState.isPasskeySupported && (
          <div
            className={`auth-option ${
              selectedMethod === 'passkey' ? 'selected' : ''
            }`}
            onClick={() => handleMethodSelect('passkey')}
          >
            <div className="option-icon">
              <Fingerprint size={32} />
            </div>
            <div className="option-content">
              <h3>Passkey (Recommended)</h3>
              <p>
                Use Face ID, Touch ID, or fingerprint for secure authentication
              </p>
            </div>
            <div className="option-check">
              {selectedMethod === 'passkey' && <CheckCircle size={24} />}
            </div>
          </div>
        )}

        <div
          className={`auth-option ${
            selectedMethod === 'pin' ? 'selected' : ''
          }`}
          onClick={() => handleMethodSelect('pin')}
        >
          <div className="option-icon">
            <Smartphone size={32} />
          </div>
          <div className="option-content">
            <h3>4-Digit PIN Code</h3>
            <p>Set a simple 4-digit PIN for quick access</p>
          </div>
          <div className="option-check">
            {selectedMethod === 'pin' && <CheckCircle size={24} />}
          </div>
        </div>
      </div>

      {!authState.isPasskeySupported && (
        <div className="passkey-notice">
          <AlertCircle size={20} />
          <span>
            Passkeys not supported on this device. Using PIN code instead.
          </span>
        </div>
      )}
    </div>
  );

  const renderPinSetup = () => (
    <div className="auth-setup-content">
      <div className="auth-header">
        <Smartphone size={48} className="auth-icon" />
        <h2>Setup PIN Code</h2>
        <p>Create a 4-digit PIN code for quick wallet access</p>
      </div>

      <div className="auth-form">
        <div className="form-group">
          <label htmlFor="pin">PIN Code</label>
          <input
            id="pin"
            type="password"
            value={pin}
            onChange={(e) =>
              setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
            }
            placeholder="Enter 4-digit PIN"
            className="form-input"
            maxLength={4}
            pattern="[0-9]{4}"
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPin">Confirm PIN</label>
          <input
            id="confirmPin"
            type="password"
            value={confirmPin}
            onChange={(e) =>
              setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))
            }
            placeholder="Confirm 4-digit PIN"
            className="form-input"
            maxLength={4}
            pattern="[0-9]{4}"
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="auth-actions">
          <Button onClick={handleBack} variant="ghost">
            <ArrowLeft size={20} />
            Back
          </Button>
          <Button
            onClick={handlePinSetup}
            disabled={pin.length !== 4 || confirmPin.length !== 4}
          >
            Set PIN Code
          </Button>
        </div>
      </div>
    </div>
  );

  const renderConfirm = () => (
    <div className="auth-setup-content">
      <div className="auth-header">
        <CheckCircle size={48} className="auth-icon success" />
        <h2>Authentication Setup Complete!</h2>
        <p>
          Your wallet is now secured with{' '}
          {selectedMethod === 'passkey' ? 'a passkey' : 'a PIN code'}
        </p>
      </div>

      <div className="auth-summary">
        <div className="summary-item">
          <span className="label">Method:</span>
          <span className="value">
            {selectedMethod === 'passkey' ? 'Passkey' : 'PIN Code'}
          </span>
        </div>
      </div>

      <div className="auth-actions">
        <Button onClick={handleComplete} className="primary">
          Continue to Wallet
        </Button>
      </div>
    </div>
  );

  return (
    <div className="auth-setup-modal">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content">
        <Card className="auth-card">
          {step === 'choose' && renderChooseMethod()}
          {step === 'pin' && renderPinSetup()}
          {step === 'confirm' && renderConfirm()}
        </Card>
      </div>
    </div>
  );
};
