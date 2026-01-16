# ERC-721 UX Playground (Sepolia)

A front-end Ethereum dashboard built to showcase ERC-721 interactions on the Sepolia testnet.
It connects to MetaMask, reads live chain data, and lets users explore and mint test NFTs
across multiple mock collections. The focus is on clear UX flows for common NFT actions
(read, mint, browse metadata, and wallet inventory).

## Highlights
- Live Sepolia chain info with block updates.
- Fake BAYC: claim a token and explore metadata by token id.
- Fake Nefturians: purchase tokens, view price/supply, and browse a wallet inventory.
- Fake Meebits: signature-based claim flow with availability checks and IPFS metadata.
- Network guardrails that redirect when the wallet is not on Sepolia.

## Tech Stack
- React 19 + Vite
- ethers.js for wallet and contract calls
- React Router for navigation

## Local Setup
Prerequisites:
- Node.js and npm
- MetaMask with Sepolia enabled and funded (test ETH)

Run the app:
```bash
npm install
npm run dev
```

Then open `http://localhost:5173` and connect MetaMask.

Production build:
```bash
npm run build
npm run preview
```

## Contracts Used (Sepolia)
- Fake BAYC: `0x1dA89342716B14602664626CD3482b47D5C2005E`
- Fake Nefturians: `0x9bAADf70BD9369F54901CF3Ee1b3c63b60F4F0ED`
- Fake Meebits: `0xD1d148Be044AEB4948B48A03BeA2874871a26003`
- Fake Meebits Claimer: `0x5341e225Ab4D29B838a813E380c28b0eFD6FBa55`

Read-only calls use the public Sepolia RPC:
`https://ethereum-sepolia-rpc.publicnode.com`

## Notes
- Token metadata is fetched from tokenURI and resolved from IPFS when needed.
- Signature data for Fake Meebits is bundled in `public/claimer-signatures.json` and can be auto-filled from the UI.
