# SoundChain Mint

The NFT/wallet/marketplace spin-off from soundchain.io. Part of the 8-phase
SoundChain ecosystem split (Arena precedent — arena.soundchain.io extracted
sports/picks; mint.soundchain.io extracts NFT minting + marketplace +
staking + wallet).

## What this app owns

- NFT minting (CreateModal flow, lifted from web/)
- Marketplace (buy / sell / auction) for SCid-backed editions
- OGUN staking, LP staking, swap
- Wallet aggregator (Magic / MetaMask / Coinbase / WalletConnect / HD)
- RoyaltySplitter — post-mint collaborator royalty splits
- MerkleClaim settlement layer (snapshot/root stays on SC main)

## What this app does NOT own

- Music streaming, uploads, SCid registration (stays on soundchain.io)
- Feed, posts, comments, profiles (stays on soundchain.io)
- Streaming rewards accumulation (stays on soundchain.io, claim happens here)
- Sports / picks / fantasy (stays on arena.soundchain.io)

## Stack (greenfield — no legacy debt inherited)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (pages router) | Stable, matches `web/`+`arena/` |
| Wallet/signing | **viem** + **wagmi v2** | Replaces ethers v5/v6 + web3.js 1.x mess on SC main |
| Connect modal | **@reown/appkit** | Successor to @web3modal/ethers5 — needs fresh cloud.reown.com projectId |
| Identity | passkey + HD wallet | No Magic SDK — mint is post-Magic |
| State | @tanstack/react-query (wagmi peer) | Server-state caching |
| Styling | Tailwind | Same as web/ + arena/ |
| Native shell | Capacitor 6 | iOS + Android via `yarn cap:add:*` |

## Shared packages

Both `@soundchain/types` and `@soundchain/scid` are consumed from the
repo-root `packages/` directory via `tsconfig` path aliases +
`transpilePackages` in `next.config.js`. Same pattern as `web/`.

## Setup (when Frank greenlights deployment)

```bash
cd mint
yarn install
yarn dev  # localhost:3002
```

For Vercel deploy (Frank's hands needed):
1. Create new Vercel project pointed at `mint/` as root
2. Add custom domain `mint.soundchain.io` (DNS CNAME)
3. Provision env vars:
   - `NEXT_PUBLIC_REOWN_PROJECT_ID` (fresh cloud.reown.com project)
   - `MONGODB_URI` (same as web/arena, separate db namespace)
   - `MINT_SESSION_SECRET` (32+ char random, like ARENA_SESSION_SECRET)
   - `WALLET_CONNECT_PROJECT_ID` (legacy fallback if needed)

## Phase status

- **Phase 0:** Audit — done
- **Phase 1:** Shared `packages/` extraction — shipped (`508feba`)
- **Phase 2:** Mint shell stood up — **this directory**
- **Phase 3+:** Port mint flow, marketplace, staking, dual-deploy w/ SC main
- **Phase 6:** Strip crypto from SC main (after Phase 5 transition window)
- **Phase 7:** Capacitor native builds for all three apps

See `/CLAUDE.md` for the full session log and roadmap.
