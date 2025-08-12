import { createContext, useContext, useState } from 'react';
import { cn } from '../../utils/styles';
import styles from './Tab.module.css';
import { renderIcon } from '../IconMap';
const TabContext = createContext(undefined);
export const TabContainer = ({ children, defaultTab, className, }) => {
    const [activeTab, setActiveTab] = useState(defaultTab || '');
    return (<TabContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn(styles.container, className)}>{children}</div>
    </TabContext.Provider>);
};
export const TabNavigation = ({ children, className }) => {
    return <div className={cn(styles.navigation, className)}>{children}</div>;
};
export const TabButton = ({ tabId, children, icon, className, }) => {
    const context = useContext(TabContext);
    if (!context) {
        throw new Error('TabButton must be used within TabContainer');
    }
    const { activeTab, setActiveTab } = context;
    const isActive = activeTab === tabId;
    return (<button type="button" className={cn(styles.tabButton, isActive && styles['tabButton--active'], className)} onClick={() => setActiveTab(tabId)}>
      {icon &&
            renderIcon(icon, {
                size: 16,
                strokeWidth: 3.5,
                className: styles.icon,
            })}
      {children}
    </button>);
};
export const TabContent = ({ tabId, children, className }) => {
    const context = useContext(TabContext);
    if (!context) {
        throw new Error('TabContent must be used within TabContainer');
    }
    const { activeTab } = context;
    const isActive = activeTab === tabId;
    if (!isActive)
        return null;
    return <div className={cn(styles.content, className)}>{children}</div>;
};
export const TabPanel = ({ value, children, className }) => {
    return (<TabContent tabId={value} className={className}>
      {children}
    </TabContent>);
};
//# sourceMappingURL=Tab.jsx.map