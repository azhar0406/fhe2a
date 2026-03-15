# FHE2A — Confidential Digital License Marketplace

A G2A-style digital license marketplace where license keys are encrypted on-chain using **Zama's Fully Homomorphic Encryption (FHE)**. Buyers purchase with confidential tokens (cUSDZ), and only they can decrypt the license key — the plaintext never touches the blockchain.

**Live on Sepolia Testnet**

![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Zama FHE](https://img.shields.io/badge/Zama-fhEVM-purple)
![License](https://img.shields.io/badge/License-MIT-green)

---

## How It Works

```
Seller encrypts license key (FHE)
        ↓
Stored on-chain as euint256 (encrypted)
        ↓
Buyer pays with cUSDZ (confidential ERC-20)
        ↓
Funds held in escrow (3-day dispute window)
        ↓
Buyer reveals → MetaMask EIP-712 sign → Zama relayer decrypts
        ↓
Plaintext license key shown only to buyer
```

The smart contract never sees the plaintext key. Encryption, storage, and decryption all happen through Zama's FHE protocol.

---

## Features

- **FHE-Encrypted License Keys** — Code + PIN stored as `euint256` on-chain, decryptable only by the buyer
- **Confidential Payments** — cUSDZ (wrapped USDZ) hides transfer amounts
- **Escrow & Disputes** — 3-day dispute window with admin resolution; buyer gets refund or seller gets paid
- **Resell Marketplace** — Buyers can resell purchased licenses at any price (one resale per license, enforced on-chain)
- **Multi-Seller View** — G2A-style product pages showing all sellers sorted by price
- **Category System** — Game, Software, Subscription, Gift Card, Other (admin-extensible)
- **Admin Controls** — Pause/unpause, ban sellers, adjust fees (0–10%), manage categories
- **Dynamic Product Images** — Auto-detects dark logos and switches background for readability
- **Fully On-Chain** — No backend server needed; frontend reads directly from the blockchain

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Solidity 0.8.24, Zama fhEVM, OpenZeppelin (AccessControl, ReentrancyGuard, Pausable) |
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion |
| Wallet | wagmi, ConnectKit, ethers.js v6 |
| FHE | @zama-fhe/relayer-sdk (WASM), EIP-712 signed decryption |
| 3D | Three.js, React Three Fiber |
| Dev | Hardhat, hardhat-toolbox |
| Hosting | Vercel (frontend only — no backend required) |

---

## Project Structure

```
fhe2a/
├── contracts/
│   └── LicenseMarketplace.sol        # Core marketplace contract (FHE + escrow + disputes)
├── deploy/
│   └── 001_deploy_all.ts             # Hardhat deploy script
├── test/
│   └── LicenseMarketplace.test.ts    # Contract tests
├── frontend/
│   ├── src/
│   │   ├── app/                      # Next.js pages
│   │   │   ├── page.tsx              # Home (hero, featured, categories)
│   │   │   ├── marketplace/          # Browse & search listings
│   │   │   ├── listing/[id]/         # Product detail + buy/reveal/decrypt
│   │   │   ├── orders/               # My purchases & sales
│   │   │   ├── sell/                 # Admin-only listing creation
│   │   │   └── admin/seed/           # Seed marketplace with test data
│   │   ├── components/               # UI components
│   │   ├── hooks/                    # useMarketplace, useFHE
│   │   ├── lib/
│   │   │   ├── fhe.ts               # FHE encrypt/decrypt (Zama SDK)
│   │   │   ├── chain.ts             # Contract read helpers
│   │   │   └── contracts.ts         # ABIs & addresses
│   │   └── types/                    # TypeScript interfaces
│   └── public/wasm/                  # Zama WASM modules
├── hardhat.config.ts
└── .env.example                      # Environment template
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- MetaMask (Sepolia testnet)
- Sepolia ETH for gas ([faucet](https://sepoliafaucet.com))

### 1. Clone & Install

```bash
git clone https://github.com/azhar0406/fhe2a.git
cd fhe2a
npm install
cd frontend && npm install && cd ..
```

### 2. Environment Setup

**Root `.env`** (for contract deployment only):
```env
PRIVATE_KEY=your_deployer_private_key
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
ETHERSCAN_API_KEY=your_etherscan_key
```

**Frontend `frontend/.env.local`:**
```env
NEXT_PUBLIC_USDZ_ADDRESS=0x3edf60dd017ace33a0220f78741b5581c385a1ba
NEXT_PUBLIC_CUSDZ_ADDRESS=0x7215691f60c4fa7bb82c5ac44c7d57dc32bb0493
NEXT_PUBLIC_MARKETPLACE_ADDRESS=your_deployed_address
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
```

### 3. Compile & Deploy

```bash
npm run compile
npm run deploy:sepolia
```

Copy the deployed marketplace address into `frontend/.env.local`.

### 4. Run Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:3001

### 5. Seed Test Data

1. Go to `/admin/seed` (must be the deployer wallet)
2. Click **Seed All 12 Listings** — encrypts and creates listings on-chain
3. Browse at `/marketplace`

---

## Deploy to Vercel

The frontend is fully self-contained — no backend needed. It reads everything directly from the blockchain.

1. Import the repo on [Vercel](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Add these **Environment Variables**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_USDZ_ADDRESS` | `0x3edf60dd017ace33a0220f78741b5581c385a1ba` |
| `NEXT_PUBLIC_CUSDZ_ADDRESS` | `0x7215691f60c4fa7bb82c5ac44c7d57dc32bb0493` |
| `NEXT_PUBLIC_MARKETPLACE_ADDRESS` | `0x5A7CF0188659D84e290bC2746528987b57082D2c` |
| `NEXT_PUBLIC_CHAIN_ID` | `11155111` |
| `NEXT_PUBLIC_RPC_URL` | `https://ethereum-sepolia-rpc.publicnode.com` |

4. Deploy

---

## User Flow

### Buying a License

1. **Connect wallet** and get test tokens via **Faucet** (Mint USDZ → Wrap to cUSDZ)
2. **Browse marketplace** and click a listing
3. **Buy Now** — sets cUSDZ operator approval, calls `purchaseOnBehalf`
4. **Reveal License** — on-chain transaction marks key for decryption
5. **Decrypt License Key** — MetaMask signs EIP-712 → Zama relayer decrypts → code + PIN displayed
6. **Release Funds** — confirms satisfaction, pays seller (minus 5% fee)

### Reselling

After releasing funds, click **Resell License** → set new price → listed on marketplace. The encrypted key is reused (no re-encryption needed). Each license can only be resold once (enforced at contract level).

---

## Smart Contract

**LicenseMarketplace.sol** — Single contract handling:

| Function | Access | Description |
|----------|--------|-------------|
| `createListing` | Admin | Create new listing with FHE-encrypted code + PIN |
| `adminCreateListing` | Admin | Platform listing (seller = contract) |
| `purchaseOnBehalf` | Admin | Assign listing to buyer |
| `buyLicense` | Public | Buy with encrypted cUSDZ amount |
| `revealLicense` | Buyer | Mark license for decryption |
| `releaseFunds` | Buyer | Release escrow to seller (after dispute window) |
| `openDispute` | Buyer | Dispute within 3-day window |
| `resolveDispute` | Admin | Resolve dispute (refund or payout) |
| `resellLicense` | Buyer | Create new listing from purchased license (once only) |
| `cancelListing` | Seller | Cancel unsold listing |

---

## Contract Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| USDZ (plaintext stablecoin) | `0x3edf60dd017ace33a0220f78741b5581c385a1ba` |
| cUSDZ (confidential wrapped) | `0x7215691f60c4fa7bb82c5ac44c7d57dc32bb0493` |
| LicenseMarketplace | `0x5A7CF0188659D84e290bC2746528987b57082D2c` |

---

## FHE Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Browser    │     │  Blockchain  │     │  Zama Relayer   │
│             │     │  (Sepolia)   │     │  (Testnet)      │
│ Encrypt key ├────►│ Store euint256├────►│ Re-encrypt for  │
│ via WASM    │     │ in contract  │     │ buyer's keypair │
│             │◄────┤              │◄────┤                 │
│ Decrypt key │     │ ACL checks   │     │ EIP-712 auth    │
└─────────────┘     └──────────────┘     └─────────────────┘
```

- **Encryption**: Client-side via `@zama-fhe/relayer-sdk` WASM modules
- **Storage**: `euint256` handles on-chain (Zama coprocessor)
- **Decryption**: EIP-712 signature → Zama relayer re-encrypts → client decrypts with ephemeral keypair
- **Access Control**: Zama ACL grants decrypt permission only to the buyer

---

## Scripts

```bash
# Root (contract development)
npm run compile          # Compile contracts
npm run test             # Run Hardhat tests
npm run deploy:sepolia   # Deploy to Sepolia

# Frontend
cd frontend
npm run dev              # Dev server (port 3001)
npm run build            # Production build
npm run lint             # ESLint
```

---

## License

MIT
