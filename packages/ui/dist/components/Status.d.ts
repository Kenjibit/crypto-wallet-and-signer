import React from 'react';
type StatusType = 'success' | 'error' | 'warning';
interface StatusProps {
    message: string;
    type: StatusType;
    onDismiss?: () => void;
}
export default function Status({ message, type, onDismiss }: StatusProps): React.JSX.Element;
export {};
//# sourceMappingURL=Status.d.ts.map