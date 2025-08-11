import React from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

type StatusType = 'success' | 'error' | 'warning';

interface StatusProps {
  message: string;
  type: StatusType;
  onDismiss?: () => void;
}

export default function Status({ message, type, onDismiss }: StatusProps) {
  const typeStyles = {
    success: 'status success',
    error: 'status error',
    warning: 'status warning',
  };

  const typeIcons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
  };

  return (
    <div className={typeStyles[type]}>
      {React.createElement(typeIcons[type], { size: 20, strokeWidth: 3.5 })}
      <div>{message}</div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="status-dismiss"
          aria-label="Dismiss"
          style={{
            display: 'flex',
            opacity: 1,
            visibility: 'visible',
          }}
        >
          <XCircle size={16} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
