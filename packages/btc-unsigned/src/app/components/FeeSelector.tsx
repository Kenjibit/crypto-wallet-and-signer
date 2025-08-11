'use client';

import { useState, useEffect, useRef } from 'react';
import { FeeEstimate } from '../../types/bitcoin';
import { Button } from '@btc-wallet/ui';
import { Fuel, Info, ChevronDown } from 'lucide-react';
import styles from './FeeSelector.module.css';

interface FeeSelectorProps {
  selectedRate: string;
  onRateChange: (rate: string) => void;
  feeRates?: FeeEstimate | null;
  estimatedFee?: number;
  isLoading?: boolean;
}

export default function FeeSelector({
  selectedRate,
  onRateChange,
  feeRates,
  estimatedFee,
  isLoading = false,
}: FeeSelectorProps) {
  const [isCustomFee, setIsCustomFee] = useState(false);
  const [customFeeRate, setCustomFeeRate] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const feeRateOptions = [
    {
      value: 'slow',
      label: 'Slow',
      description: '1-2 hours',
      color: 'text-gray-400',
    },
    {
      value: 'normal',
      label: 'Normal',
      description: '10-30 minutes',
      color: 'text-blue-400',
    },
    {
      value: 'fast',
      label: 'Fast',
      description: '5-10 minutes',
      color: 'text-yellow-400',
    },
    {
      value: 'priority',
      label: 'Priority',
      description: '1-5 minutes',
      color: 'text-red-400',
    },
  ];

  const getFeeRateValue = (rate: string): number => {
    if (!feeRates) return 0;
    return feeRates[rate as keyof FeeEstimate] || 0;
  };

  const handleCustomFeeToggle = () => {
    setIsCustomFee(!isCustomFee);
    if (!isCustomFee) {
      // Switch to custom mode
      setCustomFeeRate('');
    } else {
      // Switch back to preset mode
      onRateChange('normal');
    }
  };

  const handleCustomFeeChange = (value: string) => {
    setCustomFeeRate(value);
    // You can add custom fee rate handling here
  };

  // Click outside to close dropdown - optimized with useCallback
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    // Use passive listener for better performance
    document.addEventListener('mousedown', handleClickOutside, {
      passive: true,
    });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getSelectedOption = () => {
    return (
      feeRateOptions.find((option) => option.value === selectedRate) ||
      feeRateOptions[1]
    );
  };

  // Memoize the selected option to prevent unnecessary re-renders
  const selectedOption = getSelectedOption();

  return (
    <div className="input-group">
      <label>
        <Fuel size={16} strokeWidth={2.5} />
        Fee Rate
        {feeRates?.timestamp && (
          <span className="text-xs text-gray-400 ml-2">
            (Updated: {new Date(feeRates.timestamp).toLocaleTimeString()})
          </span>
        )}
      </label>

      <div className="space-y-4">
        {/* Fee Rate Selection */}
        <div className="space-y-4">
          {/* Mobile Dropdown */}
          {!isCustomFee && (
            <div className="fee-dropdown-mobile">
              <div className="custom-select-container" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  disabled={isLoading}
                  className="custom-select-button"
                  aria-haspopup="listbox"
                  aria-expanded={isDropdownOpen}
                >
                  <span className="custom-select-value">
                    {selectedOption.label}
                  </span>
                  <ChevronDown
                    size={16}
                    strokeWidth={2.5}
                    className={`custom-select-arrow ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="custom-select-dropdown">
                    {feeRateOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onRateChange(option.value);
                          setIsDropdownOpen(false);
                        }}
                        className={`custom-select-option ${
                          selectedRate === option.value ? 'selected' : ''
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Option Display */}
              <div className="summary mt-2">
                <div className="summary-item">
                  <div>Fee Rate:</div>
                  <div className={`font-medium ${selectedOption.color}`}>
                    {selectedOption.label}
                  </div>
                </div>
                <div className="summary-item">
                  <div>Confirmation Time:</div>
                  <div className="text-gray-300">
                    {selectedOption.description}
                  </div>
                </div>
                {feeRates && (
                  <div className="summary-item">
                    <div>Rate:</div>
                    <div className="font-mono text-gray-200">
                      {getFeeRateValue(selectedOption.value)} sat/byte
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Desktop Preset Fee Buttons */}
          {!isCustomFee && (
            <div className="fee-dropdown-desktop">
              {feeRateOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={
                    selectedRate === option.value ? 'primary' : 'secondary'
                  }
                  size="lg"
                  onClick={() => onRateChange(option.value)}
                  disabled={isLoading}
                  className={styles.feeButton}
                >
                  <div className="text-center">
                    <div className={`font-medium ${option.color}`}>
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-400">
                      {option.description}
                    </div>
                    {feeRates && (
                      <div className="text-xs font-mono mt-1 text-gray-200">
                        {getFeeRateValue(option.value)} sat/byte
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}

          {/* Custom Fee Input */}
          {isCustomFee && (
            <div className="bg-gray-800/50 p-4 rounded-lg backdrop-blur-sm">
              <label className="block text-sm text-gray-400 mb-2">
                Custom Fee Rate (sat/byte)
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={customFeeRate}
                onChange={(e) => handleCustomFeeChange(e.target.value)}
                placeholder="Enter custom fee rate"
                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded text-sm font-mono text-gray-300"
              />
              <div className="text-xs text-gray-500 mt-2">
                Enter a value between 1-1000 sat/byte
              </div>
            </div>
          )}

          {/* Toggle Button */}
          <div className={styles.customFeeContainer}>
            <Button
              variant="secondary"
              onClick={handleCustomFeeToggle}
              icon={`fas fa-${isCustomFee ? 'list' : 'edit'}`}
              className="w-full"
            >
              {isCustomFee ? 'Use Presets' : 'Custom Fee'}
            </Button>
          </div>
        </div>

        {/* Fee Rate Indicator */}
        {estimatedFee !== undefined && (
          <div className={styles.feeIndicator}>
            <div className={styles.feeIndicatorContent}>
              <Info size={16} strokeWidth={2.5} className="text-orange-400" />
              <span className="text-sm text-gray-300">
                Fee will be updated in the summary below
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
