import { InputHTMLAttributes } from 'react';
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
    label?: string;
    icon?: string;
    error?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'outlined' | 'filled';
    helperText?: string;
    hideLabel?: boolean;
}
export declare const Input: import("react").ForwardRefExoticComponent<InputProps & import("react").RefAttributes<HTMLInputElement>>;
//# sourceMappingURL=Input.d.ts.map