import React from 'react';

export interface ModalStepProps {
  children: React.ReactNode;
  variant?: 'default' | 'narrow' | 'wide';
  className?: string;
}

export const ModalStep: React.FC<ModalStepProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const stepClass = `modal-step modal-step--${variant}`;

  return <div className={`${stepClass} ${className}`}>{children}</div>;
};

export interface ModalStepHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export const ModalStepHeader: React.FC<ModalStepHeaderProps> = ({
  title,
  description,
  className = '',
}) => {
  return (
    <div className={`modal-step-header ${className}`}>
      <h3>{title}</h3>
      {description && <p className="modal-step-description">{description}</p>}
    </div>
  );
};
