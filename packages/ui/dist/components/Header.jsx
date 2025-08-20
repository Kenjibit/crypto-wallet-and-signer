import React from 'react';
import { Bitcoin } from 'lucide-react';
export default function Header({ appType = 'creator', actions, network = 'testnet', }) {
    const getAppInfo = () => {
        switch (appType) {
            case 'signer':
                return {
                    title: 'Bitcoin Transaction Signer',
                    description: 'Offline Bitcoin transaction signer for air-gapped security',
                };
            case 'creator':
            default:
                return {
                    title: 'Bitcoin Transaction Creator',
                    description: 'Create valid unsigned transactions with UTXO support',
                };
        }
    };
    const { title, description } = getAppInfo();
    const indicatorPositionClass = actions
        ? 'absolute top-3 left-3 px-3 py-1 rounded-full text-sm font-semibold'
        : 'absolute top-3 right-3 px-3 py-1 rounded-full text-sm font-semibold';
    return (<header className="text-center mb-8 py-6 relative">
      <div className={`network-indicator ${indicatorPositionClass}`} style={{
            backgroundColor: 'rgba(247, 147, 26, 0.2)',
            color: 'var(--color-primary)',
        }}>
        {network.toUpperCase()}
      </div>

      {actions && (<div className="absolute top-3 right-3 flex items-center gap-2">
          {actions}
        </div>)}

      <div className="logo flex items-center justify-center gap-4 mb-4">
        <Bitcoin className="text-5xl" size={48} strokeWidth={2.5} style={{ color: 'var(--color-primary)' }}/>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-3">
        <span className="bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent">
          {title}
        </span>
      </h1>

      <p className="text-gray-300 text-lg max-w-2xl mx-auto">{description}</p>
    </header>);
}
//# sourceMappingURL=Header.jsx.map