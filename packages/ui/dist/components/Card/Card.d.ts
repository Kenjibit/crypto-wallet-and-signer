import { ReactNode } from 'react';
export interface CardProps {
    title?: string;
    icon?: string;
    children: ReactNode;
    variant?: 'default' | 'elevated' | 'outlined';
    className?: string;
    padding?: 'sm' | 'md' | 'lg' | 'xl';
    footer?: ReactNode;
}
export declare const Card: ({ title, icon, children, variant, className, padding, footer, }: CardProps) => import("react").JSX.Element;
//# sourceMappingURL=Card.d.ts.map