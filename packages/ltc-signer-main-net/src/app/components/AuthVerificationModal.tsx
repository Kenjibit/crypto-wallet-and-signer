import React, { useState, useEffect } from 'react';
import { Button } from '@btc-wallet/ui';
import { Fingerprint, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ModalBase, ModalStep, ModalStepHeader, NumericKeypad } from './modals';

interface AuthVerificationModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
  title?: string;
  message?: string;
}

export const AuthVerificationModal: React.FC<AuthVerificationModalProps> = ({
  isOpen,
  onSuccess,
  onClose,
  title = 'Authentication Required',
  message = 'Please authenticate to continue',
}) => {
  const { authState, verifyPasskey, verifyPinCode, logout } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasAttemptedAuth, setHasAttemptedAuth] = useState(false);

  // Auto-verify PIN when it's complete
  useEffect(() => {
    if (authState.method === 'pin' && pin.length === 4 && !isVerifying) {
      handlePinVerification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, authState.method, isVerifying]);

  // Clear PIN input when modal opens or when navigating back
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setHasAttemptedAuth(false); // Reset auth attempt flag
    }
  }, [isOpen]);

  // Auto-trigger passkey verification only once when modal opens
  useEffect(() => {
    if (
      isOpen &&
      authState.method === 'passkey' &&
      !hasAttemptedAuth &&
      !isVerifying
    ) {
      setHasAttemptedAuth(true);
      handlePasskeyVerification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, authState.method, hasAttemptedAuth, isVerifying]);

  const handlePasskeyVerification = async () => {
    setIsVerifying(true);
    setError('');

    try {
      const success = await verifyPasskey();
      if (success) {
        onSuccess();
      } else {
        setError('Passkey verification failed. Please try again.');
      }
    } catch {
      setError('Passkey verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePinVerification = () => {
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const success = verifyPinCode(pin);
      if (success) {
        onSuccess();
      } else {
        setError('Incorrect PIN code. Please try again.');
        setPin('');
      }
    } catch {
      setError('PIN verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRetry = () => {
    setError('');
    setPin('');
    if (authState.method === 'passkey') {
      handlePasskeyVerification();
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      className="auth-verification-modal"
      showBackButton={true}
      onBack={onClose}
    >
      <ModalStep variant="narrow">
        <ModalStepHeader title={title} description={message} />

        <div className="auth-verification-content">
          {error && (
            <div className="error-message">
              <span>{error}</span>
            </div>
          )}

          {authState.method === 'passkey' ? (
            <div className="passkey-verification">
              <div className="verification-status">
                {isVerifying ? (
                  <div className="verifying">
                    <Lock size={32} className="spinning" />
                    <p>Verifying passkey...</p>
                  </div>
                ) : (
                  <div className="ready">
                    <Fingerprint size={32} />
                    <p>Use Face ID, Touch ID, or fingerprint to authenticate</p>
                  </div>
                )}
              </div>

              <div className="auth-actions">
                <Button
                  onClick={handleRetry}
                  variant="ghost"
                  disabled={isVerifying}
                >
                  Try Again
                </Button>
                <Button onClick={handleLogout} variant="ghost">
                  Use Different Method
                </Button>
              </div>
            </div>
          ) : (
            <div className="pin-verification">
              <NumericKeypad
                value={pin}
                onChange={setPin}
                maxLength={4}
                label="Enter PIN Code"
                placeholder="Enter 4-digit PIN"
              />
            </div>
          )}
        </div>
      </ModalStep>
    </ModalBase>
  );
};
