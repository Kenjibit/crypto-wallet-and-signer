import React from 'react';
import { Bitcoin } from 'lucide-react';
export default function Header() {
    return (<header className="text-center mb-8 py-6 relative">
      <div className="network-indicator absolute top-3 right-3 px-3 py-1 rounded-full text-sm font-semibold" style={{
            backgroundColor: 'rgba(247, 147, 26, 0.2)',
            color: 'var(--color-primary)',
        }}>
        TESTNET
      </div>

      <div className="logo flex items-center justify-center gap-4 mb-4">
        <Bitcoin className="text-5xl icon-extra-bold" size={48} style={{ color: 'var(--color-primary)' }}/>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-3">
        <span className="bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent">
          Bitcoin Transaction Creator
        </span>
      </h1>

      <p className="text-gray-300 text-lg max-w-2xl mx-auto">
        Create valid unsigned transactions with UTXO support
      </p>
    </header>);
}
//# sourceMappingURL=Header.jsx.map