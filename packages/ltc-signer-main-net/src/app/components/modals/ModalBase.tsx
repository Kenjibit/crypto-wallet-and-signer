import React from 'react';
import { ArrowLeft } from 'lucide-react';

export interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void; // Custom back button handler
  className?: string;
}

export const ModalBase: React.FC<ModalBaseProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showBackButton = true,
  onBack,
  className = '',
}) => {
  if (!isOpen) return null;

  // Use custom onBack if provided, otherwise fall back to onClose
  const handleBack = onBack || onClose;

  return (
    <div className={`modal-base ${className}`}>
      {/* Header */}
      <div className="modal-header">
        {showBackButton && (
          <button className="back-button" onClick={handleBack}>
            <ArrowLeft size={20} />
          </button>
        )}
        <h2>{title}</h2>
      </div>

      {/* Content */}
      <div className="modal-content">{children}</div>
    </div>
  );
};
