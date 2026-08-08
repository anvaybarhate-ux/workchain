# WorkChain

Decentralized freelance escrow protocol — trustless milestone payments, on-chain reputation, and community dispute resolution powered by Ethereum smart contracts.

**Live demo:** [workchain-pi.vercel.app](https://workchain-pi.vercel.app)

---

## About

WorkChain removes the need for a trusted middleman between clients and freelancers. Instead of a platform holding funds and adjudicating disputes, a smart contract handles escrow, payments are released automatically when milestones are approved, and disputes are resolved by the community rather than a centralized support team.

This is my first end-to-end blockchain project, built with the help of AI coding agents alongside my own work.

## Features

- **Trustless milestone payments** — funds are locked in a smart contract when a job is posted and released automatically once a milestone is approved.
- **On-chain reputation** — work history is recorded on the blockchain instead of being owned by a single platform.
- **Community dispute resolution** — contested milestones are resolved through community voting instead of a centralized support process.
- **Wallet-based auth** — no accounts or passwords, just connect a wallet.

## Tech stack

| Layer | Technology |
|---|---|
| Smart contracts | Solidity |
| Frontend | TypeScript, JavaScript, HTML/CSS |
| Backend / scripting | Python |
| Wallet | MetaMask |
| Network | Ethereum (EVM-compatible), tested on Sepolia testnet |

## Getting started

### Prerequisites

- [MetaMask](https://metamask.io/) browser extension
- MetaMask connected to the **Sepolia** test network
- Sepolia test ETH (available from a [Sepolia faucet](https://sepoliafaucet.com/)) to pay gas fees

### Usage

1. Visit the [live demo](https://workchain-pi.vercel.app).
2. Connect your MetaMask wallet.
3. Make sure your wallet is set to the Sepolia test network.
4. Post a job (as a client) or browse and accept a job (as a freelancer).
5. Funds for a milestone are locked in the smart contract on posting, and released once the milestone is approved.

### Running locally

```bash
# Clone the repository
git clone https://github.com/anvaybarhate-ux/workchain.git
cd workchain

# Install dependencies
npm install

# Run the development server
npm run dev
```

Update any contract addresses or network configuration as needed to point at your own deployment or the existing Sepolia deployment.

## How it works

1. **Job posting** — a client posts a job and funds a milestone through the smart contract.
2. **Escrow** — funds are held by the contract, not by WorkChain or any third party.
3. **Delivery & approval** — the freelancer delivers the work; once approved, the contract releases the payment automatically.
4. **Reputation** — completed jobs update an on-chain reputation record for both parties.
5. **Disputes** — if a milestone is contested, the outcome is decided through community voting and recorded on-chain.

## Status

This project is a work in progress and currently deployed and tested on the **Sepolia testnet**. It is designed to work on any EVM-compatible chain. Feedback, issues, and pull requests are welcome — this is a learning project and I'm still improving it.

## Disclaimer

This project is currently for testing and educational purposes only. It has not been audited, and no real funds should be used with it.


## Contact

Feedback and contributions are welcome — feel free to open an issue or pull request on this repository.
