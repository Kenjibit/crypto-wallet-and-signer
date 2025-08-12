import React from 'react';
import styles from './MainContainer.module.css';
export default function MainContainer({ children, className, }) {
    return (<main className={`${styles.main} ${className || ''}`}>{children}</main>);
}
//# sourceMappingURL=MainContainer.jsx.map