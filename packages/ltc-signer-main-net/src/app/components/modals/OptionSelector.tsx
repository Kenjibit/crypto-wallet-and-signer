import React from 'react';
import { CheckCircle } from 'lucide-react';

export interface OptionItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

export interface OptionSelectorProps {
  options: OptionItem[];
  selectedId?: string;
  onSelect: (optionId: string) => void;
  variant?: 'grid' | 'vertical';
  className?: string;
}

export const OptionSelector: React.FC<OptionSelectorProps> = ({
  options,
  selectedId,
  onSelect,
  variant = 'grid',
  className = '',
}) => {
  const containerClass =
    variant === 'vertical' ? 'option-system--vertical' : 'option-system';

  return (
    <div className={`${containerClass} ${className}`}>
      {options.map((option) => (
        <button
          key={option.id}
          className={`option-item ${
            selectedId === option.id ? 'selected' : ''
          }`}
          onClick={() => onSelect(option.id)}
          disabled={option.disabled}
        >
          <div className="icon-left">{option.icon}</div>

          <div className="option-content">
            <h4>{option.title}</h4>
            <p>{option.description}</p>
          </div>

          <CheckCircle size={20} className="icon-right" />
        </button>
      ))}
    </div>
  );
};
