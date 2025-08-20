import { ReactNode } from 'react';
import { cn } from '../../utils/styles';
import styles from './Card.module.css';
import { renderIcon } from '../IconMap';

export interface CardProps {
  title?: string;
  icon?: string;
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  className?: string;
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
}

export const Card = ({
  title,
  icon,
  children,
  variant = 'default',
  className,
  padding = 'lg',
  footer,
}: CardProps) => {
  return (
    <div
      className={cn(
        styles.card,
        styles[`card--${variant}`],
        styles[`card--${padding}`],
        className
      )}
    >
      {title && (
        <h2 className={styles.title}>
          {icon &&
            renderIcon(icon, {
              size: 20,
              strokeWidth: 3.5,
              className: styles.icon,
            })}
          {title}
        </h2>
      )}
      <div className={styles.content}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
};
