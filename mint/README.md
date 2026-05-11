# SoundChain Mint

NFT minting, marketplace, staking, and wallet aggregation — sibling app to
`web/` and `arena/` in the SoundChain monorepo.

## Setup

```bash
cd mint
yarn install
yarn dev   # localhost:3002
```

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (pages router) |
| Wallet/signing | viem + wagmi v2 |
| Connect modal | Reown AppKit (see `REOWN.md` for wire-up) |
| Native shell | Capacitor 6 (see `NATIVE.md` for build) |
| Styling | Tailwind |

## Shared packages

Consumed from repo-root `packages/` via `tsconfig` path aliases +
`transpilePackages` in `next.config.js`:

- `@soundchain/types` — shared TS shapes
- `@soundchain/scid` — SCid format, parse, certificate
- `@soundchain/contracts` — on-chain addresses + ABI fragments

## Routes

| Route | Function |
|---|---|
| `/` | Landing |
| `/mint` | SCid input → mint flow |
| `/mint/[scid]` | createEdition + safeMintToEditionQuantity |
| `/marketplace` | Listing grid |
| `/marketplace/[id]` | Buy flow w/ 7-token PaymentType |
| `/stake` | OGUN stake / unstake |
| `/wallet` | Connected wallet view |
| `/api/health` | Provisioning status |

## Required Vercel env vars

| Name | Source | Required for |
|---|---|---|
| `NEXT_PUBLIC_REOWN_PROJECT_ID` | cloud.reown.com | Connect modal |
| `MONGODB_URI` | Atlas | Server-side reads |
| `MINT_SESSION_SECRET` | `openssl rand -base64 48` | Auth cookies |

Per the agent-mode trap rule (`feedback_vercel_env_add_agent_mode_trap.md`),
always set env vars with `--value "$VAL" --yes`, never stdin pipe.
