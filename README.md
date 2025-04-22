# Gnosis Dapp Boilerplate

A boilerplate to kickstart your Gnosis Chain dApp development. This starter kit includes:

- **UX‑Friendly Wallet Integration**: MetaMask, WalletConnect, and social logins (Google, Farcaster) via Dynamic Labs SDK for frictionless onboarding.
- **One‑Click Token Deployments**: Deploy your own ERC‑20 and ERC‑721 tokens with a guided UI handling constructor parameters and gas estimation.
- **Rock‑Paper‑Scissors Demo**: On‑chain commit‑and‑reveal game built with Shutter SDK on Gnosis.

---

## 📦 Tech Stack

- **Framework**: Next.js 13 
- **UI Library**: React + Ant Design
- **Wallet & Auth**: Dynamic Labs SDK (`@dynamic-labs/sdk-react-core`, `@dynamic-labs/ethers-v6`, `@dynamic-labs/ethereum`)
- **Blockchain**: Gnosis Chain via `ethers` & `viem`
- **Encryption**: Shutter Network SDK (`@shutter-network/shutter-sdk`)
- **Language**: TypeScript

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or above (Recommended v20.x)
- **npm**, **yarn**, or **pnpm**
- A Gnosis Chain wallet (e.g., MetaMask)

### Installation

```bash
# Clone the repo
git clone https://github.com/your-org/gnosis-dapp-boilerplate.git
cd gnosis-dapp-boilerplate

# Install dependencies
npm install      # or yarn install, pnpm install
```

### Environment Variables

Create a `.env.local` file in the project root and add the following keys:

```dotenv
# Pre‑deployed contract addresses for minting demo (optional)
NEXT_PUBLIC_ERC20_ADDRESS=0xYourERC20Address
NEXT_PUBLIC_ERC721_ADDRESS=0xYourERC721Address

# Dynamic Labs environment ID for social logins
NEXT_PUBLIC_DYNAMIC_ENV_ID=your-dynamic-env-id
```

### Running Locally

```bash
npm run dev         # starts Next.js in development mode
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build       # builds the optimized production bundle
npm run start       # starts the production server
```
---

## 🤝 Contributing

1. Fork this repository.
2. Create a feature branch (`git checkout -b feature/YourFeature`).
3. Commit your changes (`git commit -m 'Add YourFeature'`).
4. Push to the branch (`git push origin feature/YourFeature`).
5. Open a Pull Request.

Please follow the existing coding style and ensure all new features are covered by basic tests or manual QA.

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](./LICENSE) for more information.

