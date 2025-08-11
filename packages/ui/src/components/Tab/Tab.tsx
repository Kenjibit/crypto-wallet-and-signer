import { ReactNode, createContext, useContext, useState } from 'react';
import { cn } from '../../utils/styles';
import styles from './Tab.module.css';
import { renderIcon } from '../IconMap';

// Tab Context
interface TabContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

// Tab Container
interface TabContainerProps {
  children: ReactNode;
  defaultTab?: string;
  className?: string;
}

export const TabContainer = ({
  children,
  defaultTab,
  className,
}: TabContainerProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab || '');

  return (
    <TabContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn(styles.container, className)}>{children}</div>
    </TabContext.Provider>
  );
};

// Tab Navigation
interface TabNavigationProps {
  children: ReactNode;
  className?: string;
}

export const TabNavigation = ({ children, className }: TabNavigationProps) => {
  return <div className={cn(styles.navigation, className)}>{children}</div>;
};

// Tab Button
interface TabButtonProps {
  tabId: string;
  children: ReactNode;
  icon?: string;
  className?: string;
}

export const TabButton = ({
  tabId,
  children,
  icon,
  className,
}: TabButtonProps) => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('TabButton must be used within TabContainer');
  }

  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === tabId;

  return (
    <button
      type="button"
      className={cn(
        styles.tabButton,
        isActive && styles['tabButton--active'],
        className
      )}
      onClick={() => setActiveTab(tabId)}
    >
      {icon &&
        renderIcon(icon, {
          size: 16,
          strokeWidth: 3.5,
          className: styles.icon,
        })}
      {children}
    </button>
  );
};

// Tab Content
interface TabContentProps {
  tabId: string;
  children: ReactNode;
  className?: string;
}

export const TabContent = ({ tabId, children, className }: TabContentProps) => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('TabContent must be used within TabContainer');
  }

  const { activeTab } = context;
  const isActive = activeTab === tabId;

  if (!isActive) return null;

  return <div className={cn(styles.content, className)}>{children}</div>;
};

// Tab Panel (Alternative API)
interface TabPanelProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export const TabPanel = ({ value, children, className }: TabPanelProps) => {
  return (
    <TabContent tabId={value} className={className}>
      {children}
    </TabContent>
  );
};
