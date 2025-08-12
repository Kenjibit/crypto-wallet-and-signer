import { forwardRef, useId } from 'react';
import { cn } from '../../utils/styles';
import styles from './Input.module.css';
import { renderIcon } from '../IconMap';
export const Input = forwardRef(({ label, icon, error, size = 'md', variant = 'default', helperText, className, id, hideLabel = false, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    return (<div className={styles.container}>
        {label && !hideLabel && (<label htmlFor={inputId} className={styles.label}>
            {icon &&
                renderIcon(icon, {
                    size: 16,
                    strokeWidth: 3.5,
                    className: styles.icon,
                })}
            {label}
          </label>)}

        <div className={styles.inputWrapper}>
          <input ref={ref} id={inputId} className={cn(styles.input, styles[`input--${variant}`], styles[`input--${size}`], error && styles['input--error'], className)} {...props}/>
        </div>

        {helperText && !error && (<div className={styles.helperText}>{helperText}</div>)}

        {error && <div className={styles.errorText}>{error}</div>}
      </div>);
});
Input.displayName = 'Input';
//# sourceMappingURL=Input.jsx.map