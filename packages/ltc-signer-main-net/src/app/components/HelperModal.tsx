import React from 'react';

interface HelperModalProps {
  isOpen: boolean;
  title: string;
  content: string;
  onClose: () => void;
}

export const HelperModal: React.FC<HelperModalProps> = ({
  isOpen,
  title,
  content,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="helper-modal-overlay" onClick={onClose}>
      <div className="helper-modal" onClick={(e) => e.stopPropagation()}>
        <div className="helper-modal-header">
          <h4>{title}</h4>
          <button className="helper-close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="helper-modal-content">
          <div className="explanation-text">{content}</div>
          <div className="modal-footer">
            <button className="modal-close-btn" onClick={onClose}>
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
