import React from 'react';
interface HeaderProps {
    appType?: 'creator' | 'signer';
    actions?: React.ReactNode;
    network?: 'mainnet' | 'testnet';
}
export default function Header({ appType, actions, network, }: HeaderProps): React.JSX.Element;
export {};
//# sourceMappingURL=Header.d.ts.map