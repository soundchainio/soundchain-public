# Phase 6 — SC main crypto strip audit (DO NOT EXECUTE YET)

**Status: AUDIT ONLY. The actual strip blocks on Phase 5 transition window
completing (users migrated to mint.soundchain.io for wallet/mint/marketplace
flows). Stripping while mint isn't reachable would break the user experience.**

When Phase 5 transition is done, this doc is the checklist for Phase 6.

## Strippable from web/ (when mint is live + users migrated)

### 1. Dependencies (`web/package.json`)

Drop:
- `ethers@^5.7.2` — only used by useBlockchainV2 + StakingPanel
- `ethers5` (alias) — same as above
- `web3@^4.16` — only useBlockchainV2 + useBlockchain
- `@types/web3` — paired with web3
- `@web3modal/ethers5@5.1.11` — Web3ModalContext (Bug #29 dead anyway)
- `@coinbase/wallet-sdk@^4.3.7` — only useUnifiedWallet
- `@metamask/jazzicon@^2.0.0` — only multi-wallet aggregator avatars
- `@metamask/onboarding@^1.0.1` — only WalletConnectButton
- `bn.js` — Web3.js v4 broke this anyway

Keep:
- `magic-sdk@28.4.0` — auth still goes through Magic OAuth
- `@magic-ext/oauth2@15.5.1` — Google/Discord/Twitch login
- `@magic-sdk/commons@24.0.0` — Magic peer dep
- `@noble/hashes@2.0.1` — Nostr DM lock (do NOT remove)

Expected `node_modules` size reduction: ~120MB → ~55MB.
Expected bundle size: web/ first-load 720KB → ~450-500KB.

### 2. Components — user-facing surfaces

Strippable when mint app handles them:
- `web/src/components/modals/CreateModal.tsx` (1200 lines — mint flow)
- `web/src/components/modals/MakePostPermanentModal.tsx` (350 lines)
- `web/src/components/modals/TipPostModal.tsx` (200 lines — or keep as deep-link to mint)
- `web/src/components/dex/StakingPanel.tsx` (836 lines)
- `web/src/components/dex/MultiWalletAggregator.tsx` (737 lines)
- `web/src/components/dex/TrackNFTCard.tsx` (~500 lines)
- `web/src/components/dex/WalletConnectButton.tsx`

Replace with: lightweight pills in the same locations pointing at `mint.soundchain.io/<route>`.

### 3. Hooks / contexts — deep infra

- `web/src/hooks/useBlockchain.ts` (legacy)
- `web/src/hooks/useBlockchainV2.ts` (~2500 lines)
- `web/src/hooks/useBlockchainV2_optimized.ts`
- `web/src/hooks/useMetaMask.ts`
- `web/src/contexts/UnifiedWalletContext.tsx`
- `web/src/contexts/Web3ModalContext.tsx`
- `web/src/contexts/MultiChainContext.tsx`

### 4. `useMagicContext.tsx` — SPLIT, don't strip

The Magic OAuth half (Google/Discord/Twitch login) stays on SC. The wallet
half (web3 provider, balance methods, sign methods) moves to mint app's
WalletProvider. Refactor — don't delete.

Methods to keep on SC:
- `loginWithEmailOTP`, `loginWithOAuth`
- `logout`, `isLoggedIn`
- `getUser` (email + OAuth metadata)

Methods to remove from SC (and reimplement in mint via wagmi):
- All `web3.eth.*` calls
- All `magic.rpcProvider` access
- `getUserWalletAddress()` resolution chain (mint uses wagmi `useAccount`)
- All `signTransaction` / `sendTransaction` paths

### 5. Mega-router (`pages/dex/[...slug].tsx`) — surgical excision

This 8900-line file mixes wallet UI w/ feed UI. Sections to strip:
- Wallet view rendering (lines ~5000-6100 approx — Multi-wallet, send/receive/sweep panels)
- Marketplace view rendering (lines ~7000-8200 approx)
- Buy modal trigger paths
- "Connect Wallet" CTAs

Sections to keep:
- Profile view, feed view, post view, comment threads
- Wall posts, Stories
- Settings, notifications, pulse

Replace stripped sections with redirect-on-mount to `mint.soundchain.io/<route>`.

### 6. API routes — keep server-side, strip client-side

These stay on `web/src/pages/api/` (server-side, not visible to Apple):
- `/api/wall/*`, `/api/posts/*`, `/api/comments/*`
- `/api/scid/*` (SCid CRUD)
- `/api/feed/*`, `/api/stories/*`
- `/api/identity/*` (auth, phone, passkey)

These move to mint's `/api/`:
- `/api/marketplace/*`
- `/api/nft/*` (mint metadata, edition tracking)
- `/api/staking/*`
- `/api/merkle/*` (claim proof generation — RECONSIDER: this could stay on SC
  since SC owns the rewards accumulator)

Decision on Merkle: **stays on SC**. SC is the source of truth for streaming
earnings. Mint just consumes the proof + signs the claim tx.

### 7. Config + env vars

Drop from `web/.env`:
- `NEXT_PUBLIC_OGUN_ADRESS` (typo preserved from original)
- `NEXT_PUBLIC_NFT_ADDRESS`
- `NEXT_PUBLIC_MARKETPLACE_ADDRESS`
- `NEXT_PUBLIC_AUCTION_ADDRESS`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_TREASURY` (only if SC stops doing platform-fee transfers)
- `ALCHEMY_API_KEY` (if no other reads)

Keep:
- `MAGIC_PRIVATE_KEY` (server-side OAuth verification)
- `NEXT_PUBLIC_MAGIC_KEY` (client OAuth)
- All Pinata + Mongo + Sentry vars

### 8. Type definitions

Drop:
- `web/src/types/web3-v1-contracts/*` (legacy)
- `web/src/types/web3-v2-contracts/*`
- `web/src/types/WindowTypes.ts` (the `window.ethereum` shim — Apple WebView doesn't expose this anyway)

## Strip order (when Phase 5 transition window completes)

1. Drop API routes that mint owns (`/api/marketplace/*` etc.)
2. Remove components from `pages/dex/[...slug].tsx`
3. Remove standalone components (CreateModal, TipModal, StakingPanel, etc.)
4. Remove hooks/contexts
5. Refactor `useMagicContext.tsx` to auth-only
6. Drop deps from package.json + run `yarn install`
7. Verify build: `yarn build` should drop ~270KB from first-load JS
8. Verify all user paths still work (feed, post, comment, stories, settings, profile, search)
9. Deploy and verify chunk hash + alias
10. Monitor Sentry for "useBlockchainV2 undefined" / "useMagicContext.web3 undefined" errors

## Risk gates (do NOT proceed without)

- ✓ `mint.soundchain.io` deployed and reachable
- ✓ All mint flows verified live (mint, marketplace buy, stake, claim)
- ✓ ≥80% of OGUN holders have visited mint at least once (track via analytics)
- ✓ SC main has the redirect pills on every wallet/mint surface for 2+ weeks
- ✓ No user reports of "can't find wallet" on /support
- ✓ Backup branch with full pre-strip state pushed to `pre-phase6-snapshot`
- ✓ Frank greenlights the strip

## Rollback

If Phase 6 breaks anything:
```bash
git revert <strip-commit-sha>
git push origin main
vercel promote <previous-deployment-url>
```

Branch `pre-phase6-snapshot` preserves the full pre-strip state for
copy-paste recovery if Sentry exposes a missed dependency.
