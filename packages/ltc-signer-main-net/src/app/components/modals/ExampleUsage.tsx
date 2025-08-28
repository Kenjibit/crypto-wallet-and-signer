import React, { useState } from 'react';
import { Fingerprint, Smartphone, CheckCircle } from 'lucide-react';
import { ModalBase, ModalStep, ModalStepHeader, OptionSelector } from './index';
import type { OptionItem } from './OptionSelector';

// Example of how to refactor existing modals to use the new components

export const ExampleAuthModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [selectedMethod, setSelectedMethod] = useState<string>();
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  // Define options using the OptionItem interface
  const authOptions: OptionItem[] = [
    {
      id: 'passkey',
      title: 'Passkey (Recommended)',
      description:
        'Use Face ID, Touch ID, or fingerprint for secure authentication',
      icon: <Fingerprint size={24} />,
    },
    {
      id: 'pin',
      title: 'PIN Code',
      description: 'Create a secure PIN code for authentication',
      icon: <Smartphone size={24} />,
    },
  ];

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('select');
    } else {
      onClose();
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Setup Authentication"
      className="auth-setup-modal"
      showBackButton={true}
      onBack={handleBack}
    >
      {step === 'select' && (
        <ModalStep variant="narrow">
          <ModalStepHeader
            title="Choose Authentication Method"
            description="Select how you want to secure your wallet"
          />

          <OptionSelector
            options={authOptions}
            selectedId={selectedMethod}
            onSelect={(method) => {
              setSelectedMethod(method);
              setStep('confirm');
            }}
            variant="vertical"
          />
        </ModalStep>
      )}

      {step === 'confirm' && (
        <ModalStep variant="narrow">
          <ModalStepHeader
            title="Confirm Selection"
            description={`You selected: ${selectedMethod}`}
          />

          <div className="auth-actions">
            <button
              className="btn btn-primary"
              onClick={() => console.log('Continue with:', selectedMethod)}
            >
              Continue with {selectedMethod === 'passkey' ? 'Passkey' : 'PIN'}
            </button>
          </div>
        </ModalStep>
      )}
    </ModalBase>
  );
};

// Example of how to create a completely new modal using the components
export const ExampleCustomModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [selectedOption, setSelectedOption] = useState<string>();

  const customOptions: OptionItem[] = [
    {
      id: 'option1',
      title: 'First Option',
      description: 'This is the first available option',
      icon: <CheckCircle size={24} />,
    },
    {
      id: 'option2',
      title: 'Second Option',
      description: 'This is the second available option',
      icon: <CheckCircle size={24} />,
    },
    {
      id: 'option3',
      title: 'Third Option',
      description: 'This is the third available option',
      icon: <CheckCircle size={24} />,
    },
  ];

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Custom Modal Example"
      className="custom-modal"
    >
      <ModalStep variant="wide">
        <ModalStepHeader
          title="Select Your Preference"
          description="Choose from the following options"
        />

        <OptionSelector
          options={customOptions}
          selectedId={selectedOption}
          onSelect={setSelectedOption}
          variant="grid"
        />

        {selectedOption && (
          <div className="custom-actions">
            <p>You selected: {selectedOption}</p>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </ModalStep>
    </ModalBase>
  );
};
