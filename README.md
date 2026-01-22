<div align="center">

# 🔐 AleoJob

### **Privacy-First Decentralized Job Marketplace**

*Built on Aleo • Powered by Zero-Knowledge Proofs*

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Aleo](https://img.shields.io/badge/Aleo-Blockchain-8B5CF6?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0id2hpdGUiLz48L3N2Zz4=)](https://aleo.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<br />

[**Live Demo**](https://aleojob.vercel.app) • [**Documentation**](#-documentation) • [**Get Started**](#-quick-start)

<br />

<img src="https://img.shields.io/badge/⚠️_TESTNET_ONLY-No_Real_Value-orange?style=flat-square" alt="Testnet Warning" />

</div>

---

## ✨ Overview

**AleoJob** is a privacy-preserving job marketplace that leverages Aleo's zero-knowledge proof technology to connect job seekers and employers while keeping sensitive data completely private.

Unlike traditional platforms, AleoJob ensures:
- 🔒 **Private Credentials** — Your identity is never exposed
- 🛡️ **ZK Verification** — Prove qualifications without revealing personal data
- 💰 **On-chain Payments** — Secure Aleo credit transactions
- 🎭 **Anonymous Matching** — Connect with opportunities privately

---

## 🚀 Features

| Feature | Description |
|---------|-------------|
| **🔐 Privacy-First** | Zero-knowledge proofs protect your identity throughout the hiring process |
| **👔 Job Givers** | Post jobs privately, pay 3 Aleo credits, find qualified candidates |
| **🔍 Job Seekers** | Browse opportunities, pay 1 Aleo credit, apply anonymously |
| **🦁 Leo Wallet** | Seamless integration with Leo Wallet for secure authentication |
| **⭐ Reputation System** | Build on-chain reputation without compromising privacy |
| **📊 Dashboard** | Beautiful, modern UI to manage applications and postings |

---

## 🛠️ Tech Stack

<table>
<tr>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=nextjs" width="48" height="48" alt="Next.js" />
<br>Next.js 14
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=react" width="48" height="48" alt="React" />
<br>React 18
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=ts" width="48" height="48" alt="TypeScript" />
<br>TypeScript
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=tailwind" width="48" height="48" alt="Tailwind" />
<br>Tailwind CSS
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=vercel" width="48" height="48" alt="Vercel" />
<br>Vercel
</td>
</tr>
</table>

**Additional Technologies:**
- **Aleo Blockchain** — Privacy-focused L1 with native ZK support
- **Leo Wallet Adapter** — Official wallet integration
- **Framer Motion** — Smooth animations
- **Zustand** — Lightweight state management

---

## 📦 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- [Leo Wallet](https://leo.app/) browser extension

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/aleojob.git
cd aleojob

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
aleojob/
├── app/                    # Next.js App Router pages
│   ├── giver/             # Job Giver dashboard
│   ├── seeker/            # Job Seeker dashboard
│   ├── login/             # Authentication flow
│   ├── jobs/              # Job listings
│   ├── leaderboard/       # Reputation rankings
│   └── api/               # API routes
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   ├── PaymentGate.tsx   # Payment barrier component
│   ├── WalletProvider.tsx # Aleo wallet context
│   └── ConnectWalletButton.tsx
├── leo-programs/          # Aleo Leo smart contracts
├── lib/                   # Utilities and clients
└── hooks/                 # Custom React hooks
```

---

## 🔑 Wallet Integration

AleoJob uses the official Aleo wallet adapter for secure authentication:

```tsx
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';

function MyComponent() {
  const { publicKey, connected } = useWallet();
  
  if (!connected) {
    return <ConnectWalletButton />;
  }
  
  return <div>Connected: {publicKey}</div>;
}
```

---

## 💳 Payment System

| Role | Cost | Access |
|------|------|--------|
| **Job Giver** | 3 Aleo | Post unlimited jobs |
| **Job Seeker** | 1 Aleo | View & apply to all jobs |

Payments are processed on-chain using Aleo credits.

---

## 🧪 Leo Smart Contracts

The platform uses Leo programs for on-chain logic:

```bash
# Build Leo program
cd leo-programs
leo build

# Deploy to testnet
leo deploy --network testnet
```

### Key Programs
- **Membership Badge** — Private membership verification
- **Job Posting** — Create and manage job listings
- **Reputation** — Track on-chain reputation scores

---

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## 🌐 Environment Variables

Create a `.env.local` file:

```env
# Aleo Network Configuration
NEXT_PUBLIC_ALEO_NETWORK=testnet
NEXT_PUBLIC_ALEO_RPC_URL=https://api.explorer.aleo.org/v1

# Optional: Default test credentials
NEXT_PUBLIC_ALEO_PRIVATE_KEY=your_private_key
NEXT_PUBLIC_ALEO_ADDRESS=your_address
```

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Aleo](https://aleo.org/) — For building the privacy-focused blockchain
- [Demox Labs](https://demoxlabs.xyz/) — For the Leo Wallet adapter
- [Vercel](https://vercel.com/) — For hosting and deployment

---

<div align="center">

**Built with 💜 for privacy**

[⬆️ Back to Top](#-aleojob)

</div>
