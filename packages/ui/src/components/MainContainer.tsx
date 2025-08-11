import React from 'react';
import styles from './MainContainer.module.css';

interface MainContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function MainContainer({
  children,
  className,
}: MainContainerProps) {
  return (
    <main className={`${styles.main} ${className || ''}`}>{children}</main>
  );
}
