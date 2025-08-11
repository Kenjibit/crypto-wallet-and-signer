# 🚀 Crypto Wallet & Air-Gapped Signer

> **⚠️ ALPHA STAGE WARNING** ⚠️
>
> This project is currently in **ALPHA** development stage. It currently only supports **Bitcoin (BTC) on testnet** for safety and testing purposes.
>
> **Our goal is to support all major cryptocurrencies** in future releases.

A modern, secure cryptocurrency wallet project built with Next.js and a monorepo architecture. Features an air-gapped PWA signer for maximum security when signing transactions.

## 🌟 Features

### 🔐 **Security First**

- **Air-gapped signing** - Complete offline transaction signing
- **PWA (Progressive Web App)** - Native app experience across devices
- **Client-side processing** - All sensitive operations happen in your browser
- **No server data transmission** - Your keys never leave your device

### 💰 **Multi-Crypto Support**

- **Bitcoin (BTC) - CURRENTLY SUPPORTED** ✅
  - Full PSBT support with UTXO management
  - **Testnet only** for safety during alpha development
- **Future Support** 🚧
  - **Ethereum (ETH)** - Smart contract interactions
  - **Other major cryptocurrencies** - Extensible architecture
  - **Mainnet support** - After thorough testing

### 🛠 **Developer Experience**

- **Monorepo structure** - Shared UI components and utilities
- **TypeScript** - Full type safety and better development experience
- **Modern React** - Built with Next.js 14 and React 18
- **Responsive design** - Works seamlessly on desktop and mobile

## 🏗 Project Structure

```
crypto-wallet-and-signer/
├── packages/
│   ├── btc-unsigned/          # Bitcoin transaction creator
│   │   ├── src/app/          # Next.js app directory
│   │   ├── src/lib/          # Bitcoin utilities
│   │   └── src/types/        # TypeScript definitions
│   ├── btc-signer/           # Air-gapped transaction signer
│   │   ├── src/app/          # Next.js app directory
│   │   ├── src/libs/         # Signing utilities
│   │   └── src/components/   # React components
│   └── ui/                   # Shared UI component library
│       ├── src/components/   # Reusable components
│       ├── src/styles/       # Design system and themes
│       └── src/utils/        # Utility functions
├── DESIGN_SYSTEM.md          # Design system documentation
├── MONOREPO_SETUP.md         # Monorepo configuration guide
└── WORKING_BITCOIN_TRANSACTION_SIGNER.md  # Implementation details
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** or **yarn**
- **Git**

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Kenjibit/crypto-wallet-and-signer.git
   cd crypto-wallet-and-signer
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development servers**

   **Bitcoin Transaction Creator (Unsigned)**

   ```bash
   cd packages/btc-unsigned
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

   **Bitcoin Transaction Signer**

   ```bash
   cd packages/btc-signer
   npm run dev
   ```

   Open [http://localhost:3001](http://localhost:3001)

## 🔧 Development

### Monorepo Commands

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Run tests across all packages
npm run test

# Lint all packages
npm run lint
```

### Package Development

```bash
# Work on a specific package
cd packages/btc-unsigned
npm run dev

# Build the package
npm run build

# Run tests
npm run test
```

## 📱 PWA Features

### Installation

- **iOS**: Use Safari's "Add to Home Screen" feature
- **Android**: Chrome will prompt for installation
- **Desktop**: Click the install button in the browser

### Offline Capabilities

- Works without internet connection
- Caches essential resources
- Air-gapped signing workflow

## 🔐 Security Features

### Air-Gapped Signing Workflow

1. **Create Transaction** (Online device)

   - Generate PSBT (Partially Signed Bitcoin Transaction)
   - Export as QR code

2. **Sign Transaction** (Offline device)

   - Scan PSBT QR code
   - Sign with private key
   - Export signatures as QR code

3. **Broadcast Transaction** (Online device)
   - Import signatures
   - Combine with original PSBT
   - Broadcast to network

### Key Security Principles

- **Never expose private keys** to network
- **Client-side only** processing
- **QR code communication** between devices
- **No server-side key storage**

## 🎨 Design System

The project uses a consistent design system with:

- **Color scheme**: Bitcoin orange (#f7931a) theme
- **Typography**: Modern, readable fonts
- **Components**: Reusable UI components
- **Responsive**: Mobile-first design approach

## 🧪 Testing

### Testnet Environment

- **Bitcoin Testnet** for safe testing during alpha development
- **No real funds** at risk - perfect for development and testing
- **Full functionality** testing with testnet BTC
- **Mainnet support** will be added after thorough testing and security audits

### Testing Commands

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📦 Build & Deployment

### Production Build

```bash
# Build all packages
npm run build

# Build specific package
cd packages/btc-unsigned
npm run build
```

### Deployment

- **Vercel**: Optimized for Next.js
- **Netlify**: Static site generation
- **Docker**: Containerized deployment

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Style

- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for code formatting
- **Conventional commits** for commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Bitcoin Core** for PSBT specification
- **Next.js** team for the amazing framework
- **React** community for excellent tooling
- **Bitcoin community** for security best practices

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Kenjibit/crypto-wallet-and-signer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Kenjibit/crypto-wallet-and-signer/discussions)
- **Wiki**: [Project Wiki](https://github.com/Kenjibit/crypto-wallet-and-signer/wiki)

## 🔮 Roadmap

### **Phase 1: Alpha (Current)** 🚧

- [x] **Bitcoin Testnet Support** - Basic PSBT creation and signing
- [x] **Air-gapped PWA Signer** - Offline transaction signing
- [x] **Monorepo Architecture** - Shared UI components and utilities

### **Phase 2: Beta** 📋

- [ ] **Bitcoin Mainnet Support** - Production-ready BTC transactions
- [ ] **Enhanced Security Features** - Multi-sig wallets, hardware integration
- [ ] **Mobile Optimization** - React Native versions

### **Phase 3: Production** 🚀

- [ ] **Ethereum Support** - Smart contract interactions
- [ ] **Multi-Crypto Expansion** - Support for major cryptocurrencies
- [ ] **Advanced Features** - DeFi integration, analytics, staking
- [ ] **Enterprise Features** - Institutional wallet support

---

**⚠️ ALPHA STAGE NOTICE**: This is **experimental alpha software**. Currently only supports Bitcoin testnet for safety. Never use with real funds until thoroughly tested and mainnet support is added.

**⭐ Star this repository** if you find it helpful!

**🔗 Follow us** for updates and new features.
