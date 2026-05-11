# SoundChain Shared Packages

This directory holds shared TypeScript packages consumed by SoundChain's
sibling apps: `web/` (soundchain.io), `arena/` (arena.soundchain.io), and
the upcoming `mint/` (mint.soundchain.io) — the NFT/wallet/marketplace
spin-off that decouples crypto UI from the music platform.

## Why shared packages

The SC repo is splitting along the Arena-precedent pattern:

- `web/` keeps SCid uploads, streaming, rewards display — the Spotify shape
- `mint/` (to come) takes NFT minting, marketplace, staking, wallet — the
  OpenSea shape
- `arena/` already split for sports/picks

Each app stays slim and ships its own native via Capacitor. Cross-app
consistency (SCid format, OGUN ABI, auth identity shape, type defs) lives
here so all three apps speak the same protocol without duplicating logic.

## Current packages

| Package | Role | Consumers |
|---|---|---|
| `@soundchain/types` | Shared TS types — Profile, Track, Wallet, Chain | web, arena, mint (future) |
| `@soundchain/scid` | SCid format, parse/validate, certificate generation | web, mint (future) |

## How consumption works

Each consuming app wires the packages via:

1. **TS path aliases** — `web/tsconfig.json` `paths` field resolves
   `@soundchain/*` to `../../packages/*/src`
2. **Next.js transpile** — `next.config.js` `transpilePackages` list
   tells Next to compile the package TS at build time (no pre-build step)

This means: edit a package file → save → web's dev server hot-reloads it.
No publish step, no build artifact, no version churn.

## Adding a new package

1. Create `packages/<name>/{package.json, src/index.ts, tsconfig.json}`
2. Add `"@soundchain/<name>"` to consuming apps' `next.config.js`
   `transpilePackages` array
3. Add the path alias to consuming apps' `tsconfig.json` `paths`

## Not yet extracted

These move to `packages/` as the split progresses:

- `@soundchain/auth` — passkey + Magic OAuth + HD wallet generation
- `@soundchain/ogun` — OGUN ABI + read-only balance helpers
- `@soundchain/ipfs` — Pinata + IPFS gateway helpers

## See also

- `CLAUDE.md` — full repo session log + architecture
- `MEMORY.md` — durable feedback memories (gitignored)
- Arena precedent: `arena/` directory
