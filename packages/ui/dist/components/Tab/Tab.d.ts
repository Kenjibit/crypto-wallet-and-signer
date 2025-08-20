import { ReactNode } from 'react';
interface TabContainerProps {
    children: ReactNode;
    defaultTab?: string;
    className?: string;
}
export declare const TabContainer: ({ children, defaultTab, className, }: TabContainerProps) => import("react").JSX.Element;
interface TabNavigationProps {
    children: ReactNode;
    className?: string;
}
export declare const TabNavigation: ({ children, className }: TabNavigationProps) => import("react").JSX.Element;
interface TabButtonProps {
    tabId: string;
    children: ReactNode;
    icon?: string;
    className?: string;
    onClick?: () => void;
}
export declare const TabButton: ({ tabId, children, icon, className, onClick, }: TabButtonProps) => import("react").JSX.Element;
interface TabContentProps {
    tabId: string;
    children: ReactNode;
    className?: string;
}
export declare const TabContent: ({ tabId, children, className }: TabContentProps) => import("react").JSX.Element | null;
interface TabPanelProps {
    value: string;
    children: ReactNode;
    className?: string;
}
export declare const TabPanel: ({ value, children, className }: TabPanelProps) => import("react").JSX.Element;
export {};
//# sourceMappingURL=Tab.d.ts.map