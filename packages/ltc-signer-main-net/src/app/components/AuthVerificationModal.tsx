import React, { useState, useEffect } from 'react';
import { Card, Button } from '@btc-wallet/ui';
import { 
  Fingerprint, 
  Smartphone, 
  Shield, 
  ArrowLeft,
  AlertCircle,
  Lock
} from 'lucide-react';
import { useAuth, AuthMethod } from '../contexts/AuthContext';

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

  useEffect(() => {
    if (isOpen && authState.method === 'passkey') {
      handlePasskeyVerification();
    }
  }, [isOpen, authState.method]);

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
    } catch (err) {
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
    } catch (err) {
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
    <div className="auth-verification-modal">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content">
        <Card className="auth-card">
          <div className="auth-verification-content">
            <div className="auth-header">
              <div className="auth-icon-wrapper">
                {authState.method === 'passkey' ? (
                  <Fingerprint size={48} className="auth-icon" />
                ) : (
                  <Smartphone size={48} className="auth-icon" />
                )}
              </div>
              <h2>{title}</h2>
              <p>{message}</p>
            </div>

            {error && (
              <div className="error-message">
                <AlertCircle size={20} />
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
                  <Button onClick={handleRetry} variant="ghost" disabled={isVerifying}>
                    Try Again
                  </Button>
                  <Button onClick={handleLogout} variant="ghost">
                    Use Different Method
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pin-verification">
                <div className="form-group">
                  <label htmlFor="verification-pin">Enter PIN Code</label>
                  <input
                    id="verification-pin"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Enter 4-digit PIN"
                    className="form-input"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    disabled={isVerifying}
                    autoFocus
                  />
                </div>

                <div className="auth-actions">
                  <Button onClick={onClose} variant="ghost" disabled={isVerifying}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handlePinVerification} 
                    disabled={pin.length !== 4 || isVerifying}
                  >
                    Verify PIN
                  </Button>
                </div>
              </div>
            )}

            <div className="auth-footer">
              <p className="auth-method-info">
                Using {authState.method === 'passkey' ? 'passkey' : 'PIN code'} authentication
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
