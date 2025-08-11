import { TextareaHTMLAttributes } from 'react';
export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
    label?: string;
    icon?: string;
    error?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'outlined' | 'filled';
    helperText?: string;
    rows?: number;
}
export declare const TextArea: import("react").ForwardRefExoticComponent<TextAreaProps & import("react").RefAttributes<HTMLTextAreaElement>>;
//# sourceMappingURL=TextArea.d.ts.map