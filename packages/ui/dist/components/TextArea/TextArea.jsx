import { forwardRef } from 'react';
import { cn } from '../../utils/styles';
import styles from './TextArea.module.css';
import { renderIcon } from '../IconMap';
export const TextArea = forwardRef(({ label, icon, error, size = 'md', variant = 'default', helperText, className, id, rows = 4, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    return (<div className={styles.container}>
        {label && (<label htmlFor={textareaId} className={styles.label}>
            {icon &&
                renderIcon(icon, {
                    size: 16,
                    strokeWidth: 3.5,
                    className: styles.icon,
                })}
            {label}
          </label>)}

        <div className={styles.textareaWrapper}>
          <textarea ref={ref} id={textareaId} rows={rows} className={cn(styles.textarea, styles[`textarea--${variant}`], styles[`textarea--${size}`], error && styles['textarea--error'], className)} {...props}/>
        </div>

        {helperText && !error && (<div className={styles.helperText}>{helperText}</div>)}

        {error && <div className={styles.errorText}>{error}</div>}
      </div>);
});
TextArea.displayName = 'TextArea';
//# sourceMappingURL=TextArea.jsx.map