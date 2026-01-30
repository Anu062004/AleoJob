<div align="center">

# 🔐 AleoJob

### **Privacy-First Decentralized Job Marketplace**

*Built on Aleo • Powered by Zero-Knowledge Proofs*

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Aleo](https://img.shields.io/badge/Aleo-Blockchain-8B5CF6?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0id2hpdGUiLz48L3N2Zz4=)](https://aleo.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<br />

[**Live Demo**](https://aleojob.vercel.app) • [**Get Started**](#-quick-start) • [**Documentation**](#-documentation)

<br />

<img src="https://img.shields.io/badge/⚠️_TESTNET_ONLY-No_Real_Value-orange?style=flat-square" alt="Testnet Warning" />

</div>

---

## 📖 What is AleoJob?

**AleoJob** is a decentralized job marketplace that uses **zero-knowledge proofs** to enable private, anonymous job matching. Built on the Aleo blockchain, it allows job seekers and employers to connect without exposing personal information, credentials, or transaction history.

### Key Innovation

Traditional job platforms require users to share personal data, work history, and salary expectations. AleoJob uses Aleo's private record system and zero-knowledge cryptography to verify qualifications and build reputation **without revealing identity**.

### How It Works

1. **Job Seekers** pay 1 Aleo credit to access the platform and browse jobs anonymously
2. **Job Givers** pay 3 Aleo credits to post unlimited job listings
3. **Applications** are submitted with encrypted credentials stored privately
4. **Reputation** builds on-chain through completed jobs, all while maintaining privacy
5. **Payments** are handled via escrow smart contracts for secure transactions

### Privacy Guarantees

- 🔒 **Identity Protection** — Your real identity is never exposed
- 🛡️ **ZK Verification** — Prove qualifications without revealing personal data
- 💰 **Private Transactions** — Payment amounts and addresses remain confidential
- 🎭 **Anonymous Matching** — Connect with opportunities without doxxing

---

## 🚀 Core Features

### For Job Seekers
- **Anonymous Job Browsing** — Browse all available opportunities without revealing identity
- **Private Applications** — Submit encrypted resumes and cover letters
- **Reputation Building** — Build verifiable on-chain reputation scores
- **Secure Payments** — Receive payments through escrow smart contracts

### For Job Givers
- **Private Job Postings** — Post jobs with budget ranges visible only to matched candidates
- **Candidate Discovery** — Find qualified applicants through ZK-verified credentials
- **Reputation Tracking** — Build trust through on-chain reputation scores
- **Payment Management** — Secure escrow system for job completion

### Platform Features
- **Leo Wallet Integration** — Seamless connection with Aleo's official wallet
- **Zero-Knowledge Proofs** — Verify qualifications without exposing data
- **On-Chain Reputation** — Transparent reputation system with privacy protection
- **Modern UI/UX** — Premium dark theme with intuitive dashboards

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

Before you begin, ensure you have:
- **Node.js 18+** installed
- **npm** or **yarn** package manager
- **Leo Wallet** browser extension ([Download here](https://leo.app/))
- **Git** for cloning the repository

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Anu062004/AleoJob.git
   cd AleoJob
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` with your configuration (see [Environment Variables](#-environment-variables) section below)

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

6. **Connect your wallet**
   Install the Leo Wallet extension and connect to the Aleo testnet to start using the platform.

---

## 📁 Project Structure

```
AleoJob/
├── app/                          # Next.js 14 App Router
│   ├── api/                     # API routes (Next.js API)
│   │   ├── aleo/               # Aleo blockchain interactions
│   │   ├── jobs/                # Job management endpoints
│   │   ├── profile/            # User profile endpoints
│   │   └── reputation/          # Reputation calculation
│   ├── giver/                   # Job Giver dashboard page
│   ├── seeker/                  # Job Seeker dashboard page
│   ├── jobs/                    # Job listings and details
│   ├── leaderboard/             # Reputation leaderboard
│   ├── page.tsx                 # Landing page
│   └── layout.tsx               # Root layout
├── components/                   # React components
│   ├── ui/                      # Base UI components (Button, Card, Badge, etc.)
│   ├── Header.tsx               # Navigation header
│   ├── WalletProvider.tsx        # Aleo wallet context provider
│   ├── PaymentGate.tsx          # Payment barrier component
│   ├── ProfileEditor.tsx        # Profile management
│   └── CVUpload.tsx             # Resume upload component
├── leo-programs/                # Aleo Leo smart contracts
│   ├── access_control/          # Access control program
│   ├── job_registry/            # Job registry program
│   ├── reputation/              # Reputation program
│   └── escrow/                  # Escrow program
├── lib/                         # Utilities and services
│   ├── aleo-client.ts          # Aleo blockchain client
│   ├── aleo-service.ts         # Aleo service layer
│   ├── supabaseClient.ts       # Supabase client
│   └── credit-transfer.ts      # Credit transfer utilities
├── backend/                     # Backend utilities
│   └── lib/                    # Server-side libraries
└── supabase/                    # Database migrations
    └── migrations/             # SQL migration files
```

---

## 🔑 Wallet Integration

AleoJob integrates with the **Leo Wallet** using the official Aleo wallet adapter. The wallet is required for:

- **Authentication** — Connect your Aleo address to the platform
- **Payments** — Pay access fees (1 credit for seekers, 3 for givers)
- **Transactions** — Interact with Leo smart contracts
- **Identity** — Your wallet address serves as your anonymous identity

### Usage Example

```tsx
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

function MyComponent() {
  const { connected, address, executeTransaction } = useWallet();
  
  if (!connected) {
    return <ConnectWalletButton />;
  }
  
  return <div>Connected: {address}</div>;
}
```

### Getting Testnet Credits

To use AleoJob on testnet, you'll need Aleo testnet credits. You can obtain them from:
- [Aleo Faucet](https://faucet.aleo.org/) (if available)
- Aleo Discord community
- Testnet credit distribution channels

---

## 💳 Payment System

AleoJob uses a simple, transparent fee structure:

| Role | One-Time Fee | What You Get |
|------|-------------|--------------|
| **Job Giver** | 3 Aleo Credits | Post unlimited jobs, access all features |
| **Job Seeker** | 1 Aleo Credit | Browse all jobs, apply to opportunities |

### How Payments Work

1. **Access Payment** — One-time payment processed on-chain via Leo smart contracts
2. **Private Records** — Payment verification stored in private Aleo records
3. **Lifetime Access** — Pay once per wallet address for unlimited use
4. **No Hidden Fees** — Transparent pricing with no recurring charges

> 💡 **Note**: Payments are processed on Aleo testnet. Testnet credits have no real value and are for development/testing only.

---

## 🧪 Leo Smart Contracts

AleoJob uses four core Leo programs deployed on the Aleo blockchain:

### Available Programs

1. **Access Control** (`access_control.aleo`)
   - Manages paid access for job seekers (1 credit) and job givers (3 credits)
   - Issues private access records for platform entry

2. **Job Registry** (`job_registry.aleo`)
   - Handles private job postings and applications
   - Stores job details in private records visible only to matched parties

3. **Reputation** (`reputation.aleo`)
   - Tracks on-chain reputation scores for both seekers and givers
   - Updates reputation privately after job completion

4. **Escrow** (`job_marketplace_escrow_engine.aleo`)
   - Manages payment escrow for job completion
   - Secures payments until work is verified

### Building and Deploying

```bash
# Navigate to a program directory
cd leo-programs/access_control

# Build the program
leo build

# Deploy to testnet (requires Aleo credits)
leo deploy --network testnet
```

> 📝 **Note**: All programs are currently deployed on Aleo testnet. Production deployment requires mainnet Aleo credits.

---

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js development server (port 3000) |
| `npm run build` | Build the application for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint to check code quality |

### Development Workflow

```bash
# Start development with hot reload
npm run dev

# Build for production
npm run build

# Run production build locally
npm run start

# Check code quality
npm run lint
```

---

## 🌐 Environment Variables

Create a `.env.local` file in the root directory. You can copy from `.env.example`:

```bash
cp .env.example .env.local
```

### Required Configuration

```env
# Aleo Network Configuration
NEXT_PUBLIC_ALEO_NETWORK=testnet
NEXT_PUBLIC_ALEO_RPC_URL=https://api.explorer.aleo.org/v1
```

### Optional Configuration

For development/testing purposes, you can optionally add:

```env
# Supabase Configuration (if using database features)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Note: Never commit .env.local to version control
# Private keys and sensitive credentials should be kept secure
```

> ⚠️ **Security Note**: Never commit your `.env.local` file or share private keys. The `.env.example` file contains only placeholder values for reference.

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/your-feature-name`)
3. **Make your changes** and test thoroughly
4. **Commit with clear messages** (`git commit -m 'Add: description of changes'`)
5. **Push to your fork** (`git push origin feature/your-feature-name`)
6. **Open a Pull Request** with a detailed description

### Contribution Guidelines

- Follow the existing code style and conventions
- Add comments for complex logic
- Update documentation for new features
- Test your changes before submitting
- Keep commits focused and atomic

### Areas for Contribution

- 🐛 Bug fixes and improvements
- ✨ New features and enhancements
- 📚 Documentation improvements
- 🎨 UI/UX enhancements
- 🧪 Test coverage
- 🔒 Security improvements

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🏗️ Architecture

AleoJob uses a **hybrid architecture** combining on-chain and off-chain components:

### On-Chain (Aleo Blockchain)
- **Smart Contracts** — Leo programs for access control, job registry, reputation, and escrow
- **Private Records** — Encrypted data storage for sensitive information
- **Payment Processing** — On-chain credit transfers and verification

### Off-Chain (Supabase)
- **Database** — PostgreSQL for efficient querying and indexing
- **File Storage** — Encrypted resume/CV storage
- **API Layer** — Next.js API routes for business logic

### How They Work Together

1. **ZK Proof Hashes** — Bridge on-chain verification with off-chain data
2. **Private Records** — Sensitive data stored on-chain, metadata off-chain
3. **Hybrid Queries** — Fast searches using database, verification using blockchain

## 🙏 Acknowledgments

- **[Aleo](https://aleo.org/)** — For building the privacy-focused blockchain with native ZK support
- **[Provable Labs](https://provable.xyz/)** — For the Leo Wallet adapter
- **[Vercel](https://vercel.com/)** — For hosting and deployment infrastructure
- **[Supabase](https://supabase.com/)** — For database and storage services

---

<div align="center">

**Built with 💜 for privacy**

[⬆️ Back to Top](#-aleojob)

</div>
