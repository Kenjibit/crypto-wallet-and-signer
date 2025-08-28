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
    <div
      className="helper-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="helper-modal-title"
      aria-describedby="helper-modal-content"
    >
      <div className="helper-modal" onClick={(e) => e.stopPropagation()}>
        <div className="helper-modal-header">
          <h4 id="helper-modal-title">{title}</h4>
          <button
            className="helper-close-btn"
            onClick={onClose}
            aria-label="Close help dialog"
            type="button"
          >
            ×
          </button>
        </div>
        <div className="helper-modal-content">
          <div
            id="helper-modal-content"
            className="explanation-text"
            role="document"
          >
            {content}
          </div>
          <div className="modal-footer">
            <button
              className="modal-close-btn"
              onClick={onClose}
              type="button"
              autoFocus
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
