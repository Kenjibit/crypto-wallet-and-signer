import { ReactNode } from 'react';
export interface ButtonProps {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
    icon?: string;
    loading?: boolean;
}
export declare const Button: ({ variant, size, children, className, icon, loading, disabled, ...props }: ButtonProps) => import("react").JSX.Element;
//# sourceMappingURL=Button.d.ts.map