import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

export interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  label?: string;
  className?: string;
  step?: 'enter' | 'confirm';
  onStepComplete?: () => void;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  value,
  onChange,
  maxLength,
  // placeholder = 'Enter PIN',
  label,
  className = '',
  // step = 'enter',
  onStepComplete,
}) => {
  const [showNumbers, setShowNumbers] = useState(false);
  // const [lastInputTime, setLastInputTime] = useState(0);
  const [hiddenPositions, setHiddenPositions] = useState<Set<number>>(
    new Set()
  );

  const handleNumberClick = (num: string) => {
    if (value.length < maxLength) {
      const newValue = value + num;
      // const currentPosition = value.length;
      onChange(newValue);

      // Show numbers briefly for security
      setShowNumbers(true);
      // setLastInputTime(Date.now());

      // Auto-advance to next step when PIN is complete
      if (newValue.length === maxLength && onStepComplete) {
        onStepComplete();
      }
    }
  };

  const handleDelete = () => {
    onChange(value.slice(0, -1));
  };

  // Hide numbers after brief display for security
  useEffect(() => {
    if (showNumbers) {
      const timer = setTimeout(() => {
        setShowNumbers(false);
        // Mark all current positions as hidden
        const newHiddenPositions = new Set<number>();
        for (let i = 0; i < value.length; i++) {
          newHiddenPositions.add(i);
        }
        setHiddenPositions(newHiddenPositions);
      }, 1000); // Show numbers for 1 second

      return () => clearTimeout(timer);
    }
  }, [showNumbers, value.length]);

  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0'];

  return (
    <div className={`numeric-keypad ${className}`}>
      {label && <label className="keypad-label">{label}</label>}

      <div className="pin-display">
        <div className="pin-dots">
          {Array.from({ length: maxLength }, (_, index) => (
            <div
              key={index}
              className={`pin-dot ${index < value.length ? 'filled' : ''}`}
            >
              {index < value.length &&
              showNumbers &&
              !hiddenPositions.has(index)
                ? value[index]
                : ''}
            </div>
          ))}
        </div>
      </div>

      <div className="keypad-grid">
        {numbers.map((num, index) => (
          <button
            key={index}
            className={`keypad-key ${num === '' ? 'empty' : 'number'}`}
            onClick={() => num && handleNumberClick(num)}
            disabled={num === ''}
            type="button"
          >
            {num}
          </button>
        ))}

        <button
          className="keypad-key action"
          onClick={handleDelete}
          disabled={value.length === 0}
          type="button"
        >
          <ArrowLeft size={20} />
        </button>
      </div>
    </div>
  );
};
