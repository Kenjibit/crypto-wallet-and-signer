import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/styles';
import styles from './TextArea.module.css';
import { renderIcon } from '../IconMap';

export interface TextAreaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string;
  icon?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outlined' | 'filled';
  helperText?: string;
  rows?: number;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      icon,
      error,
      size = 'md',
      variant = 'default',
      helperText,
      className,
      id,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId =
      id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={styles.container}>
        {label && (
          <label htmlFor={textareaId} className={styles.label}>
            {icon &&
              renderIcon(icon, {
                size: 16,
                strokeWidth: 3.5,
                className: styles.icon,
              })}
            {label}
          </label>
        )}

        <div className={styles.textareaWrapper}>
          <textarea
            ref={ref}
            id={textareaId}
            rows={rows}
            className={cn(
              styles.textarea,
              styles[`textarea--${variant}`],
              styles[`textarea--${size}`],
              error && styles['textarea--error'],
              className
            )}
            {...props}
          />
        </div>

        {helperText && !error && (
          <div className={styles.helperText}>{helperText}</div>
        )}

        {error && <div className={styles.errorText}>{error}</div>}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
