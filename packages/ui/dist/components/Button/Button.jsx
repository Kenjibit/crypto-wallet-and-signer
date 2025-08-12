import { cn } from '../../utils/styles';
import styles from './Button.module.css';
import { renderIcon } from '../IconMap';
export const Button = ({ variant = 'primary', size = 'md', children, className, icon, loading = false, disabled, ...props }) => {
    const buttonClass = cn(styles.button, styles[`button--${variant}`], styles[`button--${size}`], loading && styles['button--loading'], disabled && styles['button--disabled'], className);
    return (<button className={buttonClass} disabled={disabled || loading} {...props}>
      {loading && <div className={styles.spinner}></div>}
      {icon &&
            renderIcon(icon, {
                size: 18,
                strokeWidth: 3.5,
                className: styles.icon,
            })}
      {children}
    </button>);
};
//# sourceMappingURL=Button.jsx.map