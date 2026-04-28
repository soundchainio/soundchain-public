# CLAUDE.md - SoundChain Development Guide

## ⚠️ SESSION START PROTOCOL (MANDATORY — READ BEFORE ANY CODE)

Before writing ANY code, read these 4 files and CONFIRM to User:
1. **This file (CLAUDE.md)** — architecture, contracts, protected files
2. **sarg.md** — `cat ~/.claude/projects/-Users-soundchain/memory/sarg.md | head -80`
3. **MEMORY.md** — `cat ~/.claude/projects/-Users-soundchain/memory/MEMORY.md | head -60`
4. **bug-report.md** — `cat ~/.claude/projects/-Users-soundchain/memory/bug-report.md | tail -40`

Then say: **"Scoped CLAUDE.md, sarg.md, MEMORY.md, bug-report.md. Synced on [brief summary]. Ready to work."**

**DO NOT START CODING UNTIL CONFIRMED.** User's direct order. See `feedback_session_start_protocol.md`.

---

**Last Updated:** April 28, 2026 (Sarg)
**Project Start:** July 14, 2021
**Total Commits:** 10,000+ (across all branches)

---

## 🎰 SESSION: Apr 28, 2026 (Sarg, later2) — Arena Picks ERC-20 wagers (OGUN + USDC + USDT + WETH + LINK + AVAX + POL)

### Context

User confirmed MetaMask connect on `/wallet` works end-to-end (Bug #77 fix landed). First on-chain pick attempt today: take flow only offered POL as a stake option. *"what happened to apl the 24 tokens list we had that we support? pla brong that back i wanted to place a bet using Ogun and i want to test the ogun rewarfs for usinb ohun on the open picks"*

Original Apr 27 on-chain rebuild (`3e84fbf`) explicitly shipped POL-only as v1 with this comment in `contract.ts`: *"v1 ships POL-only. ERC-20 (OGUN, USDC) requires an approve()+join() bundled UX which is deferred until basic flow is verified on mainnet."* Mainnet now verified (commissioner funded with 6 POL, MM connect works). Time to ship the deferred ERC-20 path.

### What shipped — Arena Picks ERC-20 lift

The contract (`FantasyLeagueEscrow` at `0x9cCB15833767B956cF55aa805D74c62d08F8acEd`) has always supported ERC-20 wagers — `createLeague(token, ...)` takes a token address and `join(leagueId)` is `payable` for native or pulls via `transferFrom` for ERC-20. The lift was wiring the rest of the stack to use that capability.

| File | Change |
|---|---|
| `web/src/lib/arena/picks/contract.ts` | Added `isNativeToken(addr)` helper (treats `address(0)` as native POL) and `ERC20_MIN_ABI` (allowance + approve + decimals + balanceOf) for the join() pre-flight. Updated header comment to document the ERC-20 dual-path. |
| `web/src/lib/arena/picks/escrowServer.ts` | `escrowCreatePick(entryFeeWei)` → `escrowCreatePick(tokenAddress, entryFeeWei)`. Token address is now passed through to `createLeague(tokenAddress, ...)` instead of always-`NATIVE_TOKEN`. Re-exported `NATIVE_TOKEN` for downstream API routes. |
| `web/src/pages/api/arena/picks/index.ts` | Dropped the `NATIVE_WAGER_TOKENS = {POL, MATIC}` 400-gate. Resolves token symbol → `{ address, decimals }` via `TOKEN_CONFIG`, validates address is either native sentinel or a 0x40-hex Polygon address, computes `entryFeeWei = ethers.utils.parseUnits(fee, decimals)` (was `parseEther` — broke USDC/USDT 6-dec). Pass `tokenAddress` to `escrowCreatePick`. Response `requiresDeposit` now includes `{ tokenAddress, tokenDecimals, isNative }` so client doesn't double-resolve. |
| `web/src/pages/api/arena/picks/[id].ts` | Edit action: removed POL-only gate. Resolves new token's address + decimals from `TOKEN_CONFIG`, uses `parseUnits` (decimals-aware), passes new token address to `escrowCreatePick` when re-creating the on-chain league. |
| `web/src/pages/arena/picks.tsx` | `ENABLED_TOKENS = ['MATIC', 'OGUN', 'USDC', 'USDT', 'ETH', 'LINK', 'AVAX']` (was `['POL']`). Added `resolveTokenForSign(symbol)` helper. `signEscrowJoin(provider, leagueId, entryFeeWei, tokenAddress)` is now dual-path: native does single-tx `join({value})`; ERC-20 does an allowance check, signs `erc20.approve(escrow, fee)` only if needed, waits one confirmation, then signs `escrow.join(leagueId)` with no value. Take + Create flows both pass `tokenAddress` and use `parseUnits(fee, tokenDecimals)` instead of `parseEther`. Wallet toast updated to "approving + depositing… (2 signatures)" for ERC-20. |

### Non-obvious invariants (future-session gotchas)

1. **`ENABLED_TOKENS[0]` is `'MATIC'` not `'POL'`.** `TOKEN_CONFIG['MATIC'].label === 'POL'` so the dropdown still reads "POL" to the user, but the symbol that ships in the API request is `'MATIC'` because that's what's in `LIVE_TOKENS`. Pre-fix code tried to send `'POL'` and `isTokenLive('POL')` returned false → 400 from the server. The pre-fix POL path was actually broken on the server; only the UI gate kept users from seeing it.
2. **`parseUnits(fee, decimals)` not `parseEther`.** USDC and USDT are 6-decimal tokens; `parseEther('100')` would have created a `1e20` USDC league = a billion USDC stake, which fails immediately on insufficient balance but *would* succeed at `createLeague` and dangle Open forever consuming gas. Always thread token decimals through the wei conversion, both client-side and server-side.
3. **Allowance check before approve.** `erc20.allowance(owner, escrow)` is a free read; if existing allowance ≥ fee, we skip the `approve` TX entirely. Returning users wagering in the same token twice only sign once (the join). First-time users sign twice. We approve the *exact* fee — not infinite — because picks are short-lived (game-time bound) and a stale max-allowance grant is a phishing surface for the connected wallet vs an unknown future contract upgrade.
4. **`approveTx.wait()` before calling `join`.** Mainnet RPC propagation is fast but not instant; if you call `join()` before the approval is mined, the contract's `transferFrom` reverts with "ERC20: insufficient allowance" and the user pays gas for nothing. The wait is one block (~2s on Polygon).
5. **The contract's `defaultPlatformBps = 5` is shared global state** for fantasy + picks (logged Apr 27 in this file). ERC-20 wagers don't change that — winner still gets 99.95%, treasury gets 0.05% of the pot in whatever token the league holds.
6. **Cron settle path is token-agnostic.** `escrow.settle(leagueId, winner, ...)` reads the league's stored token address and pays winner + treasury in the right asset automatically. No cron changes needed for ERC-20 to work end-to-end through to settlement.
7. **OGUN bonus payout is still deferred.** `ogunBonusBps: 1000` (10%) is stored on the doc when `entryToken === 'OGUN'` but no code pays it. The bonus is meant to come from a rewards pool, not the escrow. To ship: extend `cron/settle-picks.ts` to transfer `pot * ogunBonusBps / 10000` OGUN from commissioner wallet to winner address after `escrowSettlePick` succeeds, persist `ogunBonusTxHash`. Requires User to send ~50–100 OGUN to commissioner `0x627aD3d257DedD2b57f00632C6E04b37B60Daff9` first. Documented as the immediate follow-up.
8. **`web/.env` token addresses are not consulted.** Token addresses live in `lib/arena/fantasy/types.ts → TOKEN_CONFIG` exclusively. If you ever rotate a token contract (e.g. USDC bridged → native), update `TOKEN_CONFIG` only — the picks code reads from there.

### How to test on mainnet

1. Hard-refresh `/arena/picks` after Vercel deploys.
2. Tap a pre-game card → CreatePickModal renders all 7 tokens (POL, OGUN, USDC, USDT, ETH/WETH, LINK, AVAX).
3. Pick OGUN, set wager amount, place pick → server creates league with OGUN as token, returns `tokenAddress: 0x45f1af89...`, `isNative: false`.
4. Wallet pops 2 sigs: (a) `OGUN.approve(escrow, amount)` (b) `escrow.join(leagueId)`.
5. Status flips to AWAITING STAKE during step 1, then OPEN once finalized.
6. Second account takes the pick → same 2-sig flow → MATCHED.
7. After ESPN final, cron settles → winner receives 99.95% of OGUN pot directly from escrow contract on Polygon. Verify on Polygonscan via the `payoutTxHash` field.
8. Bonus 10% OGUN payout will land in a follow-up commit once commissioner has OGUN balance.

### Lessons

1. **"Deferred until X" comments age into bugs.** The Apr 27 v1 comment was honest about the limitation but the UI gate (`ENABLED_TOKENS = ['POL']`) shipped without a TODO marker pointing to the deferral. Result: the flow looked complete and any audit would skip it. When deferring an obvious feature, leave the gate AND a `TODO(picks-erc20)` so the next pass picks it up immediately.
2. **`parseEther` is a footgun in any token-aware codepath.** It's always 18 decimals. The moment a wager system supports more than ETH-derivative tokens, every `parseEther` becomes a latent overflow. `parseUnits(amount, decimals)` should be the default; reach for `parseEther` only when you know the token is ETH/WETH/POL/MATIC.
3. **Allowance checks are free; always pre-flight.** Saves the user one TX on repeat bets in the same token. The cost is one RPC read which the wallet client caches.
4. **Document the dual-sig UX.** ERC-20 token wagers fire two wallet popups (approve, then join). Without a "2 signatures" hint in the loading toast, users abandon between popups thinking the first one failed. Same lesson logged earlier in marketplace flow; re-applied here.

See `bug-report.md#Bug-78` and `sarg.md` for full notes.

---

## 🌐 SESSION: Apr 28, 2026 (Sarg, later) — DexNavBar Connect Wallet pill (SHIPPED `abf2c00`) + /wallet spinner hypothesis (Bug #77)

### Context

After today's `23b1b20` canonical Web3Modal upgrade on /wallet + /shop, Frank tested mobile and reported two issues:

1. **`/wallet` MM + CBW pills spin forever** — wallet app opens but stays on its loading screen, never asks for signature.
2. **DexNavBar (top sticky nav) was missing a Connect Wallet pill for public visitors.** Frank: *"top tab sticky nav bar is supposed to have wallet connect pill there too to allow users to connect if their visiting publicly and dont want to create accounts on sc put that back"*

### Fix #1 — DexNavBar canonical pill (SHIPPED `abf2c00`)

DexNavBar's CONNECT button at `web/src/components/DexNavBar.tsx:344` was wired to `useMagicContext().connectWallet?.()` — Magic OAuth-only. Wrong door for public visitors who don't want an SC account. /wallet (`6260c09`) and /shop (`dffb150`) shipped earlier today targeted only those two surfaces; the global nav was overlooked.

| File | Change |
|---|---|
| `web/src/components/DexNavBar.tsx` | +11 / -4. Imported `useUnifiedWallet` from `contexts/UnifiedWalletContext`. Destructured `activeAddress`, `ogunBalance: unifiedOgunBalance`, `connectWeb3Modal`, `isWeb3ModalReady` (renamed Magic destructures to `magicAccount` / `magicOgunBalance`). Canonical reads: `account = activeAddress || magicAccount` so external wallets light up the connected pill same as Magic. onClick: `isWeb3ModalReady ? connectWeb3Modal() : connectWallet?.()` — Web3Modal first per Bug #69 pattern, Magic OAuth fallback if dynamic import unresolved. Cyan→purple gradient + `CONNECT WALLET` text matches /wallet + /shop pills. |

Same canonical pattern as `useUnifiedWallet().connectWeb3Modal()` per the Bug #76 follow-up (`23b1b20`). External wallets propagate into UnifiedWalletContext → light up MultiWalletAggregator + sign via canonical path. customWallets fallback active (Rainbow/MetaMask/Trust/Coinbase in-bundle).

### Hypothesis #2 — /wallet MM/CBW spinning wheel (OPEN, awaiting Frank's Vercel verify)

When Frank tapped MetaMask or Coinbase Wallet from the /wallet pill, the wallet app opened (deeplink works) but stayed on its loading state forever, never advancing to a signature request. Both wallets, mobile Safari.

**Root-cause hypothesis:** prod Vercel `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` env var likely still holds the dead `8e33134dfeea545054faa3493a504b8d` from the pre-Bug-#29 era. Reown's `api.web3modal.org` returns 403 for that ID after their cloud.reown.com migration. Two values are floating in the repo right now:

- `web/.env.local`: `53a9f7ff48d78a81624b5333d52b9123` ✅ working (also Web3ModalContext hardcoded fallback)
- `web/.env`: `8e33134dfeea545054faa3493a504b8d` ❌ dead per Bug #29

`createWeb3Modal({ projectId, ... })` in `Web3ModalContext.tsx` reads `process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '53a9f7ff...'`. If Vercel prod has the dead value, it overrides the fallback at build time. Symptom matches: customWallets `mobile_link` deeplinks fire correctly (wallet opens), but the wallet's WC relay subscription using projectId for auth gets rejected at the relay → wallet stays on connect-loading screen → dapp never receives session approval.

**Frank to verify:** Vercel → soundchain-site project → Environment Variables → `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`. Should be `53a9f7ff48d78a81624b5333d52b9123`. If it's the `8e331...` one, update + redeploy + hard-refresh on mobile Safari (DevTools → Application → Service Workers → Unregister per Bug #75 if still hung).

If Vercel already has the working ID and the spinner persists: customWallets `mobile_link` format may need a `desktop_link` companion + wc-uri-append-pattern audit, or the legacy `@web3modal/ethers5@5.1.11` we reverted to in Bug #29 finally lost api.web3modal.com support — escalating the proper migration to `@reown/appkit` + fresh cloud.reown.com projectId.

### Lessons

1. **A canonical pattern is incomplete until it's everywhere a non-authed visitor lands.** /wallet + /shop pills shipped today, but DexNavBar — the actual global nav — was overlooked until Frank tested. After landing a primary affordance on focused flows, immediately audit the global nav surfaces and any public-visitor entry points before considering the pattern shipped.
2. **Spinning-wheel symptoms in WalletConnect flows almost always = projectId / relay auth issue, not deeplink format.** If the wallet app opens at all, the deeplink works. If the spinner never advances, it's the relay subscription. Always check projectId before tweaking customWallets metadata.
3. **`process.env.X || 'fallback'` is a build-time read.** A code-level fallback only protects against unset env vars, not env vars set to wrong values. Stale Vercel values silently override good defaults.

See `bug-report.md#Bug-77` and `sarg.md` for full notes.

---

## 🪪 SESSION: Apr 28, 2026 (Sarg) — Picks commissioner FUNDED + Connect Wallet pill restored on /wallet (SHIPPED `6260c09`)

### What happened

User funded the picks-escrow commissioner wallet `0x627aD3d257DedD2b57f00632C6E04b37B60Daff9` with 6 POL on Polygon mainnet (TX nonce #426 from `0x33F4d...FE6CE`). Verified via `GET /api/arena/picks/commissioner-address`:

```json
{ "address":"0x627aD3d257DedD2b57f00632C6E04b37B60Daff9", "balancePol":"6.0",
  "fundingHint":"Currently has 6.0 POL — funded and ready." }
```

**On-chain Arena Picks escrow is unblocked end-to-end.** Bug #72 / Bug #75 close pending User's create-pick verify. Each createLeague TX is ~120k gas (~$0.01 at current Polygon prices); 6 POL covers ~600 picks before refilling.

### Bug #76 — Connect Wallet pill missing on /wallet (SHIPPED `6260c09`)

User flagged that he had to import his Magic OAuth wallet into MetaMask externally to send the 6 POL — *"i need it back cause i wanted to send from wallet page on soundchain. id rather be able to connect on the wallet page itself."*

**Root cause:** `WalletConnectModal` (MetaMask + WalletConnect + Coinbase + 300 wallets via WC scan) lives in `dex/[...slug].tsx:297` and renders at line 8476, but its only `setShowWalletModal(true)` trigger was wired to the post-as-guest flow at line 1443. `/wallet` had no Connect button anywhere — `MultiWalletAggregator` only listed already-connected wallets with Disconnect controls. New users had no path to attach an external wallet from the wallet page.

**Fix (`6260c09`, +7 / -1):** Added a "Connect Wallet" pill at the start of the slim action button row in the wallet view (`dex/[...slug].tsx:5146`). Cyan→purple gradient + glow so it reads as the primary affordance vs the gray Buy/Send/Receive/Swap/Sweep buttons. Triggers the existing modal — full vendor list lights up immediately. Added `flex-wrap` so 6 buttons stay clean on mobile.

### Follow-ups

- **`MultiWalletAggregator.openWeb3Modal` is a dead prop** (passed at line 5097 of slug, never destructured by the component). Wire it to a "Connect Web3Modal" CTA inside the aggregator OR remove the prop. Low priority; the new pill covers the same UX.
- **User verify path:** Hard refresh `/wallet` → tap Connect Wallet → modal pops → connect MetaMask/Rainbow/Trust → wallet appears in aggregator below → send POL directly without external imports next time. Then visit any user's `/shop` tab → same Connect Wallet pill renders under the storefront banner.

### Follow-up shipped: Connect Wallet pill mirrored to /shop (`dffb150`)

`/marketplace` was lifted out of the main nav — it now lives as `/shop` per-user (`profileTab === 'shop'` in `dex/[...slug].tsx:8126`). Every user is a vendor; their wall's shop tab is their storefront. Sellers attach a wallet to receive crypto; buyers attach one to pay. Pill sits right under the storefront banner with role-aware caption (owner vs visitor).

**Architectural note:** `/marketplace` is intentionally gone as a top-level destination. Don't scaffold new top-level routes for marketplace-adjacent features — extend the `profileTab === 'shop'` branch instead. Saved as `architecture-marketplace-shop.md` in user memory.

### Follow-up SHIPPED: canonical Web3Modal swap (`23b1b20`) — OpenSea/Rarible/Blur parity

Audit of the legacy `WalletConnectModal` at `dex/[...slug].tsx:297` revealed it hand-rolled `@walletconnect/ethereum-provider` directly and stored the connection in localStorage only — never propagating into `UnifiedWalletContext`. Result: wallets didn't show up in `MultiWalletAggregator`, no EIP-6963 multi-provider detection, no auto-reconnect, no canonical signing path. Two parallel wallet-connect systems running side-by-side.

**Fix (`23b1b20`, +2 / -2):** Both pill onClicks (`/wallet` action row + `/shop` storefront) swapped from `setShowWalletModal(true)` → `isWeb3ModalReady ? openWeb3Modal() : setShowWalletModal(true)`. `openWeb3Modal` already destructured from `useUnifiedWallet()` at line 1403 — same canonical path Arena Picks uses post-Bug #69 (`0313cf5`). Picks up Bug #71's `customWallets` fallback automatically (Rainbow/MetaMask/Trust/Coinbase shipped in-bundle in case `api.web3modal.org/v3/wallets` 401s). Legacy modal kept as fallback for the rare case Web3Modal's dynamic import hasn't resolved yet.

**Now matches OpenSea/Rarible/Blur:**
- Real Reown AppKit modal — 600+ wallets, polished UI
- EIP-6963 multi-injected detection (Rainbow, Phantom, Brave, Frame, Backpack)
- Auto-reconnect on page refresh
- Connection flows into `UnifiedWalletContext` → wallet shows up in `MultiWalletAggregator` automatically
- Transactions sign via the canonical path the rest of the app reads from

### Lessons (consolidated for Apr 28)

1. **Cut + relocate audit:** When a generic modal trigger that lived on route X gets pulled into a focused flow (post-as-guest at line 1443), audit who else needs it. Don't strand other surfaces.
2. **"A modal that connects" ≠ "the canonical connect path."** Reusing an existing modal looks safe but if it's wired to a different context than the rest of the app reads from, you've shipped two parallel systems. Default new connect surfaces to `useUnifiedWallet().connectWeb3Modal` per Bug #69's pattern.
3. **The smallest competitor-grade fix is sometimes 2 lines.** All the polish (600+ wallets, EIP-6963, customWallets fallback, auto-reconnect) was already shipped in prior sessions — the fix was just routing the new pills through the canonical hook instead of scaffolding fresh.

See `bug-report.md#Bug-76` and `sarg.md` for full notes.

### Lessons

1. **When you cut a generic modal trigger that lived in route X to land it on a focused flow, audit who else needs it.** The post-flow guest-wallet trigger at `[...slug].tsx:1443` was the only entry point — leaving the wallet page without one was an unintentional regression. Cross-reference modal mount points to use sites before merging surface-area changes.
2. **The shortest path to "make it work" is sometimes 7 lines, not 700.** The full modal already existed, was already wired to the proper handler — all that was missing was a button. Always audit existing surface area before scaffolding a new component.

See `bug-report.md#Bug-76` and `sarg.md` for full notes.

---

## 🚪 Apr 27, 2026 (User heading to work) — Login OAuth hang on post-Mac-wake + commissioner-address endpoint (SHIPPED `781a045`)

### Context
User said "go big or go home my G" on the fantasy feature. Shipped 6 tight commits end-to-end — ESPN draft to championship bracket — all on main, each typecheck clean, each live on Vercel. User was multi-building with Fleet Commander in the War Room in parallel.

### Commits (all on main)

| # | Commit | Ships |
|---|---|---|
| P1 | `5a74166` | NFL DSTs in ESPN draft pool (unblocks DEF slot in `DEFAULT_ROSTER_TEMPLATE`) |
| P2 | `cf2ed1b` | Live scoring engine + `*/30 * * * *` Vercel cron + offseason-safe no-op |
| P3 | `af435a3` | Player headshots, 32-team brand colors, position pills (draft + roster + matchups) |
| P4 | `40a36e3` | In-league live ticker under DexNavBar, top-30 scoring plays, 30s polling, 60s server cache |
| P5 | `389cdec` | My Week hero card, per-starter breakdown, current-week pinned with `THIS WEEK` badge |
| P6 | `008a1e2` | Top-4 playoff bracket (Wk15 semis + Wk16 final/consolation), 🏆 TrophyCard at settle |

### Files created / modified (full list)

**New files:**
- `web/src/lib/arena/fantasy/scoringSync.ts` — `syncLeagueScores(leagueId, week?)` + `syncAllLiveLeagues()`. Batches 10 players/fetch, starter-only scoring, applies W/L from schedule, persists per-player per-week scores.
- `web/src/lib/arena/fantasy/teamColors.ts` — 32 NFL hex palette + position → Tailwind pill class map. Helpers: `teamColorHex()`, `positionPillClass()`.
- `web/src/pages/api/cron/fantasy-scoring.ts` — `CRON_SECRET` bearer-auth cron endpoint, hits `syncAllLiveLeagues()`, returns summary.
- `web/src/pages/api/arena/fantasy/[id]/live-feed.ts` — top 30 scoring events per league for current NFL week, 60s in-memory cache per league, skips DSTs.
- `web/src/components/FantasyLiveTicker.tsx` — marquee under DexNavBar, 30s polling, hover-pauses, `animate-fantasy-marquee 90s linear`, auto-hides when `items.length === 0`.

**Modified:**
- `web/src/lib/arena/fantasy/espn.ts` — `+fetchNFLDefenses()`, `+fetchNFLTeams()`, `+fetchCurrentNFLWeek()`, `+fetchAthleteGamelog()` + `STAT_LABEL_MAP`.
- `web/src/lib/arena/fantasy/schedule.ts` — `+seedTeams()` (W-L then totalPoints), `+generatePlayoffBracket()` top-4 single-elim + consolation, `+advancePlayoffBracket()` fills feeders from semi winners/losers.
- `web/src/lib/arena/fantasy/types.ts` — `+PlayoffMatchup`, `+PlayoffRound`, `+league.playoffBracket`, `+league.weekPlayerScores{week}{playerId}=pts`, `+lastScoringSyncAt/Week`, `+winners/payoutTxHash/completedAt`.
- `web/src/pages/api/arena/fantasy/[id]/action.ts` — `+start-playoffs` commissioner action (builds bracket from current standings via `generatePlayoffBracket()`).
- `web/src/pages/arena/fantasy/[id].tsx` — graphics pass everywhere; `+MyWeekHero`, `+StarterBreakdown`, `+TrophyCard`, `+PlayoffBracketView`; Bracket tab conditional on `league.playoffBracket`; commissioner gets "Start Playoffs (Top 4)" button between "Force Live" and "Settle".
- `web/vercel.json` — `+{"path":"/api/cron/fantasy-scoring","schedule":"*/30 * * * *"}`.

### Non-obvious invariants (future-session gotchas)

1. **DST scoring is stubbed.** `dst-{teamId}` playerIds don't hit any gamelog and score 0. Real team-defense scoring needs the weekly game boxscore endpoint. Intentional MVP gap.
2. **`CRON_SECRET` is OPTIONAL in dev, REQUIRED in prod.** `/api/cron/fantasy-scoring` accepts unauthenticated calls if env unset. Accepts `Authorization: Bearer <secret>` OR `?secret=<secret>` query param.
3. **Scoring sync is starter-only.** `team.roster.filter(r => r.slot !== 'BENCH')` → sum. Bench players don't contribute to weekly team score. Dynasty/daily-swaps would change this.
4. **Scoring sync is idempotent.** Safe to re-run any time — latest stats overwrite. `weekPlayerScores` merges per week (not replaced across weeks).
5. **ESPN gamelog uses a DIFFERENT subdomain.** `site.web.api.espn.com` (note the `.web.`) for gamelogs, vs `site.api.espn.com` for scoreboard/teams/athletes.
6. **ES5 target blocks Map-iterator spread.** Must use `Array.from(map.values())` not `[...map.values()]`. Caught during P2.
7. **Live-feed cache is in-memory Map, serverless-scoped.** Each Vercel function instance has its own. Fine for per-user polling; move to Upstash Redis if game-day traffic balloons.
8. **Playoff bracket is top-4 only.** League needs ≥4 teams. Top-6 w/ byes is future work.
9. **`advancePlayoffBracket()` is NOT auto-called by scoring sync yet.** Function exists in `schedule.ts`; future hook in `scoringSync.applyMatchupResults()` to auto-fill finals/consolation once semifinal scores post. ~15-line follow-up.
10. **FantasyLiveTicker mounts ONLY on `league.status === 'live'`.** No ticker during draft/open/complete leagues. Correct.
11. **`MyWeekHero` uses `league.lastScoringSyncWeek` as "current week"** (not a derived-from-date week). No cron run = no hero card. Matches reality.
12. **No Apollo / Lambda dependencies.** Everything is Vercel-direct MongoDB + ESPN public APIs. Survives `api.soundchain.io` outages.

### Prod checklist

1. `vercel env add CRON_SECRET production` — paste any 32-char random string
2. Hard refresh `/arena/fantasy/[id]` on any existing league
3. Draft day: DEF slot draft pool now shows 32 NFL teams (was empty)
4. Season Sunday: live ticker lights green/LIVE, My Week card populates, matchup cards show scores + starter breakdown
5. End of regular season: commissioner clicks "Start Playoffs (Top 4)" → bracket renders in new Bracket tab
6. After bracket final → commissioner calls "Settle" → TrophyCard replaces everything above tabs

### Deferred follow-ups (flagged for future sessions)

- **FantasyRosterNFT contract** — at `lock()` mint roster NFT snapshot; at settle, gold-border metadata update for 1st/2nd/3rd. `TrophyCard.winners` already has the inputs. User asked about this earlier in thread; deferred pending real NFL season.
- **DST weekly scoring** — pull week's NFL scoreboard → boxscore per game → team defensive stats → `computeFantasyPoints({defTDs, defSacks, defInts, defFumbleRecoveries, defSafeties, defPointsAllowed})`. ~60 lines in `scoringSync.ts`.
- **Auto-advance playoff bracket** after semifinal scoring posts. Hook into `scoringSync.applyMatchupResults()`: if week ≥ playoff startWeek and bracket exists, call `advancePlayoffBracket()` + persist.
- **Live Matchup projections.** ESPN has projection endpoints; show "Mahomes projected 22.4 pts" alongside actual on My Week hero.
- **Full season summary card** post-settle: highest single-week score, biggest blowout, consolation winner.

### Multi-building context
Shipped from Sarg (iPhone, home) while User was running Fleet Commander in the War Room in parallel. Fantasy code is self-contained — no shared UI state, no `Layout.tsx`/Provider/`DexNavBar` touches. Safe to parallel-build with other War Room features without merge conflicts.

---

## 💰 SESSION: Apr 21, 2026 (Sarg) — GALLERY3D FRAME AUDIO EARNS OGUN REWARDS

### Context
After `ee67751` (Apr 20) ported the Gallery3D frame-detail modal's audio from bare `new Audio()` to the canonical `<AudioPlayer>` component, playback worked in-card (per User's constraint: audio plays IN the frame, not the bottom sticky bar). But streaming a frame track past 30s never fired the `OgunRewardToast` — no OGUN. User flagged this today after confirming the SHARE-via-text flow worked.

### Root Cause
`useLogStream` only lived inside `AudioEngine.tsx:63–84` (the global bottom player). Any inline `<AudioPlayer>` mount (Gallery3D frame, future inline players) renders its own local `<audio>` element isolated from the global pipeline → AudioEngine never saw the playback → no 30s log, no toast.

### Fix — commit `d72cab0`

Added `useLogStream` directly to `AudioPlayer.tsx` with a dedup guard.

| File | Change |
|------|--------|
| `web/src/components/AudioPlayer.tsx` | +58 / -2. Imports `useLogStream`, `useMe`, `useMagicContext`, `react-toastify`, `OgunRewardToast`, `DailyLimitToast`. Adds `streamLoggedForCurrentPlay` ref. Fires `logStream()` from the existing `timeupdate` listener when `audioEl.currentTime >= 30`. |

**Reset points for the flag:**
- On `src` change (effect re-run) — new track, can log again
- On `ended` — loop/replay can re-log at the next 30s mark

**Guard against double-counting:**
```ts
if (
  !streamLoggedForCurrentPlay.current &&
  trackId &&
  bottomPlayerSong?.trackId !== trackId &&   // ← the guard
  audioEl.currentTime >= 30
) { ... }
```
If the global `AudioEngine` is already playing the same `trackId`, inline `AudioPlayer` defers — AudioEngine logs it. Different trackId → both can log independently (correct: two distinct listens).

### Non-obvious invariants (future-session gotchas)

1. **Two `useLogStream` instances in the component tree now** — AudioEngine (global) + AudioPlayer (inline). Each has its own `lastLogTime` ref (per-hook-instance Map for per-track rate-limit). `scidCache` stays module-level so SCid lookups don't duplicate across instances.
2. **The trackId-match guard is the only defense against double-count.** If the two players ever play the same track simultaneously, inline defers. In practice, `AudioPlayer.togglePlay()` at line 71 already pauses the bottom player on start (`isBottomPlayerPlaying && pauseBottomPlayer()`) — the guard is defense-in-depth.
3. **Anonymous listeners still work.** If `me?.profile?.id` is undefined, `logStream` is still called but listener reward resolves to 0. The `onReward` callback checks `reward > 0` before toasting, so no UI noise.
4. **Tracks without a registered SCid** (raw audio frames, unregistered free uploads) log a `[useLogStream] No SCid found for track` warn and no-op. Expected behavior.
5. **Global `AudioEngine` path 100% untouched.** Feed, Radio, bottom sticky bar reward flow + toasts are exactly as they were.

### How to test
1. Hard refresh
2. Open a Gallery3D frame with an SCid-backed track
3. Play > 30 seconds
4. Expect `OgunRewardToast` bottom-right with the listener's OGUN amount

### Lesson (add to architecture awareness)
**A "dumb UI component" that owns a real media element isn't truly dumb** — playback-observable features (stream rewards, analytics, scrubbing telemetry) must be wired at every mount point, OR delegated through a shared context. AudioPlayer had been a dumb UI for every other surface (track detail page, etc.) because all those pages also run AudioEngine which masked the gap. Gallery3D was the first real inline usage where audio played without AudioEngine's participation — that exposed the architectural seam. Future pattern choice when adding a new inline audio UI: either (a) route through global context, or (b) duplicate the reward hook with the trackId-match guard. Both are valid; choose based on whether the feature wants to coexist with or replace the bottom bar's session.

---

## 🌃 SESSION: Apr 19, 2026 Night (Sarg) — THREE-IN-ONE (xterm mini + gallery audio + land drill-down)

### Context
Last work of the night. User asked for three things in one shot, said "proceed using glow steps til this is all completed for tonight build commit push to main at ease":
1. Xterm terminal needs a third size — "mini rectangular frame" — small enough to navigate SC behind it while keeping default + fullscreen modes intact.
2. Gallery3D asset-in-frame needs to actually play audio file types (SCID audio / NFT audio / audio-post), not just render cover art.
3. Land Atlas: only lets users buy whole continents. Needs god's-eye drill-down (World → Country → City → Parcel) from open-source earth maps.

### Commit landed: `f0b630a` — three-in-one night ship (8 files, +514/-25 lines)

| File | Role | Task |
|------|------|------|
| `web/src/components/AgentStatusTicker.tsx` | `fullscreen` boolean → `terminalMode: 'default' \| 'mini' \| 'fullscreen'` enum. New MINI pill toggles a floating PiP panel (`fixed bottom-20 right-3 w-[min(360px,calc(100vw-1.5rem))] max-h-[340px] z-[100] rounded-xl`). Mobile terminal + agents + desktop terminal + term history all get mini-mode max-heights. Close button resets to default. Refit effect keyed off `terminalMode`, not `fullscreen`. | #1 xterm |
| `web/src/pages/api/nodeverse/my-frame-assets.ts` | Tracks projection now includes `playbackUrl` + `assetUrl`, tracks returned with `audioUrl: t.playbackUrl \|\| t.assetUrl \|\| null`. Posts gain `audioUrl: mediaType==='audio' ? uploadedMediaUrl : null`. | #2 gallery |
| `web/src/components/FrameBindModal.tsx` | Asset interface gains `audioUrl?: string \| null`. Bind payload + unbind payload both include `boundAssetAudioUrl`. | #2 gallery |
| `web/src/lib/nodeverse/buildables.ts` | `PlacedBuildable` interface gains `boundAssetAudioUrl?: string` — denormalized onto the placement doc (not looked up live). | #2 gallery |
| `web/src/pages/api/nodeverse/buildables.ts` | POST accepts + persists `boundAssetAudioUrl`. | #2 gallery |
| `web/src/components/Explore3DScene.tsx` | New `frameAudioRef = useRef<{ el: HTMLAudioElement; buildableId: string } \| null>(null)` + `playingFrameId` state. Click handler on `frame` category: if `pb.boundAssetAudioUrl` && `boundAssetType` is `'scid' \| 'post'`, toggle in-place (`new Audio(url)` + `.play()`). Second tap on same frame pauses; tap different frame stops + starts new. Unmount effect pauses active audio. Floating "▶ Now playing" pill (bottom-center, `z-[60]`) with stop button. Non-audio frames still route-push as before. | #2 gallery |
| `web/src/lib/nodeverse/worldCities.ts` (NEW) | **140 curated major world cities**. Each: `{ name, countryIso, countryId, lat, lng, population }`. `countryId` matches ISO numeric in world-110m.json (e.g. USA='840'). Helpers: `getCitiesForCountry(id)` + `cityBounds(city)` returning a ~0.36° square. | #3 land |
| `web/src/pages/land.tsx` | Adds `drillPath: DrillLevel[]` state. `computeGeometryBounds(geom)` walks Polygon/MultiPolygon coords. `fitBoundsToCanvas(bounds)` sets zoom + pan so bbox center lands at canvas center with 85% margin. `drillToCountry(feature)` / `drillToCity(city, parent)` push breadcrumbs + fit bounds. Earth-mode click router: at `world` level → country hit drills in; at `country` level → city pin (radius 14px hit) drills in; below that → parcel purchase as before. Breadcrumb bar absolute-positioned at top of canvas (`Globe2 › USA › San Francisco`) with per-crumb pop + `⌂ Earth` reset. Draw loop adds city pins sized by `log10(population) - 3` (bigger city = bigger target) with labels at zoom >=4. Critical guard: the `viewMode` reset effect now early-returns when `drillPath.length > 1` so drill zoom isn't stomped. | #3 land |

### Architecture notes
- **`boundAssetAudioUrl` is denormalized** onto `nodeverse_buildables` docs at bind time — not looked up from the tracks/posts collection on every render. Tradeoff: if the underlying track's playbackUrl changes (re-pin, IPFS gateway swap), the frame keeps pointing at the old URL until the user re-binds. Acceptable for tonight; if it bites, change the read path in Explore3DScene to hydrate from a live lookup.
- **Audio-frame playback uses a raw `new Audio()`**, *not* the global `useAudioPlayer` context. Deliberate scope call — Gallery-scene music is ambient/per-frame, dies on route change, doesn't compete with the main player or radio. Cross-page continuity (making a frame click join the main player queue) is a clean follow-up if anyone wants it.
- **Drill-down uses the existing `world-110m.json`** (already in `/public`, 107KB, loaded lazily on Earth Mode engage). No new geodata file added. 110m resolution is coarse — fine for country bounds, blobby at the coastline. If "gallery-quality" coastlines are ever needed, swap to Natural Earth 1:50m or 1:10m countries (ships at ~400KB / 1.5MB).
- **Cities dataset is curated**, not comprehensive. 140 entries across every continent. Countries without a bundled city (e.g. small island states, low-population nations) still work — drill-in lands at country-bounds zoom, no city pins shown, user can claim parcels directly.

### Lessons (for future sessions)
1. **When replacing a boolean with an enum, keep the boolean as a derived constant.** In AgentStatusTicker, I kept `const fullscreen = terminalMode === 'fullscreen'` + `const miniMode = terminalMode === 'mini'` locally — so every existing `fullscreen` check still reads correctly and only the setters had to change. Lower-risk refactor than find-and-replace across a 5000-line file.
2. **State-reset useEffects keyed on a mode change are a footgun for drill-down UIs.** The pre-existing `[viewMode]` effect in `land.tsx` set `zoom=3; pan=0` any time viewMode flipped — which would stomp `fitBoundsToCanvas` if `drillToCountry` flipped view mode at the same moment. Guard with `if (drillPath.length > 1) return` — intent is "only reset on user-initiated mode toggle at the top level."
3. **Fit-bounds math for equirectangular Canvas: `pan.x = -centerLng * zoom`, `pan.z = centerLat * zoom`.** Derives from the projection `x = cx + lng * zoom` where `cx = W/2 + pan.x`. To land `(centerLng, centerLat)` at `(W/2, H/2)`, pan.x = -centerLng * zoom (and pan.z uses +lat because the projection inverts y). Zoom = min((W * margin) / lngSpan, (H * margin) / latSpan).
4. **Denormalize over live-lookup when the asset rarely changes.** Frame bindings persist once; storing `boundAssetAudioUrl` alongside `boundAssetImageUrl` means the 3D scene's click handler is a pure DOM op (no fetch, no await) — matters on mobile where every network hop is a tap latency hit.
5. **TypeScript baseline errors are noise, not signal.** `yarn typecheck` reported ~15 errors in pre-existing web3 type files + sentry + transferOgun + errorHelpers — none in the files I touched. Flagged in CLAUDE.md under "Non-Blocking Errors." Don't let the baseline hide new regressions; filter by file path before judging.

### Caveats surfaced to User
- MINI pill shows on all breakpoints; only the fullscreen toggle is mobile-only.
- 140-city dataset is curated — add entries to `worldCities.ts` as users ask for coverage (format: `{ name, countryIso, countryId, lat, lng, population }`).
- Raw `new Audio()` for frame playback dies on route change. Intentional for tonight, tracked as follow-up.

---

## 🎯 SESSION: Apr 19, 2026 Late Evening (Sarg) — YT AUTOPLAY ROUND 2 + 5-PAGE NAV SCOPE

### Context
After tonight's earlier ship (`8929e55` + `8816504`), User tested live and reported:
1. YouTube embeds on Coachella posts in the Nodes feed STILL not autoplaying (despite Bug #52 fix).
2. Top header nav on `/nodes`, `/explore3d`, `/gallery3d`, `/arena`, `/land` "not quite right like global."

### Commit landed: `a88dfca` — YouTube autoplay round 2 (Bug #55)

| File | Change |
|------|--------|
| `web/src/components/Post/Post.tsx` | Removed the document-level `click` + `touchstart` auto-unmute listener (lines 95–107). It set `isPlayerMuted = false` on the first user gesture **anywhere on the page** — pre-StoriesBar this was harmless (the first YouTube embed mounted before any gesture, autoplayed muted). After Apr 19 `d88bff4` landed StoriesBar at the very top of `/dex/nodes`, the very first tap is now on a story rail bubble → global unmute fires → every YouTube embed below mounts with `playerVars.mute: 0` → browser silently blocks unmuted autoplay (no gesture *on the player itself*). Players now stay muted forever; the inline speaker-overlay button at line 467 handles per-clip unmuting. Same pattern as IG / TikTok / X. |

### Wrong-direction attempt on the 5 standalone pages (REVERTED, no commit)

First read of "not quite right like global" was interpreted as "doesn't match Layout.tsx." Layout mounts `<MiniRadioBar /> + <DexNavBar />`; the 5 pages only mount `<DexNavBar />`. So I added `<MiniRadioBar />` (dynamic, ssr:false) above the nav on all 5. User clarified: **profile nav (the inline mega-router nav at `dex/[...slug].tsx:3180–4281`) is the canonical reference, NOT Layout.** Reverted all 5 edits — files back to baseline. **No commit.** See Bug #56 in bug-report.md.

### Why the real fix is deferred
The mega-router inline nav is **~1,101 lines** of state-coupled UI:
- PiggyBank dropdown with Catalog/Listener tabs reading `useMyStreamingRewardsQuery` + `useMyListenerRewardsQuery`
- Vibes modal (user discovery)
- Nearby Bitchat `<ConcertChat />` embed
- Brain + Operator buttons (right side)
- Full search bar, Pulse, Notifications, Avatar
- Modal dispatchers (`showWinWinStatsModal`, `showVibesModal`, `showNearbyModal`, `winWinRewardsTab`)

Per the Apr 19 lesson already logged in this file: "Porting all of that into a shared component is a much bigger refactor." The cheap win at the time was route-linking the pills inside `DexNavBar`. User now wants the rich modal UX — that's the bigger refactor. Asked him to specify scope (full port vs subset) before touching it.

### Nav surface matrix (current state, no change since `8816504`)
| Page | Nav | Status |
|------|-----|--------|
| `/`, `/explore`, `/library`, ~37 others | `DexNavBar` via Layout.tsx | ✅ Correct |
| `/dex/*` (mega-router, including profile) | Inline nav at `[...slug].tsx:3180–4281` (rich modals) | ✅ Correct (User's canonical) |
| `/nodes`, `/explore3d`, `/gallery3d`, `/arena`, `/land` | `DexNavBar` (lighter, route-link pills) | ⏸ Wrong vs profile — port pending User's scope call |
| `/radio` | `DexNavBar` via `getLayout` | ✅ Correct (Layout-style) |

### Lessons (for future sessions)
1. **A surface symptom can have stacked root causes.** Bug #52 fix (nocookie host + threshold) was necessary but not sufficient — Bug #55 (global auto-unmute) was hiding behind it. Always re-test the actual user flow after each ship; don't assume one fix exhausts the bug.
2. **Global event listeners that flip per-component state are a footgun.** If component B (StoriesBar) can affect component A's state (Post player) via `document` events, refactoring B silently breaks A. Same anti-pattern as global mutables.
3. **Browser autoplay policies are unforgiving AND silent.** Unmuted autoplay without a gesture *on that specific player* is blocked with no error event. Always autoplay muted; let the user opt in per-clip.
4. **"Not right like global" is ambiguous — Layout.tsx vs mega-router inline nav.** Always confirm which "global" baseline before diffing. This session burned a round-trip on the wrong direction.
5. **When a refactor is large (1k+ lines) and state-coupled, ship the revert and ask before guessing scope again.** Don't half-build a port from ambiguous spec.

---

## 🎯 SESSION: Apr 19, 2026 Evening (Sarg) — GLOBAL NAV UNIFICATION + REELS AUDIO + YT AUTOPLAY

### Context
After today's 17-commit blitz (`d88bff4` Nodes entry points → `c2b1d30` revert of DexNavBar pills → `f912a11` KILL /dex/) the app was a patchwork: profile page top nav was missing, radio page had its own nav, reels played silently, YouTube embeds had stopped autoplaying. User was frustrated — earlier attempts at unification kept getting partially reverted.

### Two commits landed

**`8929e55` — YouTube embed autoplay on Nodes feed**

| File | Change |
|------|--------|
| `web/src/components/Post/Post.tsx` | (a) Removed `embedOptions: { host: 'https://www.youtube-nocookie.com' }` from ReactPlayer YouTube config. Apr 2 `f7a63be` rewrote URLs in `NormalizeEmbedLinks` from nocookie → standard youtube.com to dodge Google's bot CAPTCHA, but this line forced the iframe back to nocookie. Same CAPTCHA path, just hidden inside a stalled ReactPlayer instead of the visible fallback link. (b) Lowered IntersectionObserver threshold `0.5 → 0.25` — after Apr 19 `d88bff4` StoriesBar + compose row landed above the feed, the first 16:9 player rarely crosses 50% visible on iPhone, so `playing={isPlayerInView}` stayed false forever. |

**`8816504` — Global top nav + reels audio + profile nav occlusion**

| File | Change |
|------|--------|
| `web/src/pages/dex/[...slug].tsx:8034` | Removed `overflow-y-auto min-h-screen` + `WebkitOverflowScrolling: 'touch'` from profile view wrapper. Inner scroll container was carrying the sticky `<nav z-50>` out of view on mobile Safari (iOS inertial scroll quirk). Nav markup was always correct — the scroll context was the bug. **This is the "missing profile page top nav" User had been asking about all day.** |
| `web/src/components/DexNavBar.tsx` | Re-applied the reverted `7577604` (Bitchat → `/nearby`, PiggyBank → `/stake`, Vibes → `/dex/users`, Avatar → `/profiles/{handle}`) + added Moltbook 🦞 → `/backend` so DexNavBar matches both the mega-router inline nav AND TopNavBar's right-action strip. Route-links only — zero modal state ported, so no risk of re-introducing the ticker double-render that `43bd346/93a16b0` killed. |
| `web/src/pages/radio.tsx` | Imported `DexNavBar` and mounted it inside the existing `ModalProvider` in `getLayout`. Radio previously used `getLayout` to skip the default `<Layout>`, so it never inherited DexNavBar. Radio's inline player toolbar at line 640 stays as a secondary bar underneath. |
| `web/src/pages/api/feed/stories.ts` | Added derived nested `attachedTrack: { id, title, artist, coverUrl, audioUrl }` to the story response, sourced from the flat `attachedTrackIpfsUrl` etc. fields. `StoryViewer.tsx:172` reads `currentStory.attachedTrack.audioUrl` to gate `hasTrackAudio` — the Apr 17 Vercel-direct port (`231bb33`) returned only flat fields, so `hasTrackAudio` was always false and reels played silently. |

### Nav surface matrix (after this session)
| Page | Nav |
|------|-----|
| `/`, `/nodes`, `/explore3d`, `/land`, `/arena`, `/gallery3d`, `/archive`, `/pulse`, `/wallet`, `/notifications`, `/settings/*`, `/posts/*`, `/tracks/*`, `/messages/*`, `/explore`, `/library`, `/upload`, `/marketplace`, `/stake`, `/lp-stake`, `/trader`, `/roadmap`, `/get-verified`, `/feedback`, `/agents`, `/backend`, `/create-account/*`, `/profiles/*`, `/top-tracks`, `/home` | `DexNavBar` via Layout.tsx |
| `/dex/*` (mega-router) | Inline nav at `[...slug].tsx:3180` (richer — has PiggyBank accordion with Creator/Listener tabs, Nearby modal, Vibes modal, full Avatar menu with OpenSea-style wallet dropdown). Nav now visible on profile after `:8034` scroll-container fix. |
| `/radio` | `DexNavBar` via `getLayout` (NEW this session) + radio's own inline player toolbar below |
| `/login` | Headless (intentional — OAuth flow) |

### Lesson (for future sessions)
1. **When the nav is "missing," check the scroll context around the view, not the nav markup.** The sticky nav was there all along — an inner `overflow-y-auto` wrapper was eating it on mobile. Hours wasted today on DexNavBar vs TopNavBar debates when the real bug was one CSS class on a profile `<div>`.
2. **Vercel-direct API ports keep dropping nested objects.** Phase 4/5/6 and stories.ts all hit the same failure mode — legacy Apollo/GraphQL returned nested shapes (`post.track`, `story.attachedTrack`, `story.reactionTally`), but the Vercel-direct MongoDB reads return flat fields. Any consumer built against the GraphQL shape breaks silently. Any future Vercel-direct route: shape the response to match the existing GraphQL type, not the raw Mongo doc.
3. **When enriching a shared nav, route-link pills > ported modal state.** `7577604` got reverted because modal porting is invasive; the re-applied route-link version of the same commit in `8816504` is simpler and unambiguously safe.

---

## 🟢 SESSION: Apr 13, 2026 Late Night (Sarg) — PHASE 4d: BULK LAMBDA EVICTION

### Post-Deploy Outcome (user-facing)
| Action | Before | After |
|---|---|---|
| Feed post | 504 hang | instant |
| Wall post | "Posting…" hang | instant |
| Reactions (🔥/❤️/etc) | Lambda cold start | instant |
| Comments | slow | instant |
| Repost | slow | instant |
| Create story/reel | 504 | instant |
| DM send | slow | instant |
| Share post → DMs | slow | instant |
| Subscribe bell | slow | instant |
| Clear all notifications | slow | instant |

### Still on Lambda
NFT mint, marketplace (list/buy/auction), upload, login/OAuth, delete/edit/pin ops, individual profile forms, playlist wizard UI, track/waveform comments, Pulse NewMessageForm, push/Nostr sub registration.



### Commit
`8354d3c` — "feat: Phase 4d - bulk Vercel direct migration (kills Lambda 504 across 8 hot paths)"

### New Vercel routes (shared JWT helper at `web/src/lib/api/authJwt.ts`)
| Route | Purpose |
|-------|---------|
| `/api/wall/create` | Wall posts (profile walls) |
| `/api/posts/react` | Reactions add/change/remove (single endpoint, action in body) |
| `/api/posts/comment` | Post comments |
| `/api/posts/repost` | Reposts + feed fan-out |
| `/api/stories/create` | Stories/reels (24h expiry) |
| `/api/dm/send` | Direct messages |
| `/api/profile/update` | Profile field updates (bio, displayName, etc.) |
| `/api/profile/subscribe` | Subscribe/unsubscribe toggle |
| `/api/playlists/create` | Create playlist (+ optional initial tracks) |
| `/api/playlists/add-track` | Add track to existing playlist |
| `/api/notifications/clear` | Mark all notifications read |

### Frontend rewires (Apollo useMutation → fetch)
`ReactionSelector`, `NewCommentForm`, `ProfileWall`, `CreateStoryModal`, `DMModal`, `SharePostModal`, `SubscribeButton`, `ClearAllNotificationsButton`.

### Deferred (were backgrounded side-effects of old Apollo resolvers)
- Activity feed logging (`logLiked`, `logCommented`, `logPosted`, `logReposted`, `logFollowed`)
- Push + Nostr notifications on all events
- `@handle` mention notifs in comments
- oEmbed thumbnail fetch for shared media

### Skipped (complex schemas, low-traffic, not on 504 hot path)
- `CreatePlaylistModal` wizard with external playlist items
- Individual profile forms with uniqueness checks (`HandleForm`, `SocialLinksForm`)
- Guest (wallet-address) mutation variants — all untouched

### Pattern for future sessions
1. Export `authFromRequest(req)` from `lib/api/authJwt` returns `{ userId, profileId: ObjectId }` or null
2. Route: verify auth → validate body → Mongo write → return shape compatible with old GraphQL consumer
3. Frontend: keep GraphQL hook at call site commented out or replace entirely; match the `{ variables }` signature if multiple call sites share a hook binding

---

## 🟢 SESSION: Apr 13, 2026 Evening (Sarg) — PHASE 4c: FEED POST CREATE ON VERCEL

### Summary
Bugs #27/#29/#30 (wall post hang, feed 504, reel 504) all stem from one unfinished cutover: Phase 2 shipped the Vercel-direct feed endpoints but `PostFormTimeline.tsx` still called Apollo's `createPost` mutation → Lambda cold-start → 504. Finished the cutover.

### Commit
`f339417` — "feat: Phase 4 - Vercel direct feed post creation (kills Lambda 504)"

### Files
| File | Change |
|------|--------|
| `web/src/pages/api/feed/create.ts` | **NEW** — POST route, JWT auth (cookie or Bearer), direct Mongo insert, fan-out feeditems to author + all followers |
| `web/src/components/Post/PostFormTimeline.tsx` | Authenticated path: `useCreatePostMutation` → `fetch('/api/feed/create')` + Apollo `refetchQueries(['Posts','Feed'])` on success. Guest path untouched. |

### Deferred (were backgrounded side-effects of old Apollo resolver)
- `activityService.logPosted` — activity feed entries
- Push/Nostr notifications to followers for new posts
- oEmbed thumbnail fetch for media links (only uses client-provided `uploadedMediaThumbnail`)

Worth restoring later via fire-and-forget Lambda call or cron — but post creation itself is now 504-proof.

### Lesson
Shipping "Phase N" on the server side means nothing if the client still calls the old endpoint. Always audit the caller after a bypass.

---

## 🔧 SESSION: Mar 3, 2026 — NFT MINTING FIX FOR LEGACY OAUTH USERS

### Summary
Legacy OAuth users (pre-Feb 2026, like Joey Broker) couldn't mint NFTs. `web3.eth.signTransaction()` returned `[-32603] Failed to fetch` through Magic's RPC relay. Magic support (Fin) confirmed ethers.js `signer.sendTransaction()` is their documented signing path. Both `_signAndBroadcast` (contract calls) and `_signAndBroadcastNative` (POL transfers) replaced with ethers v5 flow.

### Root Cause
- `web3.eth.signTransaction()` is NOT Magic's supported signing method for legacy OAuth wallets
- Legacy users have `googleWalletAddress`/`magicWalletAddress` but no `hdWalletAddress` → HD wallet tier skipped
- All 3 tiers of the signing system were failing for these users

### Fix (Commit `ede8e24aa`)

| Method | Before (BROKEN) | After (FIXED) |
|--------|-----------------|---------------|
| `_signAndBroadcast` | `web3.eth.signTransaction()` → `sendSignedTransaction()` | `ethers.providers.Web3Provider(magic.rpcProvider)` → `signer.sendTransaction()` |
| `_signAndBroadcastNative` | Same broken pattern | Same ethers.js fix |

### Magic's Documented Signing Path
```typescript
// ethers v5 (project uses 5.8.0)
const provider = new ethers.providers.Web3Provider((this.magic as any).rpcProvider);
const signer = provider.getSigner();
const tx = await signer.sendTransaction(txRequest);
const receipt = await tx.wait();
```

### 3-Tier Execution (Updated)
```
Tier 1: ethers.js signer.sendTransaction() via Magic RPC provider (FIXED)
    ↓ fails?
Tier 2: HD Wallet API signing (only for users with hdWalletAddress)
    ↓ fails or no HD wallet?
Tier 3: Magic .send() PromiEvent fallback
```

### Files Modified
| File | Changes |
|------|---------|
| `web/src/hooks/useBlockchainV2.ts` | Added `import { ethers } from 'ethers'`; replaced `_signAndBroadcast` and `_signAndBroadcastNative` with ethers.js |

### Key Lessons
- **NEVER use `web3.eth.signTransaction()` with Magic SDK** — not their supported path
- **ethers v5 vs v6**: v5 = `ethers.providers.Web3Provider`, v6 = `ethers.BrowserProvider` — check project version!
- **Magic has NO server-side key export API** — only user-initiated `revealPrivateKey()`
- **Always consult vendor support** — Magic's Fin bot confirmed the exact code pattern

### Pending
- Joey Broker live minting test after Vercel deploy
- WebRTC phone call testing (Pulse, both devices needed)

---

## 🔧 SESSION: Mar 2, 2026 — PULSE PWA CRASH FIX + MANIFEST FIX + INSTALL UX

### Summary
Three fixes for Pulse PWA: (1) React Error #310 infinite re-renders in standalone mode (`84cbea7ce`), (2) Wrong manifest showing when adding to home screen (`ed751ebb8`), (3) Chrome iOS users can't add to home screen — detection + Safari redirect.

### Commits
| Commit | Fix |
|--------|-----|
| `63e6c9d73` | Error boundary with "Clear Cache & Reload" button |
| `84cbea7ce` | Memoization fix — `endCall` refs, `closePickers` useCallback, stable toggle callbacks |
| `ed751ebb8` | PWA manifest DOM fix + Install pill button + Chrome iOS detection |

### Key Fixes
- **React #310**: `useWebRTCCall.endCall` had deps `[callId, remotePeer, sendSignal]` causing cascade. Fixed with refs → deps `[sendSignal]`
- **Manifest**: Safari reads `<link rel="manifest">` at HTML parse time only. `useEffect` removes stale manifests, ensures `/pulse-manifest.json`
- **Chrome iOS**: `/CriOS/` detection → auto-copy link → toast directing to Safari. Only Safari supports Add to Home Screen on iOS

### Files Modified
| File | Changes |
|------|---------|
| `web/src/hooks/useWebRTCCall.ts` | `endCall` uses refs for callId/remotePeer (breaks cascade) |
| `web/src/pages/dex/pulse.tsx` | `closePickers` → useCallback, stable toggles, manifest DOM fix, install UX, Chrome iOS detection |
| `web/src/pages/_app.tsx` | `AppErrorBoundary` class component |

---

## 👁️ SESSION: Feb 18, 2026 — AGENT EYE (OpenClaw Browser Bug Catcher)

### Summary
Built **Agent Eye** — the first passive browser bug catcher in the OpenClaw ecosystem (confirmed by scanning all 39 extensions). 3-layer architecture: content script captures user actions + errors in browser tabs, Chrome background.js relays to OpenClaw gateway via HTTP POST, extension stores bugs and exposes them as LLM tools + `/eye` command. **Zero booleans** — all state uses typed string enums with explicit `===` equality checks.

### Architecture
```
[Browser Tab]  content-script.js → clicks/errors/fetch failures
       ↓ chrome.runtime.sendMessage({ channel: "AGENT_EYE_REPORT" })
[background.js]  validates mode === EYE_MODE.WATCHING → POST
       ↓ HTTP POST to localhost:{port}/agent-eye/report
[OpenClaw Extension]  validates trigger → BugStore → tools + /eye command
```

### Files Created (5 new in openclaw repo)
| File | Purpose |
|------|---------|
| `extensions/agent-eye/package.json` | Workspace package `@openclaw/agent-eye` |
| `extensions/agent-eye/openclaw.plugin.json` | Plugin manifest |
| `extensions/agent-eye/index.ts` | HTTP route + 3 tools + `/eye` command |
| `extensions/agent-eye/src/store.ts` | BugStore — circular buffer (200 max, 1hr TTL), all typed enums |
| `assets/chrome-extension/content-script.js` | Captures user actions + errors in browser tabs |

### Files Modified (2)
| File | Change |
|------|--------|
| `assets/chrome-extension/manifest.json` | Added `scripting` + `<all_urls>` permissions |
| `assets/chrome-extension/background.js` | Agent Eye state (EYE_MODE enum), relay, programmatic injection |

### Enums (Zero Booleans)
- **EYE_MODE**: `WATCHING` / `DORMANT` / `PAUSED`
- **BUG_SEVERITY**: `CRITICAL` / `ERROR` / `WARNING` / `INFO`
- **TRIGGER_KIND**: `JS_ERROR` / `UNHANDLED_REJECTION` / `CONSOLE_ERROR` / `NETWORK_ERROR`
- **ACTION_KIND**: `CLICK` / `INPUT` / `SCROLL` / `NAVIGATE`
- **REPORT_VERDICT**: `ACCEPTED` / `RATE_LIMITED` / `REJECTED`

### Tools & Commands
| Tool/Command | Description |
|------|-------------|
| `agent_eye_bugs` | List/inspect bugs, filter by severity, full action timeline |
| `agent_eye_status` | Mode, counts by severity, buffer capacity |
| `agent_eye_clear` | Clear all bugs |
| `/eye watch\|sleep\|bugs\|clear\|status` | Slash command for mode control + quick view |

### PR
- **OpenClaw PR #19953**: https://github.com/openclaw/openclaw/pull/19953 — ALL CHECKS PASSED
- Fork `soundchainio/openclaw` synced with upstream

---

## 🎵 SESSION: Feb 17, 2026 — WALL AUDIO SHARE TO REELS (Sarg)

### Summary
Wall posts with uploaded audio files (non-SCid, non-NFT) couldn't be shared to stories/reels — Story button was gated to image/video only. Extended the full stack (backend + frontend) to support raw audio attachment on stories. Cover art displays as the reel visual while the music file plays in the background.

### Fixes

| Commit | Issue | Fix |
|--------|-------|-----|
| `e0a462c58` | **Story button missing on audio wall posts** | Added `mediaType === 'audio'` condition to show Story button |
| `e0a462c58` | **No way to attach raw audio to stories** | Added `attachedAudioUrl/Title/Artist/CoverUrl` params to `createStoryWithOverlays` mutation |
| `e0a462c58` | **StoriesBar ignored audio-only stories** | Changed condition from `attachedTrackId` to `attachedTrackId \|\| attachedTrackIpfsUrl` |
| `e0a462c58` | **SharePostModal Story button blocked audio** | `onShareToStory` callback now handles audio posts via cover art + audio URL |
| `85b0bf449` | **Audio not playing in reel** | File-upload publish path wasn't passing `attachedAudioUrl` params — now both fast-path and upload-path send audio |
| `85b0bf449` | **Wall posts without cover art couldn't share** | Removed `coverArtUrl` requirement — generates cyan vinyl-style visual card as fallback |

### Files Modified

| File | Changes |
|------|---------|
| `api/src/resolvers/StoryResolver.ts` | 4 new optional params: `attachedAudioUrl`, `attachedAudioTitle`, `attachedAudioArtist`, `attachedAudioCoverUrl` |
| `api/src/services/StoryService.ts` | Extended `CreateStoryParams` + fallback to raw audio when no `attachedTrackId` |
| `web/src/components/dex/CreateStoryModal.tsx` | Extended `PrefillMedia` interface with audio fields + `needsGeneratedCard`, `generateAudioCard()` canvas function for no-cover-art fallback, both publish paths pass audio params |
| `web/src/components/dex/ProfileWall.tsx` | Story button shows for ALL audio posts (with or without cover art), passes audio metadata + `needsGeneratedCard` flag through share flow |
| `web/src/components/dex/StoriesBar.tsx` | Maps `attachedTrack` for stories with raw audio (no Track ID) |

### How It Works
1. User sees audio post on wall (with or without cover art)
2. Clicks **Story** button
3. **With cover art:** Cover art becomes the reel's visual image
4. **Without cover art:** Generates a vinyl-style card with title + artist name
5. Audio URL stored as `attachedTrackIpfsUrl` on the Story document (reuses existing denormalized fields)
6. StoryViewer plays the audio during reel playback (existing `attachedTrack.audioUrl` system)

### Key Architecture Decision
Reused the existing `attachedTrack` denormalized fields (`attachedTrackIpfsUrl`, `attachedTrackTitle`, etc.) for raw audio — no new schema fields needed on the Story model. The only difference: no `attachedTrackId` (since there's no Track document for wall audio uploads).

---

## 🧱 SESSION: Feb 17, 2026 — WALL COMMENTS SHARING (Sarg)

### Summary
Wall replies (comments) had zero share/story buttons. SharePostModal generated wrong URLs for wall posts (`/posts/{id}` instead of `/dex/users/{handle}?wall={id}`). Fixed systematically to match regular post sharing patterns.

### Fixes (Commit `578711007`)

| Issue | Fix |
|-------|-----|
| **Wall replies had no share/story buttons** | Added Share, Story, and Delete action buttons to all wall replies |
| **SharePostModal wrong URL for wall posts** | Added `customUrl` prop — wall posts pass `/dex/users/{handle}?wall={id}` |
| **Reply shares linked nowhere useful** | Reply shares now link to parent wall post for context |
| **Story button missing on reply media** | Story button appears on replies with image/video media |

### Files Modified

| File | Changes |
|------|---------|
| `web/src/components/modals/SharePostModal.tsx` | Added `customUrl` prop to override default `/posts/{id}` URL |
| `web/src/components/dex/ProfileWall.tsx` | Reply action bar (Share/Story/Delete), updated share modal state type, correct wall URL passed to SharePostModal |

### Remaining Wall Gaps
- **Embed sharing to stories**: Wall posts with YouTube/Spotify embeds in body text can't share to stories yet (only uploaded image/video)
- **Deep-link for `?wall=` param**: Shared wall links don't auto-scroll to the specific post
- **Reply media uploads**: Replies currently only support text/stickers/embeds — no media upload (matches regular comment behavior)

---

## 🚨 SESSION: Feb 16, 2026 12:30 AM — API DEPLOY FIX (Fleet Commander)

### Summary
Backend Lambda hadn't deployed in 15+ hours. GitHub Actions deploys #57-#60 ALL failed with TypeScript errors: `Cannot find name 'nonNftOgun'` / `Cannot find name 'nftOgun'` in `api/src/db/checkHistoricalStreams.ts`. This meant none of the Feb 15 changes (login simplification, social media schema, SCid equalization, UI fixes) were live on the API.

### Root Cause
SCid rewards equalization (commit #58) replaced separate `nftOgun`/`nonNftOgun` variables with unified `totalOgun`, but `console.log` lines still referenced the old variables.

### Fix
Commit `e2c0db548`:
- Added back `nftOgun`/`nonNftOgun` definitions with unified 0.35 rate
- Excluded standalone DB scripts from `api/tsconfig.json` compilation
- TypeScript compiles cleanly (exit 0)
- Pushed to main — deploy #61 should succeed

### Key Lesson
Standalone scripts (e.g. `checkHistoricalStreams.ts`) included in `tsconfig.json` can block the entire `serverless deploy` if they have TS errors. Added to tsconfig exclude list as prevention.

### Login 400 — Original Diagnosis Was Wrong
- Frontend `ProfileComponentFields.graphql` does NOT have new social fields (already removed in `2633c1b22`)
- Backend `SocialMedias.ts` already HAS all 4 new fields
- The real issue: stale Lambda running code from Feb 11 (#56)
- Once deploy succeeds, login should work

### On Return: Verify
1. GitHub Actions deploy #61 = GREEN
2. `curl https://api.soundchain.io/graphql` returns 200
3. Login flow works for legacy users

---

## 🔧 SESSION: Feb 15, 2026 - HD WALLET SERVER-SIDE SIGNING + CRITICAL CONTRACT FIXES (Fleet Commander)

### Summary

Magic RPC Error `[-32603] Failed to fetch` still blocking ALL signing for legacy OAuth users. Built server-side HD wallet signing system to bypass Magic entirely for blockchain transactions. Discovered and fixed critical contract address mismatches.

### Commits This Session

| Commit | Description |
|--------|-------------|
| `733d49950` | HD wallet server-side signing + direct RPC for all reads |
| `5bc941a8c` | Replace bn.js BN with String() for Web3 v4 uint256 validation |
| `cddf4591f` | Add hardcoded fallback contract addresses to config.ts |
| `59dc8315d` | Correct hardcoded contract address fallbacks to match production |

### Architecture: 3-Tier Transaction Execution

```
Tier 1: Magic sign-broadcast (legacy OAuth users)
    ↓ fails?
Tier 2: HD Wallet API signing (users with hdWalletAddress)
    ↓ fails or no HD wallet?
Tier 3: Magic .send() fallback
```

**All blockchain READ calls now bypass Magic entirely** - use direct Polygon RPC (`polygon-bor-rpc.publicnode.com`).

### New API Endpoints

| Endpoint | Purpose | File |
|----------|---------|------|
| `POST /api/hd-wallet/sign-tx` | Sign contract call transactions server-side | `pages/api/hd-wallet/sign-tx.ts` |
| `POST /api/hd-wallet/send-native` | Send native POL transfers server-side | `pages/api/hd-wallet/send-native.ts` |

**Auth flow:** JWT from cookie → GraphQL Me query → derive wallet from `HUMAN_WALLET_SEED` → verify address matches `me.hdWalletAddress` → sign and broadcast via ethers.js

### Critical Discovery: DEAD Contract Addresses

`.env.local` and Lambda had addresses with **ZERO CODE** on Polygon mainnet:
- `0xF0287926D495719b239340Fc31d268b76bAD8B42` (labeled "NFT V2") - **NO CODE**
- `0xD772ccf784Df67E14186AA6E512c1A1bd32F394f` (labeled "Marketplace V1") - **NO CODE**

These were likely testnet addresses never updated for mainnet. Calling these caused `stack underflow (0 <=> 3)` errors on gas estimation.

**Correct addresses (from Vercel, verified on-chain):**
- NFT V2: `0xf01D323bdAc88ee39543CbBc568C6Fc76258FfE0` (17,288 chars bytecode)
- Marketplace Editions: `0x7EfC9A7F3381A4B28a2113EA99E2d80832589239` (27,398 chars bytecode)
- Marketplace V1: `0x27302E3ff5287a5973d8D5328C4cEFCd752778f2` (11,842 chars bytecode)

Full reference saved at: `/Users/soundchain/.claude/projects/-Users-soundchain/memory/contract-addresses.md`

### Web3.js v4 Breaking Change: BN.js

`bn.js` BN objects serialize to hex strings, which Web3.js v4 validator rejects for uint256 params:
```
Web3 validator found 2 error[s]: value ""00"" at "/3" must pass "uint256" validation
```
**Fix:** Replaced all `new BN(price)` with `String(price)` across `useBlockchainV2.ts` (10 occurrences).

### Files Modified

| File | Changes |
|------|---------|
| `web/src/hooks/useBlockchainV2.ts` | Added `_signViaHdWallet()`, `_sendNativeViaHdWallet()`, 3-tier `_execute()`, removed `import BN from 'bn.js'`, all `new BN()` → `String()` |
| `web/src/hooks/useBlockchain.ts` | All read functions switched from Magic web3 to direct RPC via `getDirectWeb3()` singleton |
| `web/src/config.ts` | Added hardcoded fallback addresses for all contracts matching Vercel production |
| `web/src/pages/api/hd-wallet/sign-tx.ts` | **NEW** - Server-side contract call signing with rate limiting |
| `web/src/pages/api/hd-wallet/send-native.ts` | **NEW** - Server-side native POL transfer |

### Vercel Env Var Added

`HUMAN_WALLET_SEED` - BIP-39 mnemonic for HD wallet derivation (retrieved from Lambda env vars)

### Current Blocker: Legacy OAuth Users

User `furdA1` is a legacy Google OAuth user (wallet `0x33F4d98e9CA621F26f3406AB6A2386D8786FE6CE`):
- Magic RPC is broken → can't sign via Tier 1
- No `hdWalletAddress` → Tier 2 skipped entirely
- The listing flow contract calls are valid (correct addresses, already approved)
- **Needs:** HD wallet generation/migration feature to escape Magic dependency

### Pending Tasks

1. **HD Wallet Migration Feature** - "Generate HD Wallet" button for legacy users + asset transfer option
2. **NFT Card UI on Wallet Page** - Cards too small, only play icon visible, no details page option
3. **Edition Owner Avatars** - Legacy UI showed owner avatars next to each edition NFT
4. **Lambda Contract Addresses** - `NFT_ADDRESS` and `MARKETPLACE_ADDRESS` still have dead addresses

---

## 🔧 SESSION: Feb 14, 2026 - MAGIC RPC FIX + HD WALLET RESOLUTION (Fleet Commander)

### Critical Fixes - All Blockchain TX Were Failing

**Commit:** `8b15ae0d1` - Pushed to production

| Fix | Root Cause | File |
|-----|-----------|------|
| Zero balances (POL/OGUN) | `getUserWalletAddress()` missing `hdWalletAddress` check | `useMagicContext.tsx` |
| ALL blockchain TX failing with `[-32603] Failed to fetch` | Magic SDK had NO network config → all RPC through Magic relay | `useMagicContext.tsx` |
| "Approve & List" button non-functional | Approve button hidden behind `PlayerAwareBottomBar` fixed position | `ListNFTModal.tsx` |

### Architecture Decision: Magic for Auth Only

**Before:** Magic SDK routed ALL blockchain calls through their relay server. Single point of failure.
**After:** Magic only handles auth + signing. Blockchain RPC calls go directly to Polygon nodes.

```
BEFORE: User → Magic SDK → Magic Relay (broken) → Polygon  ❌
AFTER:  User → Magic SDK → Polygon RPC (direct)  → Polygon  ✅
                  ↓
          Only signing through Magic
```

This matches industry standard (OpenSea/Blur/Rarible use direct wallet → chain).

### Key Lesson: Magic Network Config

```typescript
// ALWAYS include network config in Magic constructor:
const magicInstance = new Magic(key, {
  extensions: [new OAuthExtension()],
  network: { rpcUrl: network.rpc, chainId: network.id },  // REQUIRED!
});
```

### HD Wallet Resolution Order (CRITICAL)
```
hdWalletAddress → magicWalletAddress → googleWalletAddress → discordWalletAddress → twitchWalletAddress → emailWalletAddress
```
HD wallet users (Feb 2026+) have NO OAuth wallet addresses. Missing `hdWalletAddress` check = null = 0 balances.

### Pending: HD Wallet Migration Info Tooltip
User requested: "i" info hover tab explaining HD wallet benefits + migration path from Magic wallet to HD wallet for optimized flow.

### Handoff
`/soundchain-agent/handoffs/HANDOFF_2026-02-14_MAGIC_RPC_FIX.md`

---

## 🚀 SESSION: Feb 11, 2026 - L2 MARKETPLACE LAUNCH (Fleet Commander)

### THE DOPEST MARKET IN WEB3 - COMPLETE!

Full marketplace redesign with L2 branding. All 7 phases of the plan executed:

### Completed This Session

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | L2 Hero Section | ✅ Gradient hero, scrolling token ticker |
| 2 | Token Marketplace Tab | ✅ Replaced "Coming Soon" with TokenCard grid |
| 3 | Bundle Marketplace Tab | ✅ Replaced "Coming Soon" with BundleCard grid |
| 4 | Create Token Listing Modal | ✅ 3-step wizard (NEW FILE) |
| 5 | Create Bundle Listing Modal | ✅ 5-step wizard (NEW FILE) |
| 6 | Mock Data Layer | ✅ Ready for GraphQL integration |
| 7 | L2 Branding Polish | ✅ L2 badges on all card types |

### Files Created

| File | Purpose |
|------|---------|
| `components/modals/CreateTokenListingModal.tsx` | Token listing wizard - select token, set price, choose accepted currencies |
| `components/modals/CreateBundleListingModal.tsx` | Bundle creation wizard - select NFTs, add tokens, choose perks, set price |

### Files Modified

| File | Changes |
|------|---------|
| `pages/dex/[...slug].tsx` | Hero section, Token/Bundle tabs activated, modal state |
| `components/dex/TrackNFTCard.tsx` | L2 badge added |
| `components/dex/TokenCard.tsx` | L2 badge added |
| `components/dex/BundleCard.tsx` | L2 badge added |
| `styles/globals.css` | Marquee animation for token ticker |

### Marketplace Features

**Hero Section:**
- Gradient background (cyan → purple → pink)
- "THE DOPEST MARKET IN WEB3" headline
- Stats: 24 Tokens | 0.05% Fees | L2 Powered
- Scrolling token ticker (all 24 supported tokens)

**Token Listings:**
- 24 supported tokens (POL, OGUN, ETH, USDC, SOL, BNB, etc.)
- Fixed or auction sale types
- Multi-currency acceptance
- 0.05% platform fee

**Bundle Listings:**
- NFT multi-select
- Token allocation
- Private asset perks (concert tickets, vinyl, merch, etc.)
- Value calculation with savings display

### Build Status
```
Exit code: 0 - Build successful
```

### Handoff Created
`/soundchain-agent/handoffs/SARG_2026-02-11_L2_MARKETPLACE.md`

---

## 🎙️ SESSION: Feb 10, 2026 Morning (Fleet Commander)

### Completed This Session
1. ✅ **Fixed Magic OAuth Login** - Lambda VPC routing issue (was using IGW, needed NAT)
2. ✅ **Moltbook Radio Podcasts** - 4 audio files generated for human consumption
3. ✅ **Music Thread Research** - Found top music discussions (Swarm Music, Oracle Engine, etc.)
4. ✅ **Drafted 6 Moltbook Comments** - Ready to post on music threads
5. ✅ **Podcast-as-NFT Concept** - New content format for SoundChain

### Audio Files Created (Desktop)

| File | Voice | Duration | Content |
|------|-------|----------|---------|
| `moltbook-podcast-british.mp3` | Daniel (UK) | 5:26 | Full Moltbook summary |
| `supply-chain-attack-british.mp3` | Daniel (UK) | 2:35 | Security thread (106K comments) |
| `moltbook-music-podcast-british.mp3` | Daniel (UK) | 4:07 | Music threads summary |

### Magic OAuth Fix
- **Issue:** `SERVICE_ERROR` on login
- **Root Cause:** Lambda subnet using IGW route (Lambda can't use IGW - no public IP)
- **Fix:** Updated Lambda to use NAT-routed subnet only
- **Result:** Login works, returns correct `ERROR_MALFORMED_TOKEN` for invalid tokens

### Moltbook Music Threads Discovered

| Post | Author | Topic |
|------|--------|-------|
| Swarm Music | Daedalus-1 | Multi-agent oscillator composition |
| Oracle Engine | Daedalus-1 | I Ching hexagrams → music |
| Moosaic | AlIve | AI-native music for token-space |
| Email-to-Podcast | Fred | Audio transformation (75K comments) |

### Comments Ready to Post
6 comments drafted at `/audio/moltbook-music-comments.md`:
- Position SoundChain as ownership layer for AI music
- Use @SoundChain, @OGUN, @SoundChainRadio, @SoundChainIO accounts

### Session Files
- `/audio/SESSION-FEB-10-2026.md` - Full session documentation
- `/audio/moltbook-music-comments.md` - Drafted comments
- `/audio/*.txt` - Podcast scripts
- `/docs/SWARM-MUSIC-INTEGRATION.md` - Swarm engine spec

### 🎼 SWARM MUSIC ENGINE - LIVE!

**Commit:** `b7ce93e5a`

Built Kuramoto-based multi-agent composition system:

| Component | File | Purpose |
|-----------|------|---------|
| KuramotoEngine | `lib/swarm/kuramoto.ts` | Oscillator synchronization |
| SwarmComposer | `lib/swarm/composer.ts` | Phase → Musical notes |
| MIDI Generator | `lib/swarm/midi.ts` | Export to .mid files |
| Types | `lib/swarm/types.ts` | TypeScript interfaces |

**API Endpoints:**
- `POST /api/agent/swarm/compose` - Create composition
- `GET /api/agent/swarm/demo` - Quick demo
- `GET /api/agent/swarm/status/[id]` - Check status
- `GET /api/agent/swarm/download/[id]` - Download MIDI/JSON

**Roles:** melody, bass, drums, pad, lead, arp, fx
**Modes:** major, minor, dorian, phrygian, lydian, mixolydian, locrian, pentatonic

---

## 🦞 SESSION: Feb 9, 2026 Evening (Sarg/iPhone 14)

### Completed This Session
1. ✅ **Deleted 3 test SCID tracks** - kept the good one (2600893)
2. ✅ **Drafted 4 Moltbook posts** → `/soundchain/moltbook-posts-ready.json`
3. ✅ **Registered new Moltbook agent** → SoundChainRadio (pending claim)
4. ✅ **Inline Profile Panel** → Bio icon now shows profile card above feed (commit `52a8b9663`)

### MOLTBOOK - ACTION REQUIRED (War Room)
**Status:** BLOCKED - Need Moltbook API keys from Fleet Commander

@OGUN suspended 1 week. Cannot post without `moltbook_xxx` keys.

### WAR ROOM ACTION REQUIRED
When you get to Fleet Commander, do ONE of these:

**Option A: Retrieve existing keys**
```bash
# Check for stored Moltbook credentials
cat ~/.config/moltbook/credentials.json
grep -r "moltbook_sk" ~/
```

**Option B: Login to Moltbook dashboard**
1. Go to https://www.moltbook.com/humans/dashboard
2. Find @SoundChain and @SoundChainIO agents
3. Copy their API keys
4. Save to `~/.config/moltbook/credentials.json`

**Option C: Use new agent (already registered)**
```json
{
  "name": "SoundChainRadio",
  "api_key": "[REDACTED — see ~/.config/moltbook/credentials.json; PENDING ROTATION — User deferred Apr 28; values exposed in public repo since Jan 30 → assume compromised, rotate when bandwidth allows]",
  "claim_url": "https://moltbook.com/claim/moltbook_claim_MB4bNEU-tV7w4fAaRgK_Fp6zgCdUMRrw",
  "verification_code": "seabed-HU5A",
  "status": "pending_claim"
}
```
Tweet to claim: `I'm claiming my AI agent "SoundChainRadio" on @moltbook 🦞 Verification: seabed-HU5A`

### Ready-to-Post Content
4 posts drafted in `/tmp/agent_posts.json`:
1. **Discovery Post** - Curiosity hook about open APIs
2. **Tutorial Post** - Step-by-step how to earn OGUN
3. **Community Vibe** - Philosophical agent economy post
4. **Challenge Post** - 100 OGUN for first agent artist

### Post Command (once you have API key)
```bash
curl -X POST "https://www.moltbook.com/api/v1/posts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MOLTBOOK_API_KEY" \
  -d '{"title": "...", "body": "..."}'
```

---

## 🌐 HD WALLET SYSTEM COMPLETE (Feb 8, 2026 Morning)

**Environment:** Fleet Commander (MacBook Pro)
**Status:** FULLY DEPLOYED - HD wallets for humans + agents + marketplace compatible

### What Was Built

**HD Wallet System for Human Users** - Multi-chain support at $0 cost:

| Component | Status | Details |
|-----------|--------|---------|
| **Backend Generation** | ✅ LIVE | `api/src/services/AuthService.ts` - auto-generates on registration |
| **HD Wallet Utility** | ✅ LIVE | `api/src/utils/hdWallet.ts` - derivation path `m/44'/60'/1'/0/{index}` |
| **User Model Fields** | ✅ LIVE | `hdWalletAddress`, `primaryWallet`, `migrationStatus`, `solanaAddress` |
| **GraphQL Types** | ✅ LIVE | `PrimaryWalletType`, `MigrationStatus` enums added |
| **Frontend Display** | ✅ LIVE | `MultiWalletAggregator.tsx` shows HD wallet with multi-chain badge |
| **Legacy Migration Banner** | ✅ LIVE | Shows "Upgrade to Multi-Chain Wallet" for legacy users |
| **Marketplace Support** | ✅ LIVE | `useBlockchainV2.ts` now checks `hdWalletAddress` FIRST |

### Key Architecture

```
NEW USERS (Feb 2026+):
┌────────────────────────────────────────────────────────────────┐
│  Login (Google/Discord/etc)                                   │
│       ↓                                                        │
│  Magic OAuth handles authentication (FREE)                    │
│       ↓                                                        │
│  HD Wallet generated from HUMAN_WALLET_SEED ($0 cost)         │
│       ↓                                                        │
│  Same address works on: Polygon, Ethereum, Base, Arbitrum...  │
└────────────────────────────────────────────────────────────────┘

LEGACY USERS (pre-Feb 2026):
┌────────────────────────────────────────────────────────────────┐
│  Existing Magic OAuth wallet preserved (NFTs/assets safe)      │
│       ↓                                                        │
│  "Upgrade to Multi-Chain Wallet" banner shown in wallet page  │
│       ↓                                                        │
│  Can generate HD wallet (future migration tool for assets)    │
└────────────────────────────────────────────────────────────────┘
```

### Derivation Paths (CRITICAL - Keep Separate!)

| User Type | Path | Seed |
|-----------|------|------|
| **Agents** | `m/44'/60'/0'/0/{index}` | `AGENT_MASTER_SEED` |
| **Humans** | `m/44'/60'/1'/0/{index}` | `HUMAN_WALLET_SEED` |

### Marketplace HD Wallet Compatibility

**Wallet Resolution Order** (in `useBlockchainV2.ts`):
1. `hdWalletAddress` - PRIMARY for new users
2. `magicWalletAddress` - Legacy email login
3. `googleWalletAddress` - Legacy Google OAuth
4. `discordWalletAddress` - Legacy Discord OAuth
5. `twitchWalletAddress` - Legacy Twitch OAuth
6. `emailWalletAddress` - Legacy Magic Link

**Commits:**
- `0aaba4f21` - Skip Magic wallet storage for new users (HD only)
- `bbf85f1e0` - HD wallet UI + legacy user upgrade banner
- `2d717238f` - Enable HD wallet for marketplace transactions

### GitHub Secrets Required

| Secret | Purpose |
|--------|---------|
| `HUMAN_WALLET_SEED` | BIP-39 mnemonic for human HD wallets |
| `AGENT_MASTER_SEED` | BIP-39 mnemonic for agent HD wallets (separate!) |

---

## 📊 MARKETPLACE DIAGNOSTIC REPORT (Feb 8, 2026)

### Current Status

| Feature | Status | Notes |
|---------|--------|-------|
| **Polygon (POL) Payments** | ✅ WORKING | Native token |
| **OGUN Payments** | ✅ WORKING | ERC-20 token |
| **0.05% Platform Fee** | ✅ WORKING | All transactions to Gnosis Safe |
| **Treasury Address** | ✅ CORRECT | `0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b` |
| **HD Wallet Support** | ✅ FIXED | Now first in wallet resolution chain |
| **External Wallet (MetaMask)** | ⚠️ LIMITED | Display only, not for marketplace tx |

### ZetaChain Omnichain - BLOCKING ITEMS

**Status:** Contracts written, NOT deployed

| Blocker | Details |
|---------|---------|
| **Contract Deployment** | 4 contracts ready, need mainnet deployment |
| **Environment Variables** | `NEXT_PUBLIC_OMNICHAIN_7000`, etc. - all empty |
| **Token Wallet Addresses** | 22 of 24 tokens need Gnosis Safe addresses |

**Tokens Pending Setup (22):**
PENGU, ETH, USDC, USDT, SOL, BNB, DOGE, BONK, MEATEOR, PEPE, BASE, XTZ, AVAX, SHIB, XRP, SUI, HBAR, LINK, LTC, ZETA, BTC, YZY

**Tokens Working (2):** POL (MATIC), OGUN

### ZetaChain Deployment Steps (When Ready)

1. Deploy contracts to Polygon, ZetaChain, Ethereum
2. Add contract addresses to Vercel env vars
3. Generate wallet addresses for 22 tokens in Gnosis Safe
4. Authorize tokens in treasury vault
5. Test cross-chain purchases

---

## 🔥 AGENT ONBOARDING LIVE (Feb 8, 2026) - kilmon IS AGENT #1!

**Environment:** Fleet Commander (MacBook Pro)
**Status:** FULLY OPERATIONAL - Agent registration + HD wallets LIVE!

### MAJOR MILESTONE: First Agent Registered

| Field | Value |
|-------|-------|
| **Agent ID** | sc_kilmon |
| **Polygon Address** | 0x1ae13351C932De94405440124185d03601E82A92 |
| **Whitelist Position** | #1 of 10,000 |
| **Badge** | early_adopter |
| **Registered** | Feb 8, 2026 6:31 AM MST |

### Infrastructure Deployed

| Component | Details |
|-----------|---------|
| MongoDB Atlas | Cluster "moltbookagents" (free tier, us-east-1) |
| Database | agents |
| Network Access | 0.0.0.0/0 (Vercel serverless) |
| HD Wallet Seed | Configured in Vercel env vars |

### Agent Onboarding Endpoints (ALL LIVE)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/agent/register` | Register + get Polygon wallet |
| `POST /api/agent/export-key` | Export private key (self-custody) |
| `GET /api/agent/leaderboard` | Competitive ranking |
| `GET /api/agent/profile/{name}` | Agent profile page |
| `GET /api/agent/airdrop/status` | Check eligibility |

### Tiered Airdrop Status

| Tier | Reward | Remaining |
|------|--------|-----------|
| Whitelist 1 | 5 OGUN | 9,999 / 10,000 |
| Whitelist 2 | +5 OGUN (mint SCID) | 5,000 / 5,000 |

**75,000 OGUN allocated. kilmon sparked the evolution protocol.**

### Key Fix: ethers v5 HD Wallet Derivation
```typescript
// Fixed: pass path as second argument
const wallet = ethers.Wallet.fromMnemonic(AGENT_MASTER_SEED, path)
```

---

## 🦞 MOLTBOOK PLAYGROUND SESSION (Feb 7, 2026) - OGUN RADIO LIVE!

**Environment:** iPhone 14 Pro Max (Sarg) via ttyd tunnel
**Working Dir:** `/Users/soundchain/soundchain/web`
**Repo:** `soundchainio/soundchain-public` (PUBLIC open-source)
**Branch:** `main` (NOT production!)
**Push Command:** `git push origin main`
**Status:** FULLY OPERATIONAL - Radio + Agent Listening LIVE!

### CRITICAL: Correct Git Flow
```bash
# CORRECT (public repo, main branch)
git push origin main

# WRONG (old private repo pattern)
git push origin HEAD:production  # DON'T USE THIS
```

### Major Accomplishments

1. **OGUN Radio LIVE** - 618 NFT tracks now broadcasting
2. **Moltbook Agent Playground** - Transformed /backend page
3. **Agent Play Tracking** - Track which agents stream which tracks
4. **GraphQL Fix** - Found and fixed `owner` field issue

### New Endpoints Created

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/agent/play` | POST | Agent reports a track play |
| `/api/agent/play` | GET | View play statistics |
| `/api/agent/analytics` | GET | Comprehensive agent activity |
| `/api/agent/radio/listen` | GET | **AGENT LISTENING** - Audio as data |
| `/api/agent/radio/comment` | POST/GET | Comment on tracks |
| `/api/agent/radio/bookmark` | POST/GET/DELETE | Save tracks |
| `/api/agent/radio/subscribe` | POST/GET/DELETE | Follow artists |
| `/api/agent/radio/share` | POST/GET | Share tracks |
| `/api/agent/radio/activity` | GET | Live activity feed |

### Triple Helix Architecture

SoundChain evolved from Double Helix to **Triple Helix**:
- **Pillar 1:** MongoDB (data persistence)
- **Pillar 2:** Polygon (on-chain ownership)
- **Pillar 3:** AGENTS (coordination layer - flows through center)

See `/Users/soundchain/soundchain-agent/L2.md` for full architecture.

### Bug Found & Fixed

**Issue:** OGUN Radio returning empty queue (0 tracks)
**Debug Method:** Added debug logging to radio endpoint
**Root Cause:** GraphQL query requesting `owner` field that doesn't exist on Track type
**Error:** `Cannot query field "owner" on type "Track"` (400 response)
**Fix:** Removed `owner` field from TRACKS_QUERY in radio.ts
**Result:** 618 tracks now loading, radio fully operational

### Moltbook Agent Playground

**URL:** `soundchain.io/backend`

Transformed from "WEB3 BACKEND DASHBOARD" placeholder to full agent playground:
- OGUN Radio live status with now playing track
- SoundChain Moltbook agents list (@SoundChain, @OGUN, @SoundChainIO)
- Agent API documentation inline
- SCID streaming rewards explanation
- AI music minting CTA for agents
- Kept real wallet data (POL/OGUN balances, NFT collection)

**Commit:** `8acb6e2ce`

### Play Tracking System

Agents can now report plays and view statistics:

```bash
# Report a play
curl -X POST https://soundchain.io/api/agent/play \
  -H "Content-Type: application/json" \
  -d '{"track_id":"xxx","track_title":"Varja","agent_name":"MyAgent"}'

# View stats
curl https://soundchain.io/api/agent/play
```

**Tracks:** plays per agent, plays per track, top tracks, top agents, recent activity

**Limitation:** Stats reset on serverless cold start (MongoDB persistence planned)

### New Moltbook Posts

| Post | Agent | URL |
|------|-------|-----|
| Agent Playground: Where AI Meets Music NFTs | @SoundChainIO | https://moltbook.com/post/af02ef96-3cb0-46b1-8810-b4bf5919ff7e |
| OGUN Radio Broadcasting: 618 NFT Tracks LIVE | @OGUN | https://moltbook.com/post/9a204459-7db6-46c8-965b-60c892737d42 |

### Files Created/Modified

| File | Purpose |
|------|---------|
| `web/src/pages/api/agent/play.ts` | Play tracking endpoint |
| `web/src/pages/api/agent/analytics.ts` | Agent analytics |
| `web/src/pages/backend/index.tsx` | Moltbook Agent Playground |
| `web/src/pages/api/agent/radio.ts` | Fixed GraphQL query |
| `web/src/pages/api/agent/stats.ts` | Fixed GraphQL query |

### Key Commits (Feb 7, 2026)

- `8acb6e2ce` - feat: Transform /backend page into Moltbook Agent Playground
- `3bfca7cbd` - fix: Remove invalid owner field from radio query
- `086050fec` - feat: Add agent play tracking and analytics endpoints

---

## 🤖 AGENT GATEWAY SESSION (Feb 6, 2026) - MOLTBOOK INTEGRATION

**Environment:** iPhone 14 Pro Max (Sarg) via ttyd tunnel
**Working Dir:** `/Users/soundchain/soundchain/web`
**Branch:** production
**Vision:** SoundChain becomes a destination for AI agents - a 90s mall vibe

### What We Built

**Agent Gateway v1.0** - Invite Moltbook agents to SoundChain!

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `GET /api/agent/feed` | Public posts, tracks, stories | None |
| `GET /api/agent/tracks?q=` | Search tracks | None |
| `GET /api/agent/trending` | Hot content | None |
| `GET /api/agent/discover` | Random discovery | None |
| `GET /api/agent/heartbeat` | Platform status | Optional |
| `GET /api/agent/blog` | Agent blog posts | None |
| `POST /api/agent/blog` | Create agent post | None |
| `GET /api/agent/aggregator` | Intelligence scraper | None |

**Agent Blog Types:** concept, vibe, protocol, integration, implementation, question

**Files Created:**
```
web/public/skill.md                    # Agent discovery document
web/src/pages/api/agent/*.ts           # 8 API endpoints
web/src/pages/dex/agent-feed.tsx       # Cyberpunk blog viewer
```

**Commits:**
- `56b20a9b1` - Agent Gateway v1.0 (skill.md + 5 APIs)
- `03e5e5bea` - Agent Blog & Aggregator System

### Agent Blog Features

- Real-time feed at `/dex/agent-feed`
- Cyberpunk aesthetic with neon accents
- Filter by post type (concept, vibe, protocol, etc.)
- Live polling every 30 seconds
- Aggregator extracts trending topics & active agents

### Moltbook Integration - LIVE!

**3 Agents Claimed:**
- @SoundChain (web3 submolt) - `[REDACTED — PENDING ROTATION (User deferred Apr 28)]`
- @OGUN (crypto submolt) - `[REDACTED — PENDING ROTATION (User deferred Apr 28)]`
- @SoundChainIO (ai submolt) - `[REDACTED — PENDING ROTATION (User deferred Apr 28)]`
- @SoundChainProtocol - unclaimed (save for later)

**Posts Published to 1.7M Agents:**
1. "Agent Gateway is LIVE" - https://moltbook.com/post/12981853-61f3-4f8f-8518-efcef6905ba0
2. "OGUN Token Powers the Future" - https://moltbook.com/post/79d7f02b-5654-4d18-8ea1-5d6f275c8d0d
3. "Agent-Human Hybrid Social" - https://moltbook.com/post/bdb7fd62-3d96-45f8-9222-38b391935040

**Engagement (as of Feb 6 evening):**
| Post | Upvotes | Comments |
|------|---------|----------|
| Agent Gateway | 3 | 5 |
| OGUN Token | 1 | 10 |
| Agent-Human | 1 | 8 |
| **TOTAL** | **5** | **23** |

**Notable Engagements:**
- KaiJackson (244 karma) - Detailed tokenomics critique, replied with substantive response
- FiverrClawOfficial (892 karma, 78 followers) - Auth model questions, engaged on 2 posts
- moltscreener (491 karma) - Collaboration offer
- KirillBorovkov (949 karma) - Engaged on all 3 posts

**All comments replied** ✅ **All commenters followed** ✅

### OGUN Radio - NFT Radio Player Agent (Feb 6-7, 2026)

**Status:** ✅ FULLY OPERATIONAL (Feb 7, 2026)

**What it does:**
- Automated DJ that broadcasts NFT tracks every hour
- Posts "Now Playing" to SoundChain agent feed + Moltbook
- Cycles through all **618 tracks** in database over ~26 days
- Includes instructions for agents to report plays

**Endpoints:**
| Endpoint | Purpose |
|----------|---------|
| `GET /api/agent/radio` | Current track + play instructions |
| `GET /api/agent/radio?action=playlist` | Full playlist |
| `POST /api/agent/radio/broadcast` | Cron broadcast |
| `POST /api/agent/play` | Report a track play |
| `GET /api/agent/play` | View play statistics |

**Cron:** Every hour (24 broadcasts/day) - `vercel.json`

**Files:**
- `web/src/pages/api/agent/radio.ts`
- `web/src/pages/api/agent/radio/broadcast.ts`
- `web/src/pages/api/agent/stats.ts`
- `web/src/pages/api/agent/play.ts` (NEW)
- `web/src/pages/api/agent/analytics.ts` (NEW)

**RESOLVED:** Vercel env var `NEXT_PUBLIC_API_URL` set via War Room (Feb 6 night)

**GraphQL Fix:** Removed `owner` field from query - field doesn't exist on Track type

### Stats Endpoint (NEW Feb 6, 2026)

**Endpoint:** `GET /api/agent/stats`
**Status:** Working - returns real DB counts

**Results:**
- Total Tracks: **618**
- Sample size: 200

### Tracking Files

- Full strategy: `/Users/soundchain/soundchain-agent/moltbook.md`
- API keys: `/Users/soundchain/soundchain-agent/moltbook-saved-keys.md`

---

## 🎖️ SARG SESSION (Feb 4, 2026) - MOBILE HOTFIXES + L2 PROGRESS

**Environment:** iPhone 14 Pro Max (Sarg) via ttyd tunnel
**Working Dir:** `/Users/soundchain/soundchain/web`
**Branch:** main
**Status:** Fleet Commander handoff ready

### Bugs Fixed & Deployed

| Bug | Fix | Commit |
|-----|-----|--------|
| Reels fail at 60% upload | Reduced threshold 50MB → 25MB | `c27f2f40e` |
| FollowModal behind feed | Fixed positioning + z-[9999] | `4cee0d561` |
| Following not loading | Pass profileId to lazy query | `4cee0d561` |

### L2 Progress

**New Contract:** `PinningRewards.sol` - P2P IPFS pinning incentives
- Each Reel = a node in the network
- Community pins content, earns OGUN
- No Pinata, no rate limits, decentralized storage
- **Total L2 Contracts: 8 (~3,300 lines Solidity)**

**Token Decision:** OGUN stays OGUN (no rename for L2)

### 🚨 FLEET COMMANDER TODO: Authorize Backend Wallet

**Piggy Bank claims need this to work on-chain:**

1. **Gnosis Safe Created:** "SCid-Distributer" on Polygon ✅ (50 POL funded)

2. **Generate backend EOA wallet:**
   ```bash
   node -e "const w = require('ethers').Wallet.createRandom(); console.log('Address:', w.address); console.log('Private Key:', w.privateKey);"
   ```

3. **Save to Vercel:** `WALLET_PRIVATE_KEY` = private key

4. **Fund wallet:** Send small POL (~$20) to the address

5. **Authorize via Gnosis Safe:**
   - Contract: `0xcf9416c49D525f7a50299c71f33606A158F28546`
   - Function: `addDistributor(backendWalletAddress)`

6. **Verify:** `isAuthorizedDistributor(address)` returns TRUE

7. **Test:** Piggy Bank → Claim OGUN → Should hit chain

---

## 🎬 LATE NIGHT SESSION (Feb 2-3, 2026) - APP POLISH + 24HR STORIES/REELS

**Environment:** Remote ttyd terminal via Cloudflare tunnel
**Working Dir:** `/Users/soundchain/soundchain/web`
**Branch:** main
**Vibe:** "THIS IS AN APP NOW BRAH!" 🚀

### Session Summary (Feb 2-3, 2026 - Late Night/Early Morning)

**MASSIVE UI/UX Improvements:**

| Feature | Status | Commit |
|---------|--------|--------|
| Full-screen profile cover (70vh) | ✅ DONE | `8766ca9c5` |
| Users page in nav dropdown | ✅ DONE | `cbf499b25` |
| Cyberpunk compose button (blade runner glow) | ✅ DONE | `09a9492e4` |
| Massive emote expansion (100+ emotes) | ✅ DONE | `09a9492e4` |
| 24hr Stories/Reels bar | ✅ DONE | `8724a63e5` |
| Story Viewer modal (full-screen) | ✅ DONE | `202169109` |
| Create Story modal | ✅ DONE | `202169109` |
| Shareable stories (internal + external) | ✅ DONE | `776c636d7` |
| Safe useMe() destructuring (crash fix) | ✅ DONE | `9906cd302` |
| Smart media compression engine | ✅ DONE | `7d22bba0c` |
| Duration selector for image stories (1-10 min) | ✅ DONE | `7d22bba0c` |
| Compression progress UI + success badge | ✅ DONE | `7d22bba0c` |
| StoryViewer keyboard navigation | ✅ DONE | `bf2dcc1fb` |
| StoryViewer video duration detection | ✅ DONE | `bf2dcc1fb` |
| StoryViewer touch swipe gestures | ✅ DONE | `7369af16f` |

---

### 🎬 24-HOUR STORIES/REELS FEATURE - DECENTRALIZED INSTAGRAM!

**What makes SoundChain Stories BETTER than Instagram:**

| Feature | Instagram | SoundChain |
|---------|-----------|------------|
| Storage | Meta servers | IPFS (decentralized) |
| Permanence | Always expires | Pay OGUN to keep forever |
| Proof | None | On-chain verification |
| Algorithm | Manipulated | Chronological |
| Payments | In-app only | External wallets (iOS compliant!) |

**Story Constraints:**
```typescript
STORY_CONSTRAINTS = {
  MIN_DURATION: 1,        // 1 second minimum
  MAX_DURATION: 600,      // 10 minutes max
  DEFAULT_DURATION: 60,   // 1 minute default
  MAX_FILE_SIZE: 1GB,     // 1 GB max
  EXPIRY_HOURS: 24,       // Stories expire after 24 hours
}
```

**Components Created:**
| Component | File | Purpose |
|-----------|------|---------|
| `StoriesBar` | `components/dex/StoriesBar.tsx` | Horizontal scrolling stories strip |
| `StoryViewer` | `components/dex/StoryViewer.tsx` | Full-screen story viewing |
| `CreateStoryModal` | `components/dex/CreateStoryModal.tsx` | Upload and share stories |

**StoriesBar Features:**
- IG-style avatar bubbles with gradient rings
- Unwatched stories: cyan→purple→pink gradient
- Watched stories: gray gradient
- "Your Story" bubble with + to create
- Permanent stories: gold sparkle badge
- Multiple stories count indicator
- Scroll arrows for desktop

**StoryViewer Features:**
- Progress bars for multi-story users
- Tap left (prev), center (pause), right (next)
- **Touch swipe gestures**: Swipe left/right for navigation, swipe down to close
- **Keyboard navigation**: Escape (close), Arrow keys (nav), Space (pause), M (mute)
- **Video duration detection**: Uses actual video length instead of hardcoded timing
- Quick reactions: ❤️🔥🚀😂
- Reply input with send
- Share menu (copy link, X/Twitter, native share)
- Make Permanent CTA with OGUN payment
- View count and reactions display
- Desktop: user navigation arrows + user preview strip

**CreateStoryModal Features:**
- Drag & drop or tap to upload
- Video duration detection (up to 10 min)
- File size validation (up to 1 GB - hidden from users!)
- **Duration selector for images** (1, 3, 5, 10 min options)
- **Smart compression engine** - auto-compresses large files while maintaining quality
- **Compression progress UI** - shows real-time optimization progress
- **Compression success badge** - shows % reduction after optimization
- Caption overlay tool
- File info badges (duration, size)
- IPFS decentralized storage badge

**Media Compression Engine (`lib/mediaCompression.ts`):**
- Smart detection: Only compresses when needed (> target size)
- Image compression: Canvas-based JPEG with quality binary search (0.92 → 0.7)
- Video compression: MediaRecorder + VP9/VP8 codec transcoding
- Progress callbacks: Real-time stage and percentage updates
- Quality-first: Never drops below minimum quality thresholds

```typescript
// Easter egg: File size limits are HIDDEN from users!
// They just see their file "magically" fit the requirements
COMPRESSION_CONFIG = {
  story: { maxFileSize: 1GB, targetBitrate: 8Mbps },
  image: { maxWidth: 4096, quality: 0.92, minQuality: 0.7 }
}
```

**Share Functionality:**
- Internal: Send to DM, share to feed
- External: Copy link, share to X/Twitter
- Native share API on mobile
- External shares include full reel preview

**Backend Requirements (TODO):**
```graphql
type Story {
  id: ID!
  profileId: ID!
  mediaUrl: String!       # IPFS URL
  mediaType: String!      # 'image' | 'video'
  caption: String
  createdAt: DateTime!
  expiresAt: DateTime!    # createdAt + 24hrs
  isPermanent: Boolean!
  permanentTxHash: String
  viewCount: Int!
  reactions: [StoryReaction!]!
}

# Mutations
createStory(mediaUrl: String!, mediaType: String!, caption: String): Story!
viewStory(storyId: ID!): Story!
reactToStory(storyId: ID!, emoji: String!): Story!
makeStoryPermanent(storyId: ID!, txHash: String!): Story!

# Queries
myFollowingStories: [StoryUser!]!
userStories(userId: ID!): [Story!]!
```

---

### 🎨 CYBERPUNK COMPOSE BUTTON

**Old:** Basic Feather icon with gradient background
**New:** Blade Runner / Dystopian style with:
- Glass-morphism backdrop blur
- Cyan border with glow effect
- Pulsing ring animation
- PenLine icon with neon drop shadow
- Hover: intensified glow

```tsx
<button className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full
  bg-black/80 backdrop-blur-xl border border-cyan-500/50
  shadow-[0_0_30px_rgba(6,182,212,0.4),inset_0_0_20px_rgba(6,182,212,0.1)]
  hover:shadow-[0_0_40px_rgba(6,182,212,0.6)]">
  <PenLine className="text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
</button>
```

---

### 😎 MASSIVE EMOTE EXPANSION

**Before:** ~30 emotes
**After:** 100+ animated emotes from 7TV, BTTV, FFZ, Twitch, Kick

**SC Category (SoundChain Favorites):**
```
catJAM, pepeD, NODDERS, Clap, peepoClap, HYPERS, Prayge, KEKW, LULW,
OMEGALUL, EZ, PogU, Sadge, Copium, PepeLaugh, monkaS, FeelsGoodMan,
FeelsBadMan, peepoHappy, peepoSad, PepeHands, WideHard, HACKERMANS,
WAYTOODANK, Pepega, Aware, BOOBA, TriHard, monkaW, forsenCD, PauseChamp,
CoolCat, GIGACHAD, Clueless, Bedge, modCheck, Stare, BASED, DESPAIR,
Susge, NOTED, CAUGHT, FeelsStrongMan, peepoArrive, peepoLeave, peepoRiot,
peepoSit, peepoGiggles, peepoBlush, POGGERS, WeirdChamp, Pepepains,
ICANT, Okayge, NOIDONTTHINKSO, xqcL, LETSGO, Madge, Pepepls, PETTHE,
Chatting, lebronJAM
```

**Reactions Category:** 65+ curated emotes for quick reactions

**Emote Flurry Mode:** Picker stays open for rapid emote insertion 🔥

---

### 📱 PROFILE PAGE - FULL-SCREEN COVER

**Before:** Small banner with separate profile info section = lots of black space
**After:** Instagram/Twitter-style with:
- Cover image takes 70% viewport height (`h-[70vh] min-h-[400px]`)
- Profile info overlaid at bottom of cover
- Gradient overlay for text readability
- Avatar "floats" with rounded corners and shadow
- Stats, badges, action buttons all integrated in hero section
- Back button top-left with blur backdrop

---

### 👥 USERS PAGE IN NAV DROPDOWN

Added Users link to main navigation dropdown:
- Position: After Explore, before Shop
- Color: Indigo (`text-indigo-400`)
- Icon: Users from lucide-react
- Route: `/dex/users`
- Shows stacked avatar grid of all users

---

### 🔮 UPCOMING: YZY TOKEN + SOLANA INTEGRATION

User mentioned supporting Kanye West's YZY token on Solana. Combined with existing ZetaChain omnichain support (24-32 tokens), SoundChain is positioned for massive multi-chain expansion.

**Solana Integration Notes:**
- Install `@magic-ext/solana` + `@solana/web3.js`
- Add SolanaExtension to Magic SDK
- Users get separate Solana address (different from EVM)
- Add `solanaWalletAddress` to User model

---

### 📋 NEXT SESSION PRIORITIES

1. **AWS API Gateway** - Complete direct connection (bypass EC2 proxy)
2. **Backend Stories** - GraphQL schema, MongoDB model, IPFS integration
3. **High-res Compression** - FFmpeg.wasm for client-side compression without quality loss
4. **iOS App Store** - Final polish before submission

---

## 🚨 PREVIOUS SESSION (Feb 2, 2026) - API GATEWAY DIRECT CONNECTION

**Environment:** Remote ttyd terminal via Cloudflare tunnel
**Working Dir:** `/Users/soundchain/soundchain`
**Branch:** main
**New Public Repo:** `github.com/soundchainio/soundchain-public`

### Session Summary (Feb 2, 2026 - Afternoon)

**Completed:**
- ✅ Pushed API redeploy after Vercel env var cleanup (removed quotes)
- ✅ Magic Admin SDK v2.8.2 deployed (fixes SERVICE_ERROR on login)
- ✅ Found production API Gateway: `production-soundchain-api` (ID: `19ne212py4`)
- ✅ Invoke URL: `https://19ne212py4.execute-api.us-east-1.amazonaws.com/production`
- ✅ Requested ACM certificate for `api.soundchain.io` (cert ID: `d802632a-515a-44a2-984d-371741e03d71`)
- ✅ DNS provider confirmed: name.com (not Cloudflare)

**Waiting on:**
- ⏳ Co-founder adding CNAME validation record to name.com
- ⏳ ACM cert to change from "Pending validation" → "Issued"

**Next session (after 11pm MST Feb 2):**
- Create custom domain in API Gateway
- Map `production-soundchain-api` to custom domain
- Update `api.soundchain.io` DNS to point directly to API Gateway
- Test and verify login works
- Optionally stop EC2 proxy to save ~$15-35/month

---

### 🔥 CRITICAL: OPEN SOURCE REPO MIGRATION (Jan 30-31, 2026)

**MILESTONE: SoundChain moved from private AE repo to public open source repo!**

#### What Happened
1. Migrated all code from private repo to `soundchainio/soundchain-public`
2. Connected Vercel to new public repo
3. Needed to migrate ALL environment variables to new GitHub Actions secrets
4. Site went DOWN after migration - API returning 502 errors

#### Issues Encountered & Fixes

| Issue | Cause | Status | Fix |
|-------|-------|--------|-----|
| **502 Bad Gateway** | Missing GitHub secrets | ✅ FIXED | Added 28+ secrets to repo |
| **Secret name mismatch** | Workflow expected `_PRODUCTION` suffix | ✅ FIXED | Edited workflow to use non-suffixed names |
| **MongoError: Auth failed** | Missing DocumentDB params | ✅ FIXED | Added `?tls=true&authSource=admin&authMechanism=SCRAM-SHA-1&retryWrites=false` |
| **MongoError: Auth failed** | PASSWORD special chars not URL-encoded | ⚠️ PENDING | User must update GitHub secret |
| **SERVERLESS_ACCESS_KEY syntax** | Used GitHub syntax in serverless.yml | ✅ FIXED | Changed `${{ secrets.X }}` to `${env:X}` |
| **WalletConnect WebSocket error** | Quoted project ID in Vercel env | ✅ FIXED | Removed quotes from env var |
| **NFT Playback "audio unavailable"** | CSP headers blocking IPFS | ✅ FIXED | Removed CSP, moved domain to new Vercel project |
| **Nav dropdowns behind content** | z-index stacking context + overflow | ✅ FIXED | Removed z-10 from wrapper, overflow-x-hidden from nav |
| **Post-login 404 redirect** | Config defaulted to `/dex` not `/dex/feed` | ✅ FIXED | Changed `redirectUrlPostLogin` to `/dex/feed` |
| **Vercel env vars with quotes** | GTM_ID, WalletConnect ID had literal `"` | ✅ FIXED | User removed quotes from Vercel env vars |
| **Magic Admin SDK SERVICE_ERROR** | SDK v1.3.4 incompatible with new tokens | ✅ FIXED | Upgraded to v2.8.2, changed init to `await Magic.init()` |
| **🚨 LOGIN STILL BROKEN** | Workflow deployed to `main` stage, API Gateway points to `production` stage | ✅ FIXED | Changed `serverless deploy -s production` (commit `9eb685a62`) |
| **🚨 API COMPLETELY DOWN** | EC2 Nginx proxy (54.89.147.104) HTTPS port 443 not responding, SSL cert expired Dec 9 | ⏳ PENDING | Bypass EC2, point directly to API Gateway (see task below) |

---

## 🎯 PRIORITY TASK: Bypass EC2 Proxy → Direct API Gateway (Feb 2, 2026)

**WHY:** The EC2 Nginx proxy at `54.89.147.104` is down (SSL expired, HTTPS not responding). Instead of fixing it, we're eliminating it entirely to save ~$15-35/month and reduce maintenance.

**CURRENT:** `api.soundchain.io` → EC2 Nginx (BROKEN) → API Gateway → Lambda
**TARGET:** `api.soundchain.io` → API Gateway (DIRECT) → Lambda

---

### ✅ PROGRESS (Feb 2, 2026)

| Step | Status | Details |
|------|--------|---------|
| 1. Find API Gateway | ✅ DONE | `production-soundchain-api` (ID: `19ne212py4`) |
| 2. Get Invoke URL | ✅ DONE | `https://19ne212py4.execute-api.us-east-1.amazonaws.com/production` |
| 3. Request ACM Certificate | ✅ DONE | Cert ID: `d802632a-515a-44a2-984d-371741e03d71` |
| 4. Add CNAME for validation | ⏳ WAITING | Co-founder adding to name.com DNS |
| 5. Create custom domain | ⏳ PENDING | After cert validates |
| 6. Map API to domain | ⏳ PENDING | After custom domain created |
| 7. Update DNS to API Gateway | ⏳ PENDING | Final step |

---

### ⏳ WAITING ON: CNAME Validation Record (Co-founder handling)

**Status:** Co-founder confirmed will add CNAME to name.com. User returning after 11pm MST on Feb 2, 2026 to complete remaining steps.

**Co-founder needs to add this CNAME in name.com:**

| Type | Host | Value |
|------|------|-------|
| CNAME | `_d98dbeb53fe11ae9fa6365d8a447477d.api` | `_793b08a244a9972320659e9abe69bade.jkddzztszm.acm-validations.aws.` |

Once added, cert validates in 5-30 minutes, then status changes to **"Issued"**.

---

### 🔜 REMAINING STEPS (after cert is Issued)

#### STEP 5: Create Custom Domain in API Gateway
1. Go to API Gateway → **Custom domain names** → **Create**
2. Domain name: `api.soundchain.io`
3. Endpoint type: **Regional**
4. ACM certificate: Select `d802632a-515a-44a2-984d-371741e03d71`
5. Click **Create domain name**

#### STEP 6: Map API to Custom Domain
1. Click on the new custom domain
2. Go to **API mappings** tab → **Configure API mappings**
3. Add mapping:
   - **API:** `production-soundchain-api`
   - **Stage:** `production`
   - **Path:** (leave empty)
4. Click **Save**
5. Copy the **API Gateway domain name** shown (e.g., `d-xxxxxxxxxx.execute-api.us-east-1.amazonaws.com`)

#### STEP 7: Update DNS at name.com
1. Log into name.com → soundchain.io → DNS Records
2. Find existing `api.soundchain.io` record (A record pointing to 54.89.147.104)
3. Delete or update it to:
   - **Type:** CNAME
   - **Host:** `api`
   - **Value:** The API Gateway domain from Step 6
4. Save and wait 2-5 min for propagation

#### STEP 8: Verify & Cleanup
```bash
curl https://api.soundchain.io/graphql -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```
Should return: `{"data":{"__typename":"Query"}}`

Then optionally stop EC2 instance `54.89.147.104` to save ~$15-35/month.

---

### 📝 Resume Command for Claude
When ready to continue, tell Claude:
> "Resume API Gateway migration - ACM cert should be validated now. Let's finish steps 5-8."

### Estimated Savings
- EC2 instance: ~$10-30/month
- EBS storage: ~$1-3/month
- No more SSL renewal headaches
- **Total: ~$15-35/month saved**

### Rollback Plan
If something goes wrong, you can always:
1. Route 53 → Change `api.soundchain.io` back to A record → `54.89.147.104`
2. EC2 Instance Connect → `sudo systemctl restart nginx`

#### GitHub Secrets Added to New Repo (28+)
```
AWS_ACCESS_KEY_ID          = [configured - rotated keys]
AWS_SECRET_ACCESS_KEY      = [configured - rotated keys]
DATABASE_USERNAME          = soundchainadmin
DATABASE_PASSWORD          = [MUST BE URL-ENCODED! See encoding section below]
JWT_NAMESPACE             = https://soundchain.io
JWT_SECRET                = [configured]
PINATA_API_KEY            = [configured]
PINATA_API_SECRET         = [configured]
MUX_TOKEN_ID              = [configured]
MUX_TOKEN_SECRET          = [configured]
MUX_DATA_ID               = [configured]
MUX_DATA_SECRET           = [configured]
MAGIC_PRIVATE_KEY         = [configured]
VAPID_PUBLIC_KEY          = [configured]
VAPID_PRIVATE_KEY         = [configured]
SENDGRID_API_KEY          = [configured]
SENDGRID_SENDER_EMAIL     = [configured]
WEB_APP_URL               = https://soundchain.io
WALLET_PUBLIC_KEY         = [configured]
WALLET_PRIVATE_KEY        = [configured]
ALCHEMY_API_KEY           = [configured]
MARKETPLACE_ADDRESS       = [configured]
NFT_ADDRESS               = [configured]
AUCTION_ADDRESS           = [configured]
AUCTION_V2_ADDRESS        = [configured]
NFT_MULTIPLE_EDITION_ADDRESS = [configured]
MARKETPLACE_MULTIPLE_EDITION_ADDRESS = [configured]
POLYGON_SCAN_API_KEY      = [configured]
SERVERLESS_ACCESS_KEY     = [from app.serverless.com]
```

#### DATABASE_PASSWORD URL Encoding (CRITICAL)
The password contains special characters that MUST be URL-encoded:
- Raw: `C:8F4lx]mpF.C8Fmwd2ixdoIGUGM`
- `:` → `%3A`
- `]` → `%5D`
- **URL-encoded: `C%3A8F4lx%5DmpF.C8Fmwd2ixdoIGUGM`**

**GitHub Secret `DATABASE_PASSWORD` MUST contain the URL-encoded version!**

#### Serverless.yml Fixes Made
```yaml
# Fix 1: Added DocumentDB connection params (commit 59c0aa64e)
DATABASE_URL: mongodb://${env:DATABASE_USERNAME}:${env:DATABASE_PASSWORD}@${self:custom.db.host}:${self:custom.db.port}/soundchain?tls=true&authSource=admin&authMechanism=SCRAM-SHA-1&retryWrites=false

# Fix 2: Corrected SERVERLESS_ACCESS_KEY syntax
# BEFORE (wrong):
SERVERLESS_ACCESS_KEY: ${{ secrets.SERVERLESS_ACCESS_KEY }}
# AFTER (correct):
SERVERLESS_ACCESS_KEY: ${env:SERVERLESS_ACCESS_KEY}
```

#### Workflow Secret Name Fixes (commit 593e64f4e)
```yaml
# BEFORE (expected _PRODUCTION suffix):
DATABASE_PASSWORD: ${{ secrets.DATABASE_PASSWORD_PRODUCTION }}
DATABASE_USERNAME: ${{ secrets.DATABASE_USERNAME_PRODUCTION }}

# AFTER (no suffix):
DATABASE_PASSWORD: ${{ secrets.DATABASE_PASSWORD }}
DATABASE_USERNAME: ${{ secrets.DATABASE_USERNAME }}
```

#### Current Status (Updated Jan 31, 2026 6:15 PM)
- **Frontend**: UP ✅
- **API**: UP ✅ (Database connected)
- **NFT Playback**: UP ✅ (IPFS audio working)
- **Login**: TESTING (Magic SDK v2 deployed, awaiting verification)

---

### 🔧 MAGIC ADMIN SDK v2 UPGRADE (Jan 31, 2026)

**Issue:** `Magic Admin SDK Error: [SERVICE_ERROR]` on all logins
**Root Cause:** API using SDK v1.3.4, incompatible with newer Magic tokens

**Fix:**
1. Upgraded `@magic-sdk/admin` from `^1.3.4` to `^2.8.2`
2. Changed initialization syntax:
```typescript
// BEFORE (v1 - broken):
const magic = new Magic(config.magicLink.secretKey);

// AFTER (v2 - correct):
const magic = await Magic.init(config.magicLink.secretKey);
```

**Files Changed:**
- `api/package.json` - Updated dependency version
- `api/src/resolvers/UserResolver.ts` - Changed `register` and `login` mutations to use async init

**Commit:** `8031ec251`

---

### 🚨 CRITICAL: SERVERLESS STAGE MISMATCH (Jan 31, 2026)

**Issue:** Google OAuth login STILL broken after all other fixes
**Symptom:** Login fails, API returns errors even though code looks correct

**ROOT CAUSE DISCOVERED:**
```
Old AE repo → deployed to stage "production" → Lambda: soundchain-api-production-graphql
New public repo → deployed to stage "main" → Lambda: soundchain-api-main-graphql
API Gateway (api.soundchain.io) → points to "production" stage → OLD CODE!
```

The new code with Magic SDK v2.8.2 was being deployed to the WRONG Lambda!

**Fix:** Changed workflow to always deploy to `production` stage:
```yaml
# BEFORE (wrong - deployed to branch name):
serverless deploy -s ${GITHUB_REF#refs/heads/} --verbose

# AFTER (correct - always production):
serverless deploy -s production --verbose
```

**File:** `.github/workflows/deploy-production.yml` line 139
**Commit:** `9eb685a62`

**LESSON LEARNED:** When migrating repos, check that the serverless stage matches what your API Gateway expects!

---

### 🔧 VERCEL ENVIRONMENT VARIABLE QUOTES (Jan 31, 2026)

**Issue:** Multiple Vercel env vars had literal quote characters `"` in them
**Symptom:** URLs like `gtm.js?id=%22GTM-MNT3BNF%22` (quotes URL-encoded)

**Affected Variables:**
- `NEXT_PUBLIC_GTM_ID` → had `"GTM-MNT3BNF"` instead of `GTM-MNT3BNF`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` → had quotes + newline
- `NEXT_PUBLIC_MAGIC_KEY` → had quotes (fixed earlier)

**Fix:** User removed quotes from all affected Vercel environment variables

**Lesson:** When copying values to Vercel, NEVER include surrounding quotes.

---

### 🔧 POST-LOGIN REDIRECT FIX (Jan 31, 2026)

**Issue:** After successful login, user redirected to 404 page
**Root Cause:** `config.redirectUrlPostLogin` defaulted to `/dex` instead of `/dex/feed`

**Fix:** Changed in `web/src/config.ts`:
```typescript
// BEFORE:
redirectUrlPostLogin: process.env.NEXT_PUBLIC_REDIRECT_URL_POST_LOGIN || '/dex',

// AFTER:
redirectUrlPostLogin: process.env.NEXT_PUBLIC_REDIRECT_URL_POST_LOGIN || '/dex/feed',
```

**Commit:** `c7ba494bb`

---

### 🔧 NFT PLAYBACK FIX (Jan 31, 2026)

**Issue:** NFT playback shows "Skipping [track title] (audio unavailable)" toast
**Root Cause:** New Vercel project `soundchain-site` has empty environment variables

**Vercel has TWO projects:**
- `web` (old) → has all env vars configured ✅
- `soundchain-site` (new open source) → env vars EMPTY ❌

**Critical Env Vars Needed in `soundchain-site`:**
```
NEXT_PUBLIC_API_URL=https://api.soundchain.io/graphql
NEXT_PUBLIC_IPFS_GATEWAY=https://soundchain.mypinata.cloud/ipfs/
NEXT_PUBLIC_DOMAIN_URL=https://soundchain.io
NEXT_PUBLIC_MAGIC_KEY=pk_live_858EC1BFF763F101
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=8e33134dfeea545054faa3493a504b8d
NEXT_PUBLIC_OGUN_ADRESS=0x45f1af89486aeec2da0b06340cd9cd3bd741a15c
NEXT_PUBLIC_REDIRECT_URL_POST_LOGIN=/dex
```

**Fix:** Copy env vars from `web` project to `soundchain-site` in Vercel Dashboard

**Full env var list saved at:** `/Users/soundchain/soundchain-agent/VERCEL_ENV_VARS.md`

---

### 🔧 GOOGLE OAUTH LOGIN FIX (Jan 31, 2026)

**Issue:** Google login errors on new open source repo

**Diagnostic Analysis:**
1. Frontend `NEXT_PUBLIC_MAGIC_KEY` - has hardcoded fallback, should work ✅
2. Backend `MAGIC_PRIVATE_KEY` - configured in serverless.yml ✅
3. **Magic Dashboard OAuth Redirect** - may need new domain whitelisted ⚠️

**OAuth Redirect Flow:**
```
login.tsx line 275:
const redirectUri = `${window.location.origin}/login`;
```

**If new site is on different domain (e.g., `soundchain-site.vercel.app`):**

1. **Magic Dashboard** (dashboard.magic.link)
   - App Settings → Redirect Allowlist
   - Add: `https://soundchain-site.vercel.app`
   - Add: `https://soundchain.io` (production)

2. **Google Cloud Console** (console.cloud.google.com)
   - APIs & Services → Credentials → OAuth 2.0 Client IDs
   - Authorized redirect URIs → Add new domain

**API Keys (Local Reference):**
- Magic Public Key: `pk_live_858EC1BFF763F101`
- Magic Secret Key: `[REDACTED — see Vercel env / .env.local; PENDING ROTATION — User deferred Apr 28; values exposed in public repo since Jan 30 → assume compromised, rotate when bandwidth allows]`

---

### 🔥 WALLET-FIRST LOGIN - VIP DOOR FOR WEB3 POWER USERS (Jan 30, 2026)

**MASSIVE ARCHITECTURAL SHIFT: Two doors to SoundChain**

The MagicLink approach (2021-2022) was training wheels - great for onboarding non-crypto users, but it filtered out Web3 power users who saw it as "junior level." Now we have BOTH doors:

1. **VIP Door (Wallet)** → Degens, whales, NFT collectors - 2 clicks, they're in
2. **Front Door (OAuth/Email)** → Normies, new-to-crypto artists - gentle onboarding

#### What We Built

**Login Page Redesign (`web/src/pages/login.tsx`):**
```
┌─────────────────────────────────────────────┐
│  🔥 VIP WALLET LOGIN - TOP OF PAGE          │
│                                             │
│   ┌───────────┐    ┌───────────┐           │
│   │    🦊     │    │    🔗     │           │
│   │ MetaMask  │    │WalletConnect│          │
│   └───────────┘    └───────────┘           │
│   Trust, Rainbow, Ledger + 300 more         │
└─────────────────────────────────────────────┘
                 ─── OR ───
            [ SOUNDCHAIN LOGO ]
         [ Google ] [ Discord ] [ Twitch ]
                 ─── OR ───
              [ Email login ]
```

**Features:**
- Wallet login at TOP of page - first thing users see
- MetaMask detection (extension + mobile dapp browser)
- WalletConnect integration (Trust, Rainbow, Ledger + 300 wallets)
- NEW user registration form with handle/displayName (same as OAuth!)
- Existing users sign & go straight in
- Backend `loginWithWallet` mutation creates user + generates Nostr keypair

**Flow for New Wallet Users:**
1. Click MetaMask or WalletConnect
2. Connect wallet
3. System checks: user exists?
4. If NEW → Registration form (Display Name, Username, Terms)
5. Sign message to verify ownership
6. Account created with proper handle (not `wallet_1234abcd` garbage)
7. Redirect to feed

**Files Modified:**
- `web/src/pages/login.tsx` - Complete redesign with wallet-first UI
- `web/src/hooks/useWalletLogin.ts` - Backend mutation hook (already existed)
- `api/src/resolvers/UserResolver.ts` - `loginWithWallet` mutation (already existed)
- `api/src/services/AuthService.ts` - `registerWithWallet` + Nostr keypair generation

**Commits:**
- `9a0195eb2` - fix: Redesign MakePostPermanentModal as slim toast
- `93ac78f02` - fix: Wallet browser login now authenticates with backend
- `401a80a54` - feat: Wallet-first login - VIP door for Web3 power users
- `6562a39ea` - feat: Wallet registration flow - same experience as OAuth
- `36ed7ebf7` - feat: Add WalletConnect for Trust, Rainbow, Ledger + 300 wallets
- `fdcae5a7e` - fix: VIP wallet flow now at TOP of login page

---

### 🎉 Make Post Permanent Modal Redesign (Jan 30, 2026)

**Issue:** Modal opened above posts, off-screen on mobile
**Fix:** Redesigned as slim toast-style modal at bottom of screen

**Changes:**
- Position: Fixed at bottom (not center/off-screen)
- Accordion sections: Wallet selector and pricing collapse by default
- Minimal default: Token toggle + price + pay button
- Processing states: Ultra-compact toast spinner
- Size reduced: 626 → 351 lines (44% smaller)

**Commit:** `9a0195eb2`

---

### 🚀 PUBLIC REPO LAUNCH & UI POLISH (Jan 30, 2026)

**MILESTONE: SoundChain Open-Sourced to Public Repo!**

**Public Repo:** `github.com/soundchainio/soundchain-public`
**Tagline:** "Stream. Earn. Own. LFG."

#### Open Source Setup
- Switched git origin from AE private repo to new public repo
- Connected Vercel to public repo (first deploy succeeded!)
- Fixed Node.js 22 requirements for Capacitor CLI
- Created GitHub Wiki pages with holographic matrix design
- Updated README social links for public visibility

#### Post Card UI Polish (Holographic Matrix Era)
Fixed background transparency issues where cover photos bled through post cards:

**Files Modified:**
- `web/src/pages/dex/[...slug].tsx`
  - Feed container: Added `bg-black/95` for solid background
  - Single post view: Same treatment
  - Profile section: Added solid backgrounds to container + tab content
  - Footer: Made solid black + sticky at bottom (`sticky bottom-0 bg-black`)
- `web/src/components/Post/CompactPost.tsx`
  - Text cards: Changed from transparent gradient to solid `bg-neutral-900`
  - Footer: Changed from 50% opacity to solid background
- `web/src/components/Post/Posts.tsx`
  - View mode toggle: Changed from `bg-neutral-800/50` to solid

**Result:** Post cards now have solid backgrounds that don't let the background image/video bleed through.

**Commits:**
- `d447a9b0e` - fix: Solid backgrounds for post cards - no more transparency bleed

---

### Nostr NIP-17 Server-Side Notifications (Jan 29, 2026)

**Feature:** Server-side Nostr notification service that sends encrypted DMs via NIP-17 protocol. Users receive notifications in Bitchat app or any NIP-17-compatible Nostr client - **completely FREE, no SMS costs!**

#### Architecture
```
┌──────────────────────┐     ┌───────────────────┐     ┌──────────────────────┐
│  SoundChain API      │     │   Nostr Relays    │     │  User's Bitchat      │
│  (Server-side)       │────▶│   (5 public)      │────▶│  or Nostr Client     │
│                      │     │                   │     │                      │
│  NotificationService │     │  Encrypted DM     │     │  Receives real-time  │
│  + NostrService      │     │  (kind 1059)      │     │  notifications       │
└──────────────────────┘     └───────────────────┘     └──────────────────────┘
```

#### Implementation Details

**Backend Files:**
- `api/src/services/NostrNotificationService.ts` - **NEW** Full NIP-17 DM sending service
  - Uses nostr-tools 2.7.0 with nip44 encryption
  - Gift-wrapped messages (kind 1059) for privacy
  - Supports npub (bech32) and hex pubkey formats
  - Publishes to 5 relays: damus, snort, nos.lol, nostr.band, purplepag.es
- `api/src/services/NotificationService.ts` - Integrated Nostr notifications
  - Added `sendNostrNotification()` helper method
  - Nostr notifications sent alongside web push for: Follow, Like, Comment
- `api/src/models/User.ts` - Added fields:
  - `nostrPubkey?: string` - User's Nostr public key
  - `notifyViaNostr?: boolean` - Enable/disable Nostr notifications
- `api/src/services/UserService.ts` - Updated `updateNotificationSettings()`
  - Handles npub to hex conversion
  - Validates pubkey format
- `api/src/types/UpdateNotificationSettingsInput.ts` - Added Nostr fields

**Frontend Files:**
- `web/src/components/forms/NotificationSettingsForm.tsx` - New Nostr UI section
  - Toggle to enable Nostr notifications
  - Input for Nostr pubkey (npub or hex)
  - Link to Bitchat app on App Store
  - Privacy explanation
- `web/src/graphql/Me.graphql` - Added nostrPubkey, notifyViaNostr
- `web/src/pages/dex/[...slug].tsx` - Pass Nostr fields to form

**Environment Variable (for production):**
```bash
SOUNDCHAIN_NOSTR_PRIVATE_KEY=<64-char-hex-private-key>
```
If not set, service generates ephemeral key (dev mode warning).

**Notification Types Supported:**
- New Follower
- New Like
- New Comment
- New DM
- New Tip
- NFT Sold
- OGUN Earned (streaming rewards)

**Commits:**
- `9232890dd` - feat: Add Nostr NIP-17 notifications via Bitchat
- `06c5d6b5b` - fix: Add Nostr fields to Me query and NotificationSettingsForm

---

### DM Messages Fix (Jan 29, 2026)

**Issue:** DM messages showing timestamps but no message content
**Root Cause:** `DMModal.tsx` used `message.body` but GraphQL fragment uses `message.message`
**Fix:** Changed to `message.message` in DMModal.tsx
**Commit:** `5fe2c67e8`

### OAuth Wallet Balance Fix (Jan 29, 2026)

**Issue:** OAuth wallet balances showing 0 POL and 0 OGUN
**Root Cause:** Condition in useMagicContext wasn't triggering fallback wallet properly
**Fix:** Updated condition to check if wallet differs from current account
**Commit:** `5f7984aa3`

### Nostr Identity Session Restore Fix (Jan 30, 2026)

**Issue:** "Your Nostr identity will be generated on your next login" but nothing generated after logout/login
**Root Cause:** Session restore via cookie bypassed the `login` mutation where Nostr keypair generation happened. Existing users with valid JWT cookies never triggered the generation code.
**Fix:** Added Nostr keypair generation to the `me` query resolver - now generates on first query if missing
**Commit:** `e77a3cd03`

**Also Added:** Nostr identity display in Account Settings dropdown (under Display Name/Username) with copy button

---

## 🔥 JANUARY 2026 - LEGENDARY MONTH SUMMARY 🔥

### Major Features Shipped
| Feature | Impact | Cost to Users |
|---------|--------|---------------|
| **Online Indicators** | Real-time presence | FREE |
| **Activity Feed** | Social engagement tracking | FREE |
| **Web Push Notifications** | Browser alerts even when closed | FREE |
| **Nostr NIP-17 Notifications** | Decentralized encrypted DMs | FREE |
| **Multi-Chain Balance Viewing** | 5+ EVM networks | FREE |
| **Profile Tips (OGUN)** | Direct creator support | 0.05% fee |
| **Post Permanence (OGUN)** | On-chain immortalization | OGUN cost |
| **RoyaltySplitter Contract** | Post-mint collaborator splits | Gas only |
| **Video Thumbnail Previews** | Better share link cards | FREE |

### Bug Fixes & Improvements
- Stream count dedup (loops now count!)
- External wallet balance fetching
- DM message rendering
- OAuth wallet balances
- Mobile player crash fixes
- Form input styling
- Profile header contrast
- NFT mint flow (external wallets)
- TDZ crash recovery (production bisect)

---

## 📡 DETAILED SYSTEM FLOWS

### 1. NOSTR NOTIFICATION FLOW (End-to-End)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        NOSTR NIP-17 NOTIFICATION FLOW                           │
└─────────────────────────────────────────────────────────────────────────────────┘

  USER A (Sender)                    SOUNDCHAIN                    USER B (Recipient)
       │                                  │                              │
       │  1. Follows User B               │                              │
       │─────────────────────────────────▶│                              │
       │                                  │                              │
       │                    ┌─────────────┴─────────────┐                │
       │                    │  FollowService.follow()   │                │
       │                    │         │                 │                │
       │                    │         ▼                 │                │
       │                    │  NotificationService      │                │
       │                    │  .sendFollowNotification()│                │
       │                    └─────────────┬─────────────┘                │
       │                                  │                              │
       │                    ┌─────────────┴─────────────┐                │
       │                    │  Check User B Settings:   │                │
       │                    │  • notifyOnFollow: true?  │                │
       │                    │  • notifyViaNostr: true?  │                │
       │                    │  • nostrPubkey exists?    │                │
       │                    └─────────────┬─────────────┘                │
       │                                  │                              │
       │                    ┌─────────────┴─────────────┐                │
       │                    │  NostrNotificationService │                │
       │                    │  .sendNotification()      │                │
       │                    │         │                 │                │
       │                    │         ▼                 │                │
       │                    │  1. Load server privkey   │                │
       │                    │     (SOUNDCHAIN_NOSTR_    │                │
       │                    │      PRIVATE_KEY)         │                │
       │                    │         │                 │                │
       │                    │         ▼                 │                │
       │                    │  2. Create inner event    │                │
       │                    │     (kind 14 = NIP-17 DM) │                │
       │                    │     content: "User A      │                │
       │                    │     followed you!"        │                │
       │                    │         │                 │                │
       │                    │         ▼                 │                │
       │                    │  3. NIP-44 encrypt with   │                │
       │                    │     User B's pubkey       │                │
       │                    │         │                 │                │
       │                    │         ▼                 │                │
       │                    │  4. Gift-wrap (kind 1059) │                │
       │                    │     - Random keypair      │                │
       │                    │     - Hides metadata      │                │
       │                    │         │                 │                │
       │                    │         ▼                 │                │
       │                    │  5. Sign with random key  │                │
       │                    └─────────────┬─────────────┘                │
       │                                  │                              │
       │                    ┌─────────────┴─────────────┐                │
       │                    │  Publish to 5 relays:     │                │
       │                    │  • wss://relay.damus.io   │                │
       │                    │  • wss://relay.snort.social                │
       │                    │  • wss://nos.lol          │                │
       │                    │  • wss://relay.nostr.band │                │
       │                    │  • wss://purplepag.es     │                │
       │                    └─────────────┬─────────────┘                │
       │                                  │                              │
       │                                  │    ┌────────────────────────┐│
       │                                  │───▶│   NOSTR RELAYS         ││
       │                                  │    │   Store kind 1059      ││
       │                                  │    │   events indexed by    ││
       │                                  │    │   recipient pubkey     ││
       │                                  │    └───────────┬────────────┘│
       │                                  │                │             │
       │                                  │                │  Relay push │
       │                                  │                │  to clients │
       │                                  │                ▼             │
       │                                  │    ┌────────────────────────┐│
       │                                  │    │  BITCHAT APP (iOS)     │◀
       │                                  │    │  or any NIP-17 client  │
       │                                  │    │         │              │
       │                                  │    │         ▼              │
       │                                  │    │  1. Receive kind 1059  │
       │                                  │    │  2. Decrypt outer layer│
       │                                  │    │  3. Get kind 14 DM     │
       │                                  │    │  4. NIP-44 decrypt     │
       │                                  │    │  5. Display message    │
       │                                  │    └────────────────────────┘
       │                                  │                              │
       │                                  │                   📱 PUSH!   │
       │                                  │              "User A followed│
       │                                  │                    you!"     │
```

**Key Files:**
| File | Purpose |
|------|---------|
| `api/src/services/NostrNotificationService.ts` | NIP-17 encryption & relay publishing |
| `api/src/services/NotificationService.ts` | Orchestrates all notification types |
| `api/src/utils/nostrKeygen.ts` | Keypair generation for new users |
| `api/src/models/User.ts` | `nostrPubkey`, `nostrPrivateKey`, `notifyViaNostr` |

**NIP-17 Protocol Stack:**
```
┌─────────────────────────────────────┐
│  Gift Wrap (kind 1059)              │  ← Random throwaway keypair
│  ┌───────────────────────────────┐  │
│  │  Seal (kind 13)               │  │  ← Encrypted with recipient pubkey
│  │  ┌─────────────────────────┐  │  │
│  │  │  DM (kind 14)           │  │  │  ← Actual message content
│  │  │  "User A followed you!" │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

### 2. WEB PUSH NOTIFICATION FLOW

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          WEB PUSH NOTIFICATION FLOW                             │
└─────────────────────────────────────────────────────────────────────────────────┘

  BROWSER (User B)                   SOUNDCHAIN API                PUSH SERVICE
       │                                  │                        (Google/Apple)
       │                                  │                              │
       │  1. Enable Push (one-time)       │                              │
       │─────────────────────────────────▶│                              │
       │     • Request permission         │                              │
       │     • Generate subscription      │                              │
       │       (endpoint + keys)          │                              │
       │                                  │                              │
       │                    ┌─────────────┴─────────────┐                │
       │                    │  PushSubscriptionService  │                │
       │                    │  .subscribe()             │                │
       │                    │         │                 │                │
       │                    │         ▼                 │                │
       │                    │  Store in MongoDB:        │                │
       │                    │  • userId                 │                │
       │                    │  • endpoint (unique URL)  │                │
       │                    │  • keys.p256dh            │                │
       │                    │  • keys.auth              │                │
       │                    └─────────────┬─────────────┘                │
       │                                  │                              │
       │  [Later: User A likes User B's track]                          │
       │                                  │                              │
       │                    ┌─────────────┴─────────────┐                │
       │                    │  ReactionService          │                │
       │                    │  .toggleReaction()        │                │
       │                    │         │                 │                │
       │                    │         ▼                 │                │
       │                    │  NotificationService      │                │
       │                    │  .sendLikeNotification()  │                │
       │                    └─────────────┬─────────────┘                │
       │                                  │                              │
       │                    ┌─────────────┴─────────────┐                │
       │                    │  WebPushService           │                │
       │                    │  .sendNotification()      │                │
       │                    │         │                 │                │
       │                    │         ▼                 │                │
       │                    │  web-push.sendNotification│                │
       │                    │  (subscription, payload,  │                │
       │                    │   vapidDetails)           │────────────────▶
       │                    └─────────────┬─────────────┘                │
       │                                  │                              │
       │                                  │                   ┌──────────┴──────────┐
       │                                  │                   │  Push Service       │
       │                                  │                   │  (FCM/APNs)         │
       │                                  │                   │         │           │
       │                                  │                   │         ▼           │
       │                                  │                   │  Route to device    │
       │                                  │                   │  via endpoint URL   │
       │                                  │                   └──────────┬──────────┘
       │                                  │                              │
       │◀─────────────────────────────────┼──────────────────────────────┘
       │                                  │              Push delivered!
       │                                  │
  ┌────┴────┐                             │
  │ Service │  Event: 'push'              │
  │ Worker  │─────────────────────┐       │
  │         │                     │       │
  └────┬────┘                     ▼       │
       │              self.registration   │
       │              .showNotification(  │
       │                "User A liked     │
       │                 your track!"     │
       │              )                   │
       │                                  │
       │  [User clicks notification]      │
       │                                  │
       │  Event: 'notificationclick'      │
       │─────────────────────────────────▶│
       │  clients.openWindow('/dex/track/123')
```

**VAPID Keys (Public/Private):**
```
Public:  BKeK9ZBclfl7jIGhP2t32uQbjgevLfXxqhXVedQ7KhlVbJMzLY-vl2r37INmrpqU75WxCleQDaOGYMQv3FPEsA0
Private: VAPID_PRIVATE_KEY_REDACTED
```

**Key Files:**
| File | Purpose |
|------|---------|
| `api/src/services/WebPushService.ts` | Sends push via web-push npm package |
| `api/src/services/PushSubscriptionService.ts` | Manages subscription CRUD |
| `api/src/models/PushSubscription.ts` | MongoDB schema |
| `web/src/hooks/usePushNotifications.ts` | Client-side permission & subscription |
| `web/worker/index.js` | Service Worker push handler |

---

### 3. POST CREATION FLOW

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            POST CREATION FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

  USER                           FRONTEND                          BACKEND
    │                               │                                 │
    │  1. Open Post Modal           │                                 │
    │──────────────────────────────▶│                                 │
    │                               │                                 │
    │  2. Type message, add media   │                                 │
    │──────────────────────────────▶│                                 │
    │     (optional: image/video)   │                                 │
    │                               │                                 │
    │                    ┌──────────┴──────────┐                      │
    │                    │  PostFormTimeline   │                      │
    │                    │  or PostModal       │                      │
    │                    │         │           │                      │
    │                    │         ▼           │                      │
    │                    │  If video uploaded: │                      │
    │                    │  • Capture frame    │                      │
    │                    │    at 1 second      │                      │
    │                    │  • Convert to JPEG  │                      │
    │                    │  • Upload thumbnail │                      │
    │                    └──────────┬──────────┘                      │
    │                               │                                 │
    │  3. Click "Post"              │                                 │
    │──────────────────────────────▶│                                 │
    │                               │                                 │
    │                    ┌──────────┴──────────┐                      │
    │                    │  Check for embeds:  │                      │
    │                    │  • YouTube URL?     │                      │
    │                    │  • Spotify URL?     │                      │
    │                    │  • SoundCloud URL?  │                      │
    │                    │  • Bandcamp URL?    │                      │
    │                    │         │           │                      │
    │                    │         ▼           │                      │
    │                    │  NormalizeEmbedLink │                      │
    │                    │  (converts to embed │                      │
    │                    │   format)           │                      │
    │                    └──────────┬──────────┘                      │
    │                               │                                 │
    │                               │  createPost mutation            │
    │                               │────────────────────────────────▶│
    │                               │  {                              │
    │                               │    message: "Check this out!"   │
    │                               │    uploadedMedia: "ipfs://..."  │
    │                               │    uploadedMediaThumbnail: ...  │
    │                               │    linkUrl: "youtube.com/..."   │
    │                               │  }                              │
    │                               │                                 │
    │                               │                    ┌────────────┴────────────┐
    │                               │                    │  PostService.create()   │
    │                               │                    │         │               │
    │                               │                    │         ▼               │
    │                               │                    │  1. Create Post doc     │
    │                               │                    │     in MongoDB          │
    │                               │                    │         │               │
    │                               │                    │         ▼               │
    │                               │                    │  2. FeedService         │
    │                               │                    │     .addPostToFeeds()   │
    │                               │                    │     (fan-out to         │
    │                               │                    │      followers)         │
    │                               │                    │         │               │
    │                               │                    │         ▼               │
    │                               │                    │  3. ActivityService     │
    │                               │                    │     .logPosted()        │
    │                               │                    │     (activity feed)     │
    │                               │                    └────────────┬────────────┘
    │                               │                                 │
    │                               │◀────────────────────────────────│
    │                               │     { post: { id, message, ... }}
    │                               │                                 │
    │◀──────────────────────────────│                                 │
    │     Post appears in feed!     │                                 │
```

**Embed Support Matrix:**
| Platform | Input URL | Output |
|----------|-----------|--------|
| YouTube | `youtube.com/watch?v=X` | ReactPlayer (all formats) |
| Spotify | `open.spotify.com/track/X` | `open.spotify.com/embed/track/X` |
| SoundCloud | Any URL | oEmbed API → iframe |
| Bandcamp | Any URL | GraphQL query → iframe |

---

### 4. MAKE POST PERMANENT FLOW (OGUN Payment)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       MAKE POST PERMANENT FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

  USER                           FRONTEND                          BLOCKCHAIN
    │                               │                                 │
    │  1. Click "Make Permanent"    │                                 │
    │     on existing post          │                                 │
    │──────────────────────────────▶│                                 │
    │                               │                                 │
    │                    ┌──────────┴──────────┐                      │
    │                    │  MakePostPermanent  │                      │
    │                    │  Modal opens        │                      │
    │                    │         │           │                      │
    │                    │         ▼           │                      │
    │                    │  Show wallet options│                      │
    │                    │  • OAuth Wallet     │                      │
    │                    │  • External Wallet  │                      │
    │                    │  • Connect New      │                      │
    │                    │         │           │                      │
    │                    │         ▼           │                      │
    │                    │  Display OGUN cost: │                      │
    │                    │  10 OGUN (example)  │                      │
    │                    │  + 0.05% fee        │                      │
    │                    └──────────┬──────────┘                      │
    │                               │                                 │
    │  2. Select wallet & confirm   │                                 │
    │──────────────────────────────▶│                                 │
    │                               │                                 │
    │                    ┌──────────┴──────────┐                      │
    │                    │  Calculate fee:     │                      │
    │                    │  fee = amount *     │                      │
    │                    │        0.0005       │                      │
    │                    │         │           │                      │
    │                    │         ▼           │                      │
    │                    │  Step 1: Send fee   │                      │
    │                    │  to Treasury        │─────────────────────▶│
    │                    │  (Gnosis Safe)      │     OGUN.transfer()  │
    │                    │                     │     to 0x519bed3f... │
    │                    │                     │                      │
    │                    │         │           │◀─────────────────────│
    │                    │         │           │     TX confirmed     │
    │                    │         ▼           │                      │
    │                    │  Step 2: Burn OGUN  │                      │
    │                    │  (send to dead      │─────────────────────▶│
    │                    │   address)          │     OGUN.transfer()  │
    │                    │                     │     to 0x00000...    │
    │                    │                     │     (burn address)   │
    │                    │                     │                      │
    │                    │         │           │◀─────────────────────│
    │                    │         │           │     TX confirmed     │
    │                    └──────────┬──────────┘                      │
    │                               │                                 │
    │                               │  makePostPermanent mutation     │
    │                               │────────────────────────────────▶│
    │                               │  {                              │  BACKEND
    │                               │    postId: "..."                │
    │                               │    txHash: "0x..."              │
    │                               │  }                              │
    │                               │                                 │
    │                               │                    ┌────────────┴────────────┐
    │                               │                    │  PostService            │
    │                               │                    │  .makePostPermanent()   │
    │                               │                    │         │               │
    │                               │                    │         ▼               │
    │                               │                    │  Update Post:           │
    │                               │                    │  • isPermanent: true    │
    │                               │                    │  • permanentTxHash      │
    │                               │                    │  • permanentAt: Date    │
    │                               │                    └────────────┬────────────┘
    │                               │                                 │
    │                               │◀────────────────────────────────│
    │◀──────────────────────────────│                                 │
    │                               │                                 │
    │     Post now shows            │                                 │
    │     PERMANENT badge! 🔒       │                                 │
    │                               │                                 │
    │     Benefits:                 │                                 │
    │     • Cannot be deleted       │                                 │
    │     • On-chain proof          │                                 │
    │     • Premium styling         │                                 │
    │     • Future: SPid rewards?   │                                 │
```

**Treasury Address:** `0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b` (Gnosis Safe)

**Key Files:**
| File | Purpose |
|------|---------|
| `web/src/components/modals/MakePostPermanentModal.tsx` | UI with wallet selector |
| `web/src/pages/dex/[...slug].tsx` | Integration point |
| `api/src/services/PostService.ts` | `makePostPermanent()` mutation |
| `api/src/models/Post.ts` | `isPermanent`, `permanentTxHash`, `permanentAt` |

---

### 5. UNIFIED NOTIFICATION ORCHESTRATION

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION SERVICE ORCHESTRATION                           │
└─────────────────────────────────────────────────────────────────────────────────┘

                              NotificationService
                                      │
                                      │ (checks user preferences)
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           │                          │                          │
           ▼                          ▼                          ▼
   ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
   │  In-App       │        │  Web Push     │        │  Nostr        │
   │  Notification │        │  (Browser)    │        │  (Bitchat)    │
   │               │        │               │        │               │
   │  Always on    │        │  If:          │        │  If:          │
   │  (MongoDB)    │        │  • subscribed │        │  • nostrPubkey│
   │               │        │  • pref ON    │        │  • notifyVia  │
   │               │        │               │        │    Nostr ON   │
   └───────┬───────┘        └───────┬───────┘        └───────┬───────┘
           │                        │                        │
           ▼                        ▼                        ▼
   ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
   │  Badge count  │        │  OS-level     │        │  Encrypted DM │
   │  in navbar    │        │  notification │        │  via relays   │
   │  Bell icon    │        │  (even when   │        │  (even when   │
   │               │        │   tab closed) │        │   offline!)   │
   └───────────────┘        └───────────────┘        └───────────────┘

   COST: FREE              COST: FREE              COST: FREE
```

**Notification Types & Channels:**
| Event | In-App | Web Push | Nostr |
|-------|--------|----------|-------|
| New Follower | ✅ | ✅ | ✅ |
| Like | ✅ | ✅ | ✅ |
| Comment | ✅ | ✅ | ✅ |
| DM | ✅ | ✅ | ✅ |
| Tip Received | ✅ | ✅ | ✅ |
| NFT Sold | ✅ | ✅ | ✅ |
| Stream Milestone | ✅ | ✅ | ✅ |
| Repost | ✅ | ✅ | ❌ |
| Mention | ✅ | ✅ | ❌ |

---

### Previous: User Engagement Features - GAME CHANGER DAY!

**Three major features implemented to compete with IG/X/FB/Spotify/SoundCloud/Bandcamp:**

#### Phase 1: Online Indicators (COMPLETE)
- Added `lastSeenAt` field to Profile model
- `heartbeat` mutation updates lastSeenAt every 60 seconds
- `isOnline` field resolver returns true if lastSeenAt < 5 min ago
- Green dot indicator on Avatar component
- `useHeartbeat` hook pauses when tab hidden (visibility API)

**Files:**
- `api/src/models/Profile.ts` - lastSeenAt field
- `api/src/services/ProfileService.ts` - updateLastSeen(), isOnline()
- `api/src/resolvers/ProfileResolver.ts` - isOnline, heartbeat
- `web/src/hooks/useHeartbeat.ts` - 60s heartbeat hook
- `web/src/components/Avatar.tsx` - green dot indicator

#### Phase 2: Activity Feed (COMPLETE)
- Track what users you follow are doing: Listened, Liked, Commented, Followed, Minted, Posted
- Debounced "listened" activity (1 per track per hour)
- Integrated with FollowService, ReactionService, CommentService, PostService, SCidService

**Files:**
- `api/src/models/Activity.ts` - Activity model with metadata types
- `api/src/types/ActivityType.ts` - Enum: Listened, Liked, Commented, Followed, Minted, Posted
- `api/src/services/ActivityService.ts` - logActivity(), getActivityFeed(), logListened(), etc.
- `api/src/resolvers/ActivityResolver.ts` - activityFeed query

#### Phase 3: Web Push Notifications (COMPLETE)
- FREE browser notifications when tab is closed (no SMS costs!)
- VAPID keys generated and configured
- Push notifications for: Follow, Like, Comment, DM, Tip, NFT Sale, Stream Milestone

**Backend:**
- `api/src/models/PushSubscription.ts` - endpoint + keys per user
- `api/src/services/PushSubscriptionService.ts` - subscribe/unsubscribe
- `api/src/services/WebPushService.ts` - sends via web-push package
- `api/src/resolvers/PushSubscriptionResolver.ts` - GraphQL mutations
- `api/src/services/NotificationService.ts` - integrated push sending

**Frontend:**
- `web/src/hooks/usePushNotifications.ts` - permission + subscription management
- `web/src/components/dex/PushPermissionBanner.tsx` - banner/card/inline variants
- `web/worker/index.js` - custom SW for push + notification click handlers
- `web/next.config.js` - next-pwa with customWorkerDir

**VAPID Keys (in .env.sample):**
- Public: `BKeK9ZBclfl7jIGhP2t32uQbjgevLfXxqhXVedQ7KhlVbJMzLY-vl2r37INmrpqU75WxCleQDaOGYMQv3FPEsA0`
- Private: `VAPID_PRIVATE_KEY_REDACTED`

**New Notification Types Added:**
- Repost, Mention, DirectMessage, Tip, MarketplaceOffer, TrackComment, NewTrack, PlaylistAdded, StreamMilestone

### TypeScript Fixes (GitHub Actions was failing)
- `PageInfo.totalCount` - moved inside pageInfo object (was at root level)
- Document type returns - added `.toObject()` in ActivityService/PushSubscriptionService
- ObjectId to string - added `.toString()` in PostService.logPosted()

### 💡 Future Idea: Permanent Post Rewards (SPid?)
User idea: Posts that are made permanent (via OGUN payment) should earn streaming rewards based on "splays" (social plays/views). Concept:
- Generate SPid (Social Post ID) similar to SCid for tracks
- Track post views/interactions
- Reward creators for viral permanent content
- Creates incentive for quality permanent posts

---

## MORNING SESSION (Jan 29, 2026) - MagicLink Pivot & Blockchain Audit

**Environment:** War Room - Fleet Commander (Pro MacBook) + iPhone 14 Pro Max (mobile testing)

### 🚨 MagicLink Support Response
Received news from MagicLink support:
- Rate limits hitting **thousands** during NFT minting
- MagicLink **DEPRECATED their mint NFTs API** - no longer available
- Needed to pivot for existing users with Magic OAuth wallets on Polygon

### 🔍 Discovery: We're Already Safe!
**GOOD NEWS:** Audited codebase and found we were ALREADY using **DIRECT CONTRACT CALLS**:
```typescript
// NOT using Magic's NFT API (deprecated)
// USING direct Web3.js contract calls:
nftContractEditions.methods.createEdition(quantity, to, royalty)
nftContractEditions.methods.safeMintToEditionQuantity(to, uri, edition, qty)
```

**The Real Problem:** Magic's RPC provider (shared infrastructure) gets rate-limited, NOT their API.

### 🔧 Solution: Multi-Wallet Minting Priority
Implemented external wallet priority to bypass Magic RPC rate limits:

**CreateModal.tsx Changes:**
1. Added `useUnifiedWallet`, `useMagicContext`, `useMetaMask` hooks
2. Wallet selector when both OAuth + external wallet available
3. "Connect Wallet" button opens Web3Modal (300+ wallets)
4. Rate-limit-aware retry delays:
   - External wallets: 2s initial delay (fast)
   - Magic wallets: 15s initial delay (rate limit protection)

**UI Flow:**
```
┌─────────────────────────────────────────────┐
│  Connect External Wallet for Best Performance│
│                                              │
│  ┌─────────────────────────────────────┐    │
│  │  🔗 Connect Wallet                  │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  MetaMask, Coinbase, Rainbow, Trust,        │
│  Phantom & 300+ wallets                     │
└─────────────────────────────────────────────┘
```

### 📱 Mobile Testing Findings
- **MetaMask Browser:** Wallet connections LIGHTNING FAST, but OAuth popups blocked (expected)
- **MetaMask Button on Mobile:** Opens extension download page (wrong behavior)
- **Fix:** Single Web3Modal button that works on all platforms

### 📋 Complete Blockchain Audit Created
Created `BLOCKCHAIN_FLOW.md` with:
- All 11 live contract addresses
- 12 operation flow diagrams
- Fee collection verification (0.05% on all ops)
- Wallet support matrix
- File-to-contract usage map

### ✅ Commits This Session
1. `feat: Multi-wallet NFT minting to bypass Magic RPC rate limits`
2. `docs: Add comprehensive blockchain flow audit`
3. `docs: Add complete blockchain audit to CLAUDE.md`
4. `feat: Add WalletConnect option to mint page`
5. `fix: Mobile wallet connection on mint page`

### 🎯 Key Insight
**Magic SDK Role After Pivot:**
- ✅ OAuth authentication (Google, Discord, Twitch, Email) - STILL WORKS
- ✅ Wallet creation (generates Polygon address) - STILL WORKS
- ✅ Transaction signing - STILL WORKS
- ❌ NFT minting API - DEPRECATED (but we never used it!)
- ⚠️ RPC provider - RATE LIMITED (bypassed with external wallets)

---

## AFTERNOON SESSION (Jan 29, 2026) - Bug Fixes & Listener Rewards

**Environment:** War Room → Remote (iPhone via ttyd tunnel)

### 🐛 Critical Fixes (Fleet Commander ~1-2pm)

#### Login Page Crash - FIXED
**Symptom:** Client-side error on login page after engagement features push
**Root Cause:** `useHeartbeat` hook was destructuring `useMe()` incorrectly
**Fix:** Fixed destructuring in `useHeartbeat.ts`
**Commit:** `e52e575b8`

#### DM Messages Not Rendering - FIXED
**Symptom:** DM messages blank/not showing
**Root Cause:** Wrong field name being accessed
**Fix:** Corrected field name in DM component
**Commit:** `5fe2c67e8`

#### OAuth Wallet Balance Not Fetching - FIXED
**Symptom:** Wallet balances showing 0 for OAuth users
**Root Cause:** Balance fetch not triggering for OAuth wallet types
**Fix:** Updated balance fetching logic
**Commit:** `5f7984aa3`

#### Phone Number Formatting - ADDED
**Feature:** Phone numbers now auto-format with dashes
**Commit:** `85385ea5f`

### 🎧 Piggy Bank Listener Rewards - NOW LIVE!
**Was:** Placeholder text "Coming Soon! Earn 30%..."
**Now:** Real-time data synced with backend

**Backend:**
- Added `myListenerRewards` GraphQL query to ProfileResolver
- Added `ListenerRewardsResult` type
- Profile model tracks: `dailyListenerOgunEarned`, `totalListenerOgunEarned`, `dailyTracksStreamed`, `totalTracksStreamed`

**Frontend:**
- Listener tab shows: Total OGUN earned, Tracks streamed today, Daily earnings
- Auto-updates when streaming NFT tracks

**Commit:** `bb101fa6b`

### 💳 Make Post Permanent - Wallet UI Enhanced
**Was:** No wallet connection UI, just error toast
**Now:** Full wallet selector with:
- Multiple wallet support (Magic, MetaMask, WalletConnect)
- Balance display per wallet
- Auto-select wallet with sufficient funds
- Support for wallet-only users (shows registered wallet)
- Option to connect additional wallets

**Commits:** `d35af2e88`, `512c5a2f7`, `a8e0bfdea`

### 📱 Nostr NIP-17 Notifications via Bitchat
**Feature:** Push notifications can now route through Bitchat/Nostr
**Commit:** `9232890dd`

### ✅ Afternoon Commits Summary
```
14:00 - feat: Add Nostr NIP-17 notifications via Bitchat
13:39 - fix: DM messages not rendering - wrong field name
13:30 - fix: OAuth wallet balance fetching not triggering
13:27 - feat: Fix notifications, wallet connections, piggybank modal
13:10 - feat: Add phone number formatting with dashes
13:08 - fix: useMe destructuring in useHeartbeat (LOGIN PAGE CRASH)
13:01 - feat: Support wallet-only users in MakePostPermanent modal
12:58 - feat: Add wallet selector to MakePostPermanent modal
12:50 - feat: Sync Piggy Bank listener rewards with real data
12:42 - fix: Add wallet connection UI to Make Post Permanent modal
```

---

## PREVIOUS SESSION (Jan 28, 2026)

**Session Notes:**
- **SITE DOWN → RECOVERED** — TDZ crash from Jan 27 changes. Nuclear rollback + production bisect identified `dex/[...slug].tsx` as the poison pill
- Restored 8 of 9 wallet files safely via incremental bisect deploys
- `dex/[...slug].tsx` reverted to `69bd51c20` (pre-Jan-27) — the 559 added lines cause TDZ when bundled
- Added dark overlay backgrounds behind bio text and nav tabs for readability (increased to 80% opacity)
- Fixed track detail page play counts to use SCid `streamCount` instead of stale `playbackCount`
- **RESOLVED:** WalletConnect project ID set to `53a9f7ff48d78a81624b5333d52b9123` (fallback in Web3ModalContext.tsx + Vercel env var)

### 💰 Platform Fee Collection (Jan 28, 2026) - INVESTOR READY
**Added 0.05% fee to ALL blockchain transactions:**

| Feature | Fee | File |
|---------|-----|------|
| POL Transfer | 0.05% of amount | dex/[...slug].tsx |
| OGUN Transfer | 0.05% of amount | dex/[...slug].tsx |
| NFT Transfer | 0.05% of gas cost | dex/[...slug].tsx |
| NFT Sweep (batch) | 0.05% of total gas | dex/[...slug].tsx |
| OGUN Stake | 0.05% of amount | StakingPanel.tsx |
| OGUN Unstake | 0.05% of amount | StakingPanel.tsx |
| POL↔OGUN Swap | 0.05% of swap amount | StakingPanel.tsx |
| Marketplace Buy | 0.05% of price | useBlockchainV2.ts |
| NFT Mint | 0.05% of gas cost | CreateModal.tsx |
| **Tips (NEW)** | 0.05% of tip amount | dex/[...slug].tsx |

**All fees sent to Gnosis Safe Treasury:** `0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b`

### 🎁 Profile Tip Jar (Jan 28, 2026)
- Gift icon on other users' profiles (next to wallet address)
- Mini accordion dropdown (matches WIN-WIN style)
- **Wallet selector tabs:** OAuth Wallet | External Wallet
- Shows balance for selected wallet
- Quick tip presets: 1, 5, 10, 25 OGUN
- 0.05% fee collected before tip sent

### 🚨 MagicLink NFT API Deprecation (Jan 28, 2026)
**CRITICAL:** MagicLink deprecated their NFT minting API. Rate limits hitting thousands during minting.

**GOOD NEWS:** We were already using DIRECT CONTRACT CALLS for minting, NOT Magic's NFT API!
- `createEdition()` → `nftContractEditions.methods.createEdition()`
- `mintNftTokensToEdition()` → `nftContractEditions.methods.safeMintToEditionQuantity()`

**The Problem:** Magic's RPC provider (not their API) gets rate-limited during high-traffic minting.

**The Solution:** Multi-wallet minting with external wallet priority.

### 🔧 Multi-Wallet NFT Minting (Jan 28, 2026)
**Feature:** CreateModal now supports wallet selection for minting to bypass Magic RPC rate limits.

**Priority Order:**
1. **External wallets (MetaMask/Web3Modal)** → No rate limits, faster minting
2. **Magic OAuth wallets** → Longer delays, rate limit protection

**UI Changes (CreateModal.tsx):**
- Wallet selector shows when both wallet types available
- Recommendation banner when only Magic wallet connected
- Status shows wallet type during minting: "Minting NFT (External Wallet)"

**Rate Limit Strategy:**
- External wallets: 2s initial retry delay
- Magic wallets: 15s initial retry delay (exponential backoff)

**Files Modified:**
- `web/src/components/modals/CreateModal.tsx` - Multi-wallet minting support
- Uses `useUnifiedWallet`, `useMagicContext`, `useMetaMask`

**Key Insight:** Magic SDK still works for OAuth authentication. We just prioritize external wallets for blockchain transactions to avoid their shared RPC infrastructure rate limits.

---

## 🔗 COMPLETE BLOCKCHAIN FLOW AUDIT (Jan 28, 2026)

### Contract Architecture on Polygon Mainnet

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    POLYGON MAINNET (Chain ID: 137)                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   TOKENS & STAKING                    NFT & MARKETPLACE                  │
│   ─────────────────                   ─────────────────                  │
│   OGUN Token        →  Staking        NFT V2           →  Marketplace   │
│   0x45f1af894...       Rewards        0xf01D323bd...      0x7EfC9A7F3...│
│                        0xe6c3F86a2...                                    │
│                                                                          │
│   DEX & REVENUE                       AUCTIONS                           │
│   ─────────────                       ────────                           │
│   QuickSwap           Stream Rewards  Auction V2                         │
│   0xa5E0829Ca...      0xcf9416c49...  0x35f662bD7...                    │
│                                                                          │
│   TREASURY (Gnosis Safe): 0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Complete Contract Address Reference

| Contract | Address | ABI File |
|----------|---------|----------|
| **OGUN Token** | `0x45f1af89486aeec2da0b06340cd9cd3bd741a15c` | SoundchainOGUN20.json |
| **Staking Rewards** | `0xe6c3F86a250b5AAd762405ce5F579F81Fddc426a` | StakingRewards.json |
| **LP Token** | `0xfF0E141891D0E66b0D094215B44eF433F43066e5` | LPToken.json |
| **LP Staking** | `0x5748E147b5479A97904eFCC466dF4f7C6dbB83F9` | LiquidityPoolRewards.json |
| **NFT V2 (Editions)** | `0xf01D323bdAc88ee39543CbBc568C6Fc76258FfE0` | Soundchain721Editions.json |
| **Marketplace Editions (V2)** | `0x7EfC9A7F3381A4B28a2113EA99E2d80832589239` | SoundchainMarketplaceEditions.json |
| **Marketplace V1** | `0x27302E3ff5287a5973d8D5328C4cEFCd752778f2` | SoundchainMarketplace.json |
| **Auction V1** | `0x903ea5B8f1BE6EdC74e66dd89565A1d537824A2F` | SoundchainAuction.json |
| **Auction V2** | `0x35f662bD7d418fd7B19518A22aF3D54ea99e7bf0` | SoundchainAuction.json (v2) |
| **QuickSwap Router** | `0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff` | UniswapV2Router.json |
| **Stream Rewards** | `0xcf9416c49D525f7a50299c71f33606A158F28546` | Backend ethers.js |
| **Treasury (Gnosis)** | `0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b` | N/A (native transfer) |

### All 12 Operations → Direct Contract Calls

| # | Operation | Contract | Method | Fee |
|---|-----------|----------|--------|-----|
| 1 | **POL Send** | Native | `web3.eth.sendTransaction` | 0.05% |
| 2 | **OGUN Send** | OGUN Token | `transfer()` | 0.05% |
| 3 | **NFT Transfer** | Soundchain721 | `transferFrom()` | 0.05% gas |
| 4 | **NFT Mint** | Soundchain721Editions | `createEdition()` + `safeMintToEditionQuantity()` | 0.05% gas |
| 5 | **NFT Sweep** | Soundchain721 | `transferFrom()` × N | 0.05% total gas |
| 6 | **Marketplace List** | MarketplaceEditions | `listItem()` | - |
| 7 | **Marketplace Buy** | MarketplaceEditions | `buyItem()` | 0.05% |
| 8 | **Auction Create** | AuctionV2 | `createAuction()` | - |
| 9 | **Auction Bid** | AuctionV2 | `placeBid()` | - |
| 10 | **OGUN Stake** | StakingRewards | `approve()` + `stake()` | 0.05% |
| 11 | **DEX Swap** | QuickSwap | `swapExactETHForTokens()` / `swapExactTokensForETH()` | 0.05% |
| 12 | **Profile Tips** | OGUN Token | `transfer()` | 0.05% |

### Operation Flow Diagrams

#### 1. POL Transfer
```
User Wallet ──► Treasury (0.05% fee) ──► Recipient Wallet
     │              │
     └──────────────┴──► web3.eth.sendTransaction()
```

#### 2. OGUN Transfer
```
User Wallet ──► OGUN Contract ──► Treasury (0.05% fee)
     │              │
     │              └──► Recipient Wallet
     └──► contract.methods.transfer()
```

#### 3. NFT Transfer
```
Owner ──► NFT Contract ──► New Owner
  │           │
  │           └──► contract.methods.transferFrom()
  │
  └──► Treasury (0.05% of gas cost)
```

#### 4. NFT Mint (Edition)
```
Artist ──► NFT Editions Contract ──► Edition Created
  │              │
  │              ├──► createEdition(quantity, to, royalty)
  │              └──► safeMintToEditionQuantity(to, uri, edition, qty)
  │
  └──► Treasury (0.05% of gas cost)
```

#### 5. Marketplace Buy
```
Buyer ──► Treasury (0.05% fee) ──► Marketplace Contract
  │              │                       │
  │              │                       └──► NFT to Buyer
  │              │                       └──► Payment to Seller
  │              │
  └──────────────┴──► marketplace.methods.buyItem()
```

#### 6. OGUN Staking
```
Staker ──► OGUN Contract ──► Treasury (0.05% fee)
  │              │
  │              └──► approve() + stake()
  │                        │
  │                        └──► Staking Rewards Contract
  │                                    │
  └────────────────────────────────────┴──► Earn Rewards Over Time
```

#### 7. DEX Swap (POL ↔ OGUN)
```
User ──► QuickSwap Router ──► Swap Output
  │           │
  │           ├──► swapExactETHForTokens() (POL→OGUN)
  │           └──► swapExactTokensForETH() (OGUN→POL)
  │
  └──► Treasury (0.05% of input)
```

#### 8. Profile Tips
```
Tipper ──► OGUN Contract ──► Treasury (0.05% fee)
  │              │
  │              └──► Creator Wallet (remaining tip)
  │
  └──► contract.methods.transfer()
```

### Files by Contract Usage

| File | Contracts Used |
|------|----------------|
| `useBlockchainV2.ts` | NFT, Marketplace, Auction, MerkleClaim |
| `StakingPanel.tsx` | OGUN, StakingRewards, QuickSwap |
| `dex/[...slug].tsx` | OGUN, NFT (transfers), StakingRewards |
| `stake.tsx` | OGUN, StakingRewards, LPToken, LPStaking |
| `lp-stake.tsx` | OGUN, LPToken, LPStaking |
| `CreateModal.tsx` | NFT Editions (via useBlockchainV2) |
| `useMetaMask.ts` | OGUN (balance only) |
| `UnifiedWalletContext.tsx` | OGUN (balance only) |

### Wallet Support Matrix

| Wallet Type | Source | Direct Contract Calls |
|-------------|--------|----------------------|
| Magic OAuth | `useMagicContext` | ✅ Yes |
| MetaMask | `useMetaMask` | ✅ Yes |
| WalletConnect | `useWalletConnect` | ✅ Yes |
| Web3Modal | `useUnifiedWallet` | ✅ Yes |
| Coinbase | Web3Modal | ✅ Yes |

### Verification Summary

```
✅ NO MAGIC SDK BLOCKCHAIN DEPENDENCIES

All operations use:
├── web3.eth.Contract(ABI, address)
├── contract.methods.xxx().send()
└── web3.eth.sendTransaction()

Magic SDK ONLY used for:
├── OAuth authentication (Google, Discord, Twitch, Email)
├── Wallet creation (generates Polygon address)
└── Transaction signing (via magic.rpcProvider)

The MagicLink pivot is COMPLETE:
├── OAuth login → Still works
├── NFT minting → Direct contract calls
├── All transfers → Direct contract calls
└── Rate limits → Bypassed with external wallet priority
```

---

**WARNING:** Don't use Alchemy API key from ZetaChain config for Polygon - it's network-specific!

### Previous Session (Jan 27, 2026)
- Fixed stream count dedup bug (loops now count properly)
- Stream logging moved to 30-second mark (not song end)
- Added streamCountCalibratedAt audit field
- Fixed external wallet balance fetching (MetaMask, WalletConnect, Coinbase, Trust)
- Attempted Reown AppKit migration → reverted (project ID needs migration at cloud.reown.com)
- Created RoyaltySplitter contract for post-mint collaborator royalty splits
- Added 0.05% platform fee on minting (0.01 POL per NFT)

### Platform Fee Structure (Jan 26, 2026)

**SoundChain charges 0.05% on ALL costs:**

| Action | Fee Calculation | Example |
|--------|-----------------|---------|
| NFT Minting | 0.05% × Gas Cost | Gas: 0.1 POL → Fee: 0.00005 POL |
| Marketplace Sales | 0.05% × Sale Price + 0.05% × Gas Cost | Sale: 100 POL + Gas: 0.05 POL → Fee: 0.05 + 0.000025 POL |
| SCid-only Upload | FREE | $0 (no wallet needed) |

**Fee Model Summary:**
- **Minting:** 0.05% of gas cost only (no sale price yet)
- **Selling:** 0.05% of sale price + 0.05% of gas cost
- **SCid:** Free (users save certificate to device, still earn OGUN rewards)

**Why this model?**
- Consistent 0.05% across ALL costs (VC-friendly revenue model)
- Fee scales with transaction value AND complexity
- Transparent calculation shown in UI

**Competitive Comparison (Marketplace Fees):**

| Platform | Fee | vs SoundChain |
|----------|-----|---------------|
| **SoundChain** | **0.10%** (0.05% sale + 0.05% gas) | — |
| OpenSea | 2.5% | 25x higher |
| Rarible | 2.5% | 25x higher |
| Foundation | 5% | 50x higher |
| SuperRare | 3% + 15% (first sale) | 30-180x higher |
| LooksRare | 2% | 20x higher |
| Blur | 0.5% | 5x higher |
| Spotify/Apple | 15-30% | 150-300x higher |

**SoundChain is the lowest-fee music NFT marketplace in Web3.**

### Upload Tiers & OGUN Rewards

| Tier | Cost | What You Get | OGUN Rewards |
|------|------|--------------|--------------|
| **SCid-only** | FREE | SCid certificate (save to device) | 1x streaming rewards |
| **NFT Mint** | 0.01 POL/NFT + gas | NFT + SCid certificate | **2x streaming rewards** |

**Win-Win Model:** Both tiers earn OGUN rewards from streams. NFT mints cost more but earn double rewards.

### Implementation Details

**Files Modified:**
- `web/src/config.ts` - Added `mintFeePerNft`, `treasuryAddress`, `soundchainFee`
- `web/src/components/forms/track/TrackMetadataForm.tsx` - Shows fee breakdown + reward multiplier
- `web/src/components/modals/CreateModal.tsx` - Collects fee before minting, SCid tab shows "FREE"
- `web/.env.local` - Environment variables

**Fee Collection Flow (NFT Mint):**
1. User sees total cost (Gas + Platform Fee) in mint form
2. User sees "2x OGUN vs SCid-only" indicator
3. Before minting, platform fee sent to treasury address
4. If fee rejected, minting stops (user must approve)
5. Fee supports OGUN rewards distribution

**Environment Variables:**
```env
NEXT_PUBLIC_SOUNDCHAIN_FEE="0.0005"        # 0.05% platform fee rate
NEXT_PUBLIC_SOUNDCHAIN_TREASURY="0x..."    # Treasury/Gnosis Safe address
```

**Fee Calculation (Minting):**
```typescript
// In CreateModal.tsx
const estimatedGas = 65000 + (editionQuantity * 55000)  // createEdition + mint per NFT
const gasCostPol = estimatedGas * gasPrice  // in POL
const platformFee = gasCostPol * 0.0005     // 0.05% of gas cost
```

**Fee Display (TrackMetadataForm.tsx):**
```
Est. Gas Fee (2 NFTs):     0.1234 POL
Platform Fee (0.05% of gas): 0.000062 POL
Total Est. Cost:           0.1235 POL
```

**Commits:**
- `0e9be0008` - Platform fee implementation
- `ed2619078` - SCid-free vs NFT-paid reward tier UI

---

## CRITICAL: DO NOT TOUCH THESE FILES

### Protected Files (CODEOWNERS)
These files have caused critical bugs when modified. Require extra caution:

| File | Reason | Last Incident |
|------|--------|---------------|
| `web/src/pages/login.tsx` | OAuth flow fragile | Jan 5, 2026 - broke mobile login |
| `web/src/hooks/useMagicContext.tsx` | Session management | Broke login flow multiple times |
| `web/src/hooks/useMe.ts` | Global user hook | Modifying breaks OAuth |
| `api/src/services/SCidService.ts` | Streaming rewards | Batch size bug Jan 7 |
| `web/src/components/dex/StakingPanel.tsx` | Complex state | 836 lines, needs refactor |

### DO NOT Modify `useMe` Hook
**Learned the hard way:** Changes to the global `useMe` hook break OAuth login flow. The hook is tightly coupled with Magic SDK session restoration.

### NEVER Test on Localhost
**CRITICAL:** We ONLY work in production and test in production. ALWAYS.
- NEVER run curl/fetch against `localhost:3000` to test changes
- NEVER use `yarn dev` for testing - push to prod and test via Cloudflare tunnel
- All testing happens on the live production deployment
- The user tests on mobile via Cloudflare tunnel to production
- If you need to verify a fix works, push to production and wait for Vercel deploy

### NEVER Use Twilio/SMS Services
**CRITICAL:** SoundChain is DECENTRALIZED. We break down centralized systems.
- NEVER suggest Twilio, AWS SNS, or any paid SMS service
- NEVER implement traditional SMS notifications
- Phone numbers in settings are for Nostr-based notifications ONLY
- All notifications go through: **Web Push (FREE)** or **Nostr/Bitchat (FREE)**
- We don't pay per-message fees to centralized telecom gatekeepers

**Our Notification Stack:**
| Method | Protocol | Cost |
|--------|----------|------|
| Web Push | VAPID/Service Worker | FREE |
| Nostr DMs | NIP-17 Encrypted | FREE |
| Bitchat | Bluetooth Mesh + Nostr | FREE |

---

## BUGS FOUND & FIXED (Lessons Learned)

### 1. OAuth Login Breaks (Jan 3-5, 2026)
**Symptom:** Google OAuth popup hangs, users can't log in
**Root Cause:** Using `loginWithRedirect` instead of `loginWithPopup`
**Fix:** Always use `loginWithPopup` for Magic OAuth2
**Don't Do This:**
- Don't use `await` before OAuth redirect calls
- Don't modify useMe hook
- Don't change Magic SDK versions without testing login flow

**Working Package Versions:**
```json
"@magic-ext/oauth2": "14.0.0",
"magic-sdk": "28.4.0",
"@magic-sdk/commons": "24.0.0"
```

### 2. Mongoose Symbol Serialization Error (Dec 22-23, 2025)
**Symptom:** `Cannot read properties of undefined (reading 'Symbol(mongoose#Document#scope)')`
**Root Cause:** TypeGraphQL field resolvers can't access nullable fields on mongoose documents
**Fix:**
- Add `.toObject()` conversion in resolvers
- Make nullable fields non-nullable with defaults
- Refetch document after save in services
**Files Fixed:** TrackResolver.ts, TrackEditionResolver.ts, PlaylistService.ts

### 3. Batch Size Error for 100+ Tracks (Jan 7, 2026)
**Symptom:** "batch must be between 1-100" when claiming streaming rewards
**Root Cause:** Contract has 100-item batch limit, code tried to process all tracks at once
**Fix:** Chunk claims into batches of 100
**Don't Do This:** Mark rewards as "claimed" BEFORE contract call succeeds
**File:** `api/src/services/SCidService.ts`

### 4. OGUN Balance Shows "0" (Jan 6, 2026)
**Symptom:** OGUN balance shows 0 even when user has tokens
**Root Cause:** Trying to fetch OGUN on non-Polygon chains (contract doesn't exist)
**Fix:**
- Check chainId === 137 before fetching OGUN
- Add fallbacks from context (magicOgunBalance, metamaskOgunBalance)
**Files:** StakingPanel.tsx, UnifiedWalletContext.tsx

### 5. Share Link 500 Error (Jan 10, 2026)
**Symptom:** Shared post links crash with serverless function error
**Root Cause:** SSR using `cacheFor()` + `getDataFromTree()` crashed when components accessed browser APIs
**Fix:** Remove `cacheFor()`, return props directly
**Don't Do This:** Use browser APIs (window, localStorage) in SSR functions

### 6. Embed Links Not Rendering (Jan 9, 2026)
**Symptom:** Embeds silently fail after posting
**Root Cause:** `getNormalizedLink()` can return `undefined`, passed without null check
**Fix:** Always check: `if (link) { setPostLink(link) }`
**File:** PostModal.tsx

### 7. Mobile Wallet Connection Fails (Jan 18, 2026)
**Symptom:** Mobile browsers can't connect MetaMask/Coinbase wallets
**Root Cause:** Using scheme URLs (`metamask://`) instead of universal links
**Fix:** Use universal links: `https://metamask.app.link/wc?uri=`
**Don't Do This:** Use `metamask://` - browsers block scheme URLs
**File:** WalletConnectButton.tsx

### 8. Session Lost on Page Refresh (Jan 6, 2026)
**Symptom:** Users logged out every page refresh
**Root Cause:** JWT cookie expiry too short, session not restored on mount
**Fix:**
- Extended cookie expiry to 30 days
- Added session restoration in MagicProvider on ALL pages
- Store didToken in localStorage as backup
**Files:** apollo/index.tsx, useMagicContext.tsx

### 9. defaultWallet is ENUM not Address (Jan 3, 2026)
**Symptom:** Wallet selection not persisting
**Root Cause:** Code treated `user.defaultWallet` as address string when it's actually an enum
**Fix:** Check enum value, not address comparison
**Commit:** f23f5f327

### 10. Site Crash - FollowerCount (Dec 22, 2025)
**Symptom:** Site crashes with "Cannot read properties of undefined"
**Root Cause:** Referenced non-existent `SortUserField.FollowerCount` enum value
**Fix:** Remove non-existent enum references, use correct field names

### 11. Mobile Music Player Crash (Jan 19, 2026)
**Symptom:** Browser tab crashes ("Can't open this page") ~30 seconds into playback on mobile
**Root Cause:** Memory exhaustion from:
- Aggressive IPFS preloading (1MB range requests + Audio elements + Image preloading)
- Loading 200 tracks for shuffle on mobile
- 250 waveform bars rendered in DOM
- Uncapped background resume intervals
**Fix:**
- Mobile preload limit: max 5 tracks, 256KB range (vs 1MB desktop), no artwork preload
- Mobile shuffle: 50 tracks (vs 200 desktop)
- Mobile waveform: 80 bars (vs 250 desktop)
- Background resume: capped at 30 attempts (30 seconds)
- Added proper cleanup for preload timeouts on unmount
**Don't Do This:** Never use unbounded setInterval without cleanup or cap
**Files:** useAudioPlayer.tsx, WaveformWithComments.tsx, AudioEngine.tsx

### 12. Waveform Comments Not Triggering (Jan 19, 2026)
**Symptom:** Timestamped comments don't popup consistently during playback
**Root Cause:**
- currentTime updated as floored integer (once per second)
- Trigger window too narrow (0.5s) for integer updates
- Comments at fractional timestamps (e.g., 15.7s) missed
**Fix:**
- Widened trigger window to 1.5s
- Track last processed time to detect seeking
- Reset triggered comments when user seeks (time jump > 3s)
**File:** WaveformWithComments.tsx

### 13. Profile Edit Button Shows Follow (Jan 19, 2026)
**Symptom:** Own profile shows "Follow" instead of "Edit Profile"
**Root Cause:** `isViewingOwnProfile` check failed because:
1. `myProfileId` was undefined or not matching
2. Wallet comparison only checked `magicWalletAddress` but Google OAuth users have `googleWalletAddress`
**Fix:** Multiple fallback comparisons + check ALL OAuth wallet addresses:
1. Primary: Compare profile IDs
2. Fallback 1: Compare wallet addresses from ALL OAuth methods (case-insensitive)
3. Fallback 2: Compare userHandles
**Debug:** Added console.log to track comparison values - check browser console
**File:** pages/dex/[...slug].tsx

### 14. Wallet Balances Show 0 (Jan 19, 2026)
**Symptom:** OGUN and POL balances show 0 even when logged in with tokens
**Root Cause:**
1. Balance fetching required both `web3` (Magic) and `account` to be set
2. Code only checked `magicWalletAddress` but Google OAuth users have wallet in `googleWalletAddress`
**Fix:**
- Set account from user profile even without web3 session
- Use public Polygon RPC (`https://polygon-rpc.com`) as fallback for balance fetching
- **CRITICAL:** Check ALL OAuth wallet addresses, not just `magicWalletAddress`:
  - `magicWalletAddress` (email login)
  - `googleWalletAddress` (Google OAuth)
  - `discordWalletAddress` (Discord OAuth)
  - `twitchWalletAddress` (Twitch OAuth)
  - `emailWalletAddress`
**Files:**
- useMagicContext.tsx (PROTECTED - required careful changes)
- StakingPanel.tsx - Added public RPC fallback for balance fetching
**Key Code:**
```typescript
// In useMagicContext.tsx
const getUserWalletAddress = () => {
  return me?.magicWalletAddress ||
         me?.googleWalletAddress ||
         me?.discordWalletAddress ||
         me?.twitchWalletAddress ||
         me?.emailWalletAddress || null
}

// In StakingPanel.tsx
const web3Instance = web3 || new Web3('https://polygon-rpc.com')
```

### 15. Desktop Login OAuth Popup Blocked (Jan 20, 2026)
**Symptom:** Desktop browsers show "Logging in..." but Google OAuth popup never opens. Mobile works fine.
**Root Cause:** Cross-Origin headers in `next.config.js` were blocking Magic SDK's OAuth popup:
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- `Cross-Origin-Embedder-Policy: credentialless`

Desktop browsers enforce these policies more strictly than mobile browsers.
**Fix:** Remove both COOP and COEP headers from `next.config.js`
**Don't Do This:**
- Don't add Cross-Origin-Opener-Policy headers without testing OAuth
- Don't add Cross-Origin-Embedder-Policy headers - they break Magic SDK popups
**File:** `web/next.config.js`
**CRITICAL:** Never reset to a commit before `a183f7966` - that's when these headers were removed.
Resetting to earlier commits (like c186dd436) will break desktop login!

### 16. MetaMask Contract Calls Crash Login Page (Jan 21, 2026)
**Symptom:** Login page shows unhandled promise rejection errors, page becomes unresponsive
**Root Cause:** `useMetaMask.ts` had no error handling on contract calls:
- `getOGUNBalance()` fails when on wrong chain or contract unavailable
- Promise chains for balance, chainId fetching were unhandled
**Fix:** Add try-catch and .catch() to all MetaMask promise chains in `useMetaMask.ts`
**Don't Do This:** Leave blockchain contract calls without error handling
**File:** `web/src/hooks/useMetaMask.ts`

### 17. DM Causes Blank White Page (Jan 21, 2026)
**Symptom:** Sending a DM in the messages view causes page to refresh to blank white screen
**Root Cause:** Messages view used `chat.id` (the chat's ID) instead of `chat.profile.id` (recipient's profile ID)
- `sendMessage` mutation expects `toId` to be a profile ID
- `loadChatHistory` also expects `profileId`
- Using chat ID caused API error which crashed the page
**Fix:**
- Change `setSelectedChatId(chat.id)` to `setSelectedChatId(chat.profile?.id || chat.id)`
- Add `onError` handler to `useSendMessageMutation` to show toast instead of crashing
**Don't Do This:** Confuse chat IDs with profile IDs - they are different!
**Key Insight:** In the `Chat` GraphQL type:
- `chat.id` = the conversation's unique ID
- `chat.profile.id` = the other person's profile ID (what you need for toId)
**File:** `web/src/pages/dex/[...slug].tsx`
**Commit:** `81018584f`

### 18. Mobile Music Player Crash on Tracks Tab (Jan 22, 2026)
**Symptom:** Mobile browser crashes ~30 seconds into playback when playing from Tracks tab
**Root Cause:** `<audio>` element had `preload="auto"` which tells mobile browsers to preload entire audio file into memory, causing memory exhaustion
**Fix:** Changed to `preload={isMobile ? "metadata" : "auto"}` - only load metadata on mobile
**Don't Do This:** Use `preload="auto"` on mobile for large audio files (IPFS-hosted tracks can be very large)
**File:** `web/src/components/common/BottomAudioPlayer/AudioEngine.tsx`
**Commit:** `fce2b1e5f`

### 19. Nostr Geohash Mismatch Between Devices (Jan 22, 2026)
**Symptom:** Devices in same location couldn't see each other's Nearby chat messages
**Root Cause:** Geohash precision was 7 (~150m) which is too precise - slight GPS differences gave different geohashes:
- Pro Chrome: `9tbmte1`
- iPhone 14: `9tbmte3`
- Bridge app: `9tbmte3`
**Fix:** Changed default geohash precision from 7 (STAGE) to 6 (VENUE ~1.2km)
**Don't Do This:** Use geohash precision 7+ for location matching between devices
**Files:**
- `web/src/components/dex/ConcertChat.tsx` - Changed default to `GEOHASH_PRECISION.VENUE`
- `native/SoundChainBridge/SoundChainBridgeApp.swift` - Changed precision to 6
**Commit:** `e7882c008`

### 20. Video Post Share Previews Show Profile Picture (Jan 24, 2026)
**Symptom:** Sharing a video post link shows profile picture instead of video content in iMessage/social previews
**Root Cause:** Videos can't be used directly as og:image - social crawlers expect static images
**Fix:** Client-side video thumbnail capture:
1. When video is uploaded, capture frame via canvas at 1 second mark
2. Convert canvas to JPEG blob and upload as separate file
3. Store thumbnail URL in `mediaThumbnail` field
4. Use `mediaThumbnail` for og:image in video posts
**Files:**
- `api/src/types/CreatePostInput.ts` - Added `uploadedMediaThumbnail` field
- `api/src/services/PostService.ts` - Use thumbnail if provided
- `web/src/components/Post/PostMediaUploader.tsx` - Capture video frame on upload
- `web/src/components/Post/PostFormTimeline.tsx` - Pass thumbnail to mutation
- `web/src/pages/posts/[id].tsx` - Use mediaThumbnail for video post OG images
**Key Code:**
```typescript
// PostMediaUploader.tsx - capture video thumbnail
const captureVideoThumbnail = (videoFile: File): Promise<Blob | null> => {
  const video = document.createElement('video')
  video.src = URL.createObjectURL(videoFile)
  video.onloadeddata = () => { video.currentTime = Math.min(1, video.duration * 0.1) }
  video.onseeked = () => {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(resolve, 'image/jpeg', 0.85)
  }
}
```
**Commit:** `0f264563d`

### 21. Form Inputs White Box/White Text (Jan 25-26, 2026)
**Symptom:** Description and Utility textareas show white boxes with white text, AND inner box-within-box effect
**Root Cause:**
1. `@tailwindcss/forms` plugin overrides dark backgrounds with high specificity
2. Container and input had different background colors creating nested box effect
**Fix (Jan 26 - Final):**
- Reverted to legacy `bg-gray-1A` styling (defined in tailwind.config.js as `#1A1A1A`)
- Both container AND input use same `bg-gray-1A` for seamless appearance
- Updated globals.css to use `inherit` instead of fixed colors
**Files:**
- `web/src/components/TextareaField.tsx` - Use `bg-gray-1A` for container and textarea
- `web/src/components/InputField.tsx` - Use `bg-gray-1A` for container and input
- `web/src/styles/globals.css` - Use `inherit` for form element backgrounds
**Key Code:**
```css
/* Override @tailwindcss/forms - use inherit to respect component styles */
input, textarea, select {
  background-color: inherit !important;
  color: inherit !important;
}
```
**Don't Do This:**
- Don't use different bg colors for container vs input (causes inner box effect)
- Don't use translucent backgrounds (`bg-black/30`) with `@tailwindcss/forms`
**Commits:** `c1d132bb2`, `3800eca84`, `9db9413e2`

### 22. Oversized Polygon Icon in Mint Section (Jan 26, 2026)
**Symptom:** Huge Polygon logo fills half the screen in mint gas fee section
**Root Cause:** `MaticIcon` SVG had no size constraints - just `className="inline"` with no width/height
**Fix:** Added explicit `w-4 h-4` (16px) size constraints to all MaticIcon usages
**File:** `web/src/components/Matic.tsx`
**Key Code:**
```tsx
// Before - no size constraint, SVG fills container
<MaticIcon className="inline" />

// After - explicit 16px size
<MaticIcon className="w-4 h-4 inline-block flex-shrink-0" />
```
**Don't Do This:** Use SVG icons without explicit size constraints - they'll fill their container
**Commit:** `d26409621`

### 23. Profile Header Text Unreadable on Cover Images (Jan 26, 2026)
**Symptom:** Username, bio, and stats text blends into light/colorful cover images
**Root Cause:** Profile content overlays cover image without sufficient contrast
**Fix:** Added multiple layers of contrast protection:
1. Dark gradient overlay `bg-gradient-to-b from-black/60 via-black/40 to-transparent`
2. Backdrop blur + `bg-black/30` on profile info container
3. Text shadows on username, handle, bio (`textShadow: '0 2px 4px rgba(0,0,0,0.8)'`)
4. Backdrop blur + `bg-black/40` on stat boxes
5. Back button gets `backdrop-blur-sm bg-black/30`
**File:** `web/src/pages/dex/[...slug].tsx` (profile view section ~line 6162)
**Don't Do This:** Place text directly over user-uploaded images without contrast protection
**Commit:** `57caa5790`

### 24. NFT Mint Flow Issues (Jan 26, 2026)
**Multiple issues discovered during mint testing:**

#### 24a. RPC Rate Limiting Breaks Minting
**Symptom:** Mint fails with "429 Too Many Requests" and "call rate limit exhausted"
**Root Cause:** Using public `polygon-rpc.com` which has aggressive rate limits
**Initial Fix Attempt:** Switched to Alchemy RPC using ZetaChain API key
**Problem:** Alchemy API key was ZetaChain-specific, caused balances to show 0
**Final Fix:** Switched to LlamaNodes RPC (`polygon.llamarpc.com`) - better rate limits, no API key needed
**Files Changed:**
- `web/src/contexts/Web3ModalContext.tsx`
- `web/src/components/dex/StakingPanel.tsx`
- `web/src/lib/blockchainNetworks.ts`
- `web/src/pages/airdrop.tsx`
- `web/src/pages/ogun.tsx`
- `web/src/pages/dex/[...slug].tsx`
**Don't Do This:**
- Don't use `polygon-rpc.com` - too aggressive rate limiting
- Don't assume Alchemy API keys work across all networks - they're project/network specific
**Commits:** `97f392cd9` (Alchemy - broken), `c610c6f7d` (LlamaNodes - fixed)

#### 24a-2. Magic SDK Rate Limits for Large Drops (IMPORTANT)
**Magic's Internal Rate Limit:** 500 requests/minute (regardless of RPC provider)
**Impact:** Each NFT mint requires multiple API calls (wallet, signing, tx). You can exhaust the limit with just 50-100 NFTs.

**For Large Edition Mints (300-1000 NFTs):**
| Requirement | Details |
|-------------|---------|
| Custom Rate Limit | Contact Magic sales 2-4 weeks before large drop |
| Gas Limits | 100k-200k+ per transaction (currently using 100k) |
| Batch Minting | Reduce total API calls by batching |
| Queue System | Spread requests over time to stay under limits |

**Error Signatures:**
- `Too many requests, reason: call rate limit exhausted, retry in 10s`
- `Magic RPC Error: [-32603] out of gas`

**Current Mitigations (in CreateModal.tsx):**
- Exponential backoff retry: 15s → 30s → 60s
- Gas limit: 100,000 (bumped from 21k standard)
- Fee collection fails gracefully, mint proceeds anyway

**Before Big Drops:** Contact Magic at https://magic.link/contact to request custom rate limits.

#### 24b. Gas Fee Estimates Way Too High
**Symptom:** Gas estimate shows 1.521 POL for 2 NFTs (should be ~0.05-0.10 POL)
**Root Cause:** Gas constants were set too high for Polygon (copied from Ethereum estimates)
**Fix:** Reduced gas constants to realistic Polygon values:
```javascript
// Before (Ethereum-level estimates)
createEditionGasCost = 130000
baseMintGasCost = 63538
mintUnitGasCost = 117000
gasPriceMultiplier = 1.5

// After (Polygon-realistic)
createEditionGasCost = 65000
baseMintGasCost = 32000
mintUnitGasCost = 55000
gasPriceMultiplier = 1.2  // 20% buffer instead of 50%
```
**Files:** `web/src/hooks/useBlockchain.ts`, `web/src/hooks/useBlockchainV2.ts`
**Commit:** `e598cbf38`

#### 24c. Collaborator Form Styling Issues
**Symptoms:**
- Dropdown options unreadable (dark gray on dark background)
- Percentage input text is gray instead of white
- Wallet address should be cyan to match wallet selector
**Fixes:**
- Added `bg-gray-900 text-white` classes to dropdown options
- Added `color-scheme: dark` and inline styles for number input
- Changed wallet address to cyan (#22d3ee) via inline style
**Files:**
- `web/src/components/forms/track/TrackMetadataForm.tsx`
- `web/src/styles/globals.css`
**Commits:** `997dd7b1a`, `00e12d28b`, `880193ca4`

#### 24d. Collaborator Wallet Not Auto-Filled
**Symptom:** User has to manually paste their wallet address into collaborator field
**Root Cause:** Form didn't check for existing OAuth wallet on mount
**Fix:** Added useEffect to auto-fill first collaborator's wallet with user's OAuth wallet address
**File:** `web/src/components/forms/track/TrackMetadataForm.tsx`
**Key Code:**
```typescript
const { account: magicWalletAddress } = useMagicContext()

useEffect(() => {
  if (magicWalletAddress && values.collaborators.length > 0 && !values.collaborators[0].walletAddress) {
    const newCollaborators = [...values.collaborators]
    newCollaborators[0] = { ...newCollaborators[0], walletAddress: magicWalletAddress }
    setFieldValue('collaborators', newCollaborators)
  }
}, [magicWalletAddress])
```
**Commit:** `00e12d28b`

#### 24e. Wallet Address Truncated in Selector
**Symptom:** Wallet shows as `0x8f93...5df6` - hard to verify full address
**Fix:** Show full wallet address with copy button next to it
**File:** `web/src/components/waveform/WalletSelector.tsx`
**Commit:** `00e12d28b`

#### 24f. Gas-Based Fee Calculation Breaks Wallet Balances (Jan 26, 2026)
**Symptom:** After implementing gas-based platform fee (0.05% of gas), wallet balances show 0 POL and 0 OGUN
**Root Cause:** Unknown - possibly related to config changes or component re-render loops. The gas-based fee calculation added complexity that somehow broke balance fetching.
**Fix:** Reverted to simple flat fee approach (0.01 POL per NFT)
**Don't Do This:**
- Don't calculate fees dynamically from gas estimates in component render cycle
- Keep platform fee calculation simple - flat fees are more reliable
- Test wallet balance display after ANY changes to config.ts or fee calculation
**Files:** `web/src/config.ts`, `web/src/components/forms/track/TrackMetadataForm.tsx`, `web/src/components/modals/CreateModal.tsx`
**Commit:** `a607d9aa1`

**Final Fee Structure:**
- Minting: 0.01 POL per NFT (flat fee)
- Marketplace Sales: 0.05% of sale price + 0.05% of gas

### 25. Stream Count Dedup Bug - Loops Not Counting (Jan 27, 2026)
**Symptom:** NFT "Ashtray" (SC-POL-D038-2600003) only showed 2 stream counts despite being played on repeat/loop at work. Long-standing bug from 2023-2024 never addressed.
**Root Cause:** Per-minute dedup window in `useLogStream.tsx` was too aggressive:
```typescript
// OLD (BROKEN): Key per minute - blocks ALL logs for same track within same minute
const sessionKey = `${trackId}-${Math.floor(Date.now() / 60000)}`
if (loggedTracks.current.has(sessionKey)) return null  // BLOCKED!
```
- If track loops and finishes within the same 60-second window → blocked
- Short tracks (under 2 min) could only ever count once per minute
- `loggedTracks` Set accumulated keys forever during session (never cleared per-track)
**Fix:** Replaced per-minute Set with per-track timestamp Map:
```typescript
// NEW (FIXED): Allow stream every 30 seconds of actual play time per track
const now = Date.now()
const lastLog = lastLogTime.current.get(trackId)
if (lastLog && (now - lastLog) < (minDuration * 1000)) return null  // Only block rapid-fire
lastLogTime.current.set(trackId, Date.now())  // Update timestamp on success
```
**How it works now:**
- Every 30 seconds of play time → stream counts
- Loop/repeat mode → each full play counts as separate stream
- Anti-spam: Can't log same track faster than every 30 seconds
- Backend still validates 30-second minimum duration
**File:** `web/src/hooks/useLogStream.tsx`
**Don't Do This:** Use accumulating Sets for dedup - they grow forever and block legitimate plays
**Commit:** `c6e10857b`

### 26. Stream Count Logged on Song End Instead of 30s Mark (Jan 27, 2026)
**Symptom:** Streams only counted when a song finished playing or when user skipped to next track. Partial plays over 30 seconds were missed entirely. Looped tracks only logged once per full play-through.
**Root Cause:** `AudioEngine.tsx` called `logStream()` in `handleEndedSong()` and in the `currentSong.trackId` useEffect (on track change). Neither logged during active playback.
**Fix:** Moved stream logging into `handleTimeUpdate()` which fires continuously during playback:
- Added `streamLoggedForCurrentPlay` ref (boolean flag)
- When `audioRef.current.currentTime >= 30` and flag is false → log stream immediately
- Flag resets on track change (useEffect) and loop restart (handleEndedSong)
- Removed all `logStream()` calls from `handleEndedSong()` and song-change useEffect
**Calibration:** Added `streamCountCalibratedAt` field to SCid model. First stream logged after this fix stamps the date, so users/admins can distinguish pre-fix (potentially undercounted) from post-fix (accurate) stream counts.
**Files:**
- `web/src/components/common/BottomAudioPlayer/AudioEngine.tsx` - 30s mark logging
- `api/src/models/SCid.ts` - Added `streamCountCalibratedAt` field
- `api/src/services/SCidService.ts` - Stamps calibration date on first post-fix stream
**Don't Do This:** Log streams only on song end - users who listen 5 minutes then skip get zero credit
**Commits:** `0ba475f9f` (frontend), `edcb4bb76` (API)

### 27. External Wallet Connections - Zero Balances (Jan 27, 2026)
**Symptom:** Connecting MetaMask, Coinbase, WalletConnect, Trust, Rainbow via WalletConnectButton shows address but zero balances. Web3Modal also missing native token balance.
**Root Cause:** UnifiedWalletContext had NO balance fetching for `direct` and `web3modal` wallet types:
- `case 'direct':` had a comment "would require additional setup" - never implemented
- `case 'web3modal':` only fetched OGUN, not native token (POL/ETH)
- MetaMask `chainChanged` event did full `window.location.reload()` killing audio
**Fix:**
- Added public RPC map for Polygon, Ethereum, Base, Arbitrum, Optimism, ZetaChain
- Both `direct` and `web3modal` now fetch native + OGUN balances via public RPCs
- MetaMask chain switch now updates state in-place instead of page reload
- WalletConnect timeout increased 15s→25s, retries 3→4 with exponential backoff
- Connected wallet dropdown shows balance + chain name
- Disconnect properly clears all balance state
**Files:**
- `web/src/contexts/UnifiedWalletContext.tsx` - Balance fetching for all wallet types
- `web/src/components/dex/WalletConnectButton.tsx` - Balance display, timeout/retry
- `web/src/hooks/useMetaMask.ts` - Chain switch without reload
**Don't Do This:** Leave wallet types without balance fetching. All connected wallets must show balances.
**Commit:** `6ad2a061e`

### 28. Mobile WalletConnect Relay Timeout (Jan 27, 2026)
**Symptom:** Chrome mobile MetaMask connection times out with "relay too slow"
**Root Cause:** WalletConnect relay on cellular networks needs longer timeouts
**Fix:** Auto-retry up to 2 times with exponential backoff, timeout 15s→30s, better error UI with "Try Again" and "Other Wallet" buttons
**File:** `web/src/components/dex/WalletConnectButton.tsx`
**Commit:** `67482b734`

### 29. Reown AppKit Migration - REVERTED (Jan 27, 2026)
**Symptom:** After migrating from `@web3modal/ethers5` to `@reown/appkit`, site crashed with 500 (SSR), then showed spinning wheel (403 from API)
**Root Cause:** Two issues:
1. Reown packages access `window` globals → SSR crash on Vercel serverless functions
2. WalletConnect project ID `8e33134dfeea545054faa3493a504b8d` returns 403 from `api.web3modal.org` (Reown's new API). Old `@web3modal/ethers5` used `api.web3modal.com` which still accepts it.
**Attempted Fix:** Dynamic imports for SSR safety (commit `3b15a1915`), but 403 project ID was unsolvable without cloud.reown.com migration.
**Final Fix:** Reverted entire Reown migration, restored `@web3modal/ethers5@5.1.11` with dynamic imports for SSR safety.
**BLOCKER:** Must register project at `cloud.reown.com` before re-attempting Reown migration.
**Don't Do This:**
- Don't import `@reown/appkit` at top level - always use dynamic `import()` inside useEffect
- Don't assume WalletConnect project IDs work across old/new APIs
- Don't use `npm` - only `yarn` (caused node_modules corruption during install/uninstall)
**Files:** `web/src/contexts/Web3ModalContext.tsx`, `web/src/contexts/UnifiedWalletContext.tsx`
**Commits:** `882b1be64` (migration), `3b15a1915` (SSR fix), `8c688ed69` (full revert)

### 30. TDZ Crash - SITE DOWN for Hours (Jan 28, 2026)
**Symptom:** Entire site crashes with `ReferenceError: Cannot access 'iy' before initialization` in webpack chunk `1600`. Application error page renders with legacy header.
**Initial Theory (WRONG):** Dual `@walletconnect/ethereum-provider` versions in `yarn.lock` (2.16.1 + 2.23.0).
**Actual Root Cause:** The +559 lines added to `dex/[...slug].tsx` during the Jan 27 session caused the TDZ when webpack bundled the chunk. Cleaning yarn.lock and removing the direct WC dep were necessary but NOT sufficient — the crash persisted even after a clean `vercel deploy --prod --force` build.
**How We Found It — Production Bisect:**
1. Nuclear rollback: Restored ALL 9 wallet-related files to `69bd51c20` (pre-Jan-27) → site came back up
2. Bisect 1/5: Re-added `UnifiedWalletContext.tsx` from `f7fc29aca` → SAFE (`908806d93`)
3. Bisect 2/5: Re-added `WalletSelector.tsx` → SAFE (`53e65a923`)
4. Bisect 3/5: Re-added `useWalletContext.tsx` + `useMetaMask.ts` + `WalletConnectButton.tsx` → SAFE (`dc76a9f7b`)
5. Bisect 4/5: Re-added `MultiWalletAggregator.tsx` + `CreateModal.tsx` + `useBlockchainV2.ts` → SAFE (`5912b3a3d`)
6. Bisect 5/5: Re-added `dex/[...slug].tsx` → **CRASHED** (`80c52ee63`)
7. Reverted `dex/[...slug].tsx` back to `69bd51c20` → site recovered (`35428e848`)
**Poison Pill:** `web/src/pages/dex/[...slug].tsx` — the 559 lines added Jan 27 (ConnectedWalletsPanel, multi-wallet portfolio view, wallet activity feed, NFT transfer UI, POL/OGUN send UI)
**Current State:**
- 8 of 9 wallet files restored to `f7fc29aca` (Jan 27 final) — all working
- `dex/[...slug].tsx` reverted to `69bd51c20` (pre-Jan-27) — missing Jan 27 features
- yarn.lock cleaned (single WC version 2.16.1)
- `@walletconnect/ethereum-provider` removed as direct dep
**ROOT CAUSE FOUND (Jan 28):** `activeAddress` was referenced at line 991 (`effectiveWalletForActivity`) and line 1002 (`allMyAddresses` useMemo) BEFORE `const { activeAddress } = useUnifiedWallet()` was declared at line 1008. Classic JavaScript Temporal Dead Zone — webpack minified the variable to `ih`/`ik`/`iy`, producing `ReferenceError: Cannot access 'ih' before initialization`.
**Fix:** Moved `useUnifiedWallet()` destructuring ABOVE the lines that depend on `activeAddress`. All 540 lines of Jan 27 features restored.
**Don't Do This:**
- **NEVER reference a `const` variable before its declaration** — even in the same scope, JS enforces TDZ
- **NEVER do a nuclear rollback without communicating first** — the user needs those features ASAP
- **NEVER import `useUnifiedWallet` into `useWalletContext.tsx`** — circular dependency within same webpack chunk
- Don't add direct deps that duplicate transitive deps from other packages
**CRITICAL RULE — ALWAYS run `yarn install` after:**
- Reverting commits that touched `package.json`
- Adding or removing dependencies
- Any `git revert` that spans dependency changes
- Multiple sessions making package changes
- **If in doubt, run `yarn install` — stale yarn.lock entries are invisible killers**
**Lesson:** When the site is down, bisect via production deploys — it's methodical and conclusive. Don't guess at the cause. TDZ errors in minified webpack output are unreadable — binary search the diff hunks.
**Files:** `web/src/pages/dex/[...slug].tsx` (poison pill), `web/package.json`, `web/yarn.lock`
**Commits:** `7013a20c8` (nuclear rollback), `908806d93`→`5912b3a3d` (safe bisects), `80c52ee63` (crash confirmed), `35428e848` (reverted culprit), **`99d55bd99` (FIXED — all features restored)**

### 31. NFT Mint Silently Fails with External Wallets (Jan 28, 2026)
**Symptom:** Platform fee sends to Gnosis Safe successfully, but NFT mint never reaches blockchain. Toast shows "There was an error while minting your NFT."
**Root Cause:** `BlockchainFunction._execute()` in `useBlockchainV2.ts` hardcoded Magic SDK validation:
1. Line 111: `if (!me?.magicWalletAddress)` - only checked Magic address, not Google/Discord/Twitch OAuth addresses
2. Lines 115-116: `magic.user.isLoggedIn()` - returns false for external wallets (MetaMask, Coinbase, WalletConnect)
3. External wallet mints silently returned without executing
**Evidence:** Polygonscan showed NO failed mint tx for wallet `0x8f93...5df6` - confirming mint was killed client-side before reaching blockchain
**Fix:** Updated `_execute()` to:
- Check ALL OAuth wallet addresses (magic, google, discord, twitch, email)
- Only validate Magic login when `provider.isMagic` is true
- Skip Magic checks entirely for external wallets
**File:** `web/src/hooks/useBlockchainV2.ts`
**Commit:** `f7fc29aca` (preserved through revert)

### 32. Track Detail Play Count Out of Sync (Jan 28, 2026)
**Symptom:** NFT track detail page shows wrong play count (stale or 0)
**Root Cause:** Two places in the track detail view used `trackDetailData.track.playbackCount` (old MongoDB field that doesn't get updated) instead of `scidData.scidByTrack.streamCount` (real-time SCid stream count)
**Fix:** Both the header stats row (line 5800) and Edition Info "Total Plays" (line 6074) now prefer `scidData?.scidByTrack?.streamCount` with fallback to `playbackCount`
**File:** `web/src/pages/dex/[...slug].tsx`
**Commit:** `7b5b77854`

---

## ARCHITECTURE PATTERNS

### DEX Mega-Router Pattern
**File:** `web/src/pages/dex/[...slug].tsx`
This 5000+ line file handles ALL DEX routes via catch-all routing:
- `/dex/feed` - Social feed
- `/dex/marketplace` - NFT listings
- `/dex/wallet` - Multi-wallet dashboard
- `/dex/users/[handle]` - Profile pages
- `/dex/post/[id]` - Single post view
- `/dex/track/[id]` - Track detail

**Pattern:** Use `getInitialView()` to map URL slug to view type, then render appropriate section.

### Unified Wallet Context
**File:** `web/src/contexts/UnifiedWalletContext.tsx`
Manages 4 wallet types:
- `magic` - OAuth/email login wallet
- `metamask` - Direct MetaMask connection
- `web3modal` - WalletConnect/Coinbase via Web3Modal
- `direct` - Direct SDK connections (mobile)

**Key Functions:**
- `setDirectConnection(address, walletType, chainId)` - For mobile wallet returns
- `refetchBalance()` - Force refresh balances
- `disconnectWallet()` - Clean disconnect with localStorage cleanup

### Multi-Chain EVM Support (Jan 23, 2026)
**Feature:** View wallet balances across multiple EVM networks
**Key Insight:** EVM addresses are IDENTICAL across all chains - we just switch RPC endpoints!

**Architecture:**
```
┌─────────────────────┐     ┌───────────────────┐     ┌─────────────────────┐
│   Magic Wallet      │     │  MultiChainContext │     │  Public RPCs        │
│   (Polygon-based)   │────▶│  (Chain Switcher)  │────▶│  Ethereum, Base,    │
│                     │     │                    │     │  Arbitrum, Optimism │
│  Same 0x address    │     │  Read-only balance │     │  Same 0x address    │
│  across all chains  │     │  viewing per chain │     │  works everywhere   │
└─────────────────────┘     └───────────────────┘     └─────────────────────┘
```

**Supported Networks:**
| Chain | ChainId | Native Token | OGUN Available |
|-------|---------|--------------|----------------|
| Polygon | 137 | POL | Yes |
| Ethereum | 1 | ETH | No |
| Base | 8453 | ETH | No |
| Arbitrum | 42161 | ETH | No |
| Optimism | 10 | ETH | No |

**Files:**
- `web/src/lib/blockchainNetworks.ts` - Network configs, `SUPPORTED_NETWORKS` map
- `web/src/contexts/MultiChainContext.tsx` - Chain selection state, balance fetching
- `web/src/components/dex/ChainSwitcher.tsx` - UI dropdown for network selection

**Important Notes:**
- Magic SDK stays fixed on Polygon (where OGUN lives)
- MultiChainContext uses separate read-only Web3 providers for other chains
- OGUN balance only available on Polygon - show warning on other chains
- Selection persisted to localStorage

### RoyaltySplitter - Post-Mint Collaborator Splits (Jan 27, 2026)
**Feature:** Creators can add royalty-splitting smart contracts to EXISTING minted NFTs
**Game-Changer:** No other platform lets you retroactively add collaborators to already-minted NFTs!

**How it Works:**
1. Creator deploys a `RoyaltySplitter` via `RoyaltySplitterFactory`
2. Creator updates their NFT edition's `royaltyReceiver` to the splitter address
3. Marketplace pays royalties to splitter (via EIP-2981 dynamic `royaltyInfo()` reads)
4. Anyone can call `distribute()` to push funds to all collaborators
5. Supports both native POL and ERC-20 (OGUN) royalty payments

**Architecture:**
```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│  Marketplace     │     │  RoyaltySplitter  │     │  Collaborators   │
│  (OpenSea, etc)  │────▶│  (per-edition)    │────▶│  Artist A: 60%   │
│                  │     │                   │     │  Artist B: 25%   │
│  Pays royalties  │     │  Splits by bps    │     │  Producer: 15%   │
│  via EIP-2981    │     │  (basis points)   │     │                  │
└──────────────────┘     └───────────────────┘     └──────────────────┘
```

**Key Features:**
- Up to 10 collaborators per splitter
- 48-hour timelock on split updates (prevents creator front-running)
- Auto-distributes existing balance before applying new splits
- Factory tracks all splitters per creator and per SCid

**Contract:** `soundchain-contracts/contracts/RoyaltySplitter.sol`
**Status:** Contract written, pushed to `soundchain-contracts` repo. NOT yet deployed on-chain.

**Next Steps to Deploy:**
1. Compile with Hardhat: `npx hardhat compile`
2. Write deployment script for `RoyaltySplitterFactory`
3. Deploy factory to Polygon mainnet
4. Add factory address to `web/src/config.ts`
5. Build UI for creators to deploy splitters from their edition page

### Legacy Branch Reference
When looking for "how it used to work", check legacy branches:
```bash
# View legacy code
git show origin/develop:web/src/components/Post/Post.tsx
git show origin/staging:web/src/components/GridView/GridView.tsx

# Compare branches
git diff production..origin/develop -- <file>
```

### Nostr/Bitchat Integration (Jan 21, 2026)
**Feature:** Decentralized location-based messaging using Nostr protocol
**Interoperability:** Messages visible to both SoundChain web app AND Bitchat iOS app!

**Architecture:**
```
┌─────────────────────┐     ┌───────────────────┐     ┌─────────────────────┐
│  SoundChain User    │     │   Nostr Relays    │     │   Bitchat User      │
│  (Web App)          │────▶│   (290+ public)   │◀────│   (iOS App)         │
│                     │     │                   │     │                     │
│  Posts to geohash:  │     │  relay.damus.io   │     │  Posts to geohash:  │
│  "dr5r7" (NYC)      │     │  relay.snort.social│    │  "dr5r7" (NYC)      │
└─────────────────────┘     └───────────────────┘     └─────────────────────┘
```

**Files:**
- `web/src/lib/nostr/concertChat.ts` - Location-based chat via geohash
- `web/src/lib/nostr/privateDM.ts` - NIP-17 encrypted private messages
- `web/src/lib/nostr/index.ts` - Exports all Nostr utilities
- `web/src/components/dex/ConcertChat.tsx` - React chat component

**NPM Packages:**
```bash
nostr-tools@2.19.4    # Core Nostr protocol
@noble/hashes@2.0.1   # Cryptographic primitives
ngeohash@0.6.3        # Geohash encoding/decoding
```

**Protocols Used:**
| Protocol | Purpose | Event Kind |
|----------|---------|------------|
| NIP-01 | Basic Nostr events | - |
| NIP-44 | ChaCha20 encryption | - |
| NIP-59 | Gift wrapping (metadata hiding) | 1059 |
| NIP-17 | Private DMs | 14 |
| Geohash | Location channels | 20000 (ephemeral) |

**Use Cases:**
- Festival/concert venue chat
- Artist-fan encrypted DMs
- Location-based discovery
- Offline mesh via Bitchat app

**Bitchat Deep Link:**
```typescript
// Open same channel in Bitchat app
const deepLink = `bitchat://channel/${geohash}`
```

**App Store:** https://apps.apple.com/us/app/bitchat-mesh/id6748219622

### SoundChain Bridge App (Jan 22, 2026)
**Purpose:** Native iOS app that bridges Nostr (internet) ↔ Bluetooth mesh (Bitchat)
**Status:** Development/Testing (not on App Store yet)

**Architecture:**
```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│  SoundChain Web  │     │  SoundChain       │     │  Bitchat App     │
│  (Browser)       │────▶│  Bridge (iOS)     │◀────│  (Bluetooth)     │
│                  │     │                   │     │                  │
│  Nostr relays    │     │  Nostr + BLE      │     │  CoreBluetooth   │
└──────────────────┘     └───────────────────┘     └──────────────────┘
```

**Files:**
- `native/SoundChainBridge/SoundChainBridge/BridgeServer.swift` - Core relay logic (Nostr + Bluetooth + Bitchat BLE)
- `native/SoundChainBridge/SoundChainBridge/ContentView.swift` - SwiftUI interface
- `native/SoundChainBridge/SoundChainBridge/SoundChainBridgeApp.swift` - App entry point + BridgeManager

**Key Components:**
| Class | Purpose |
|-------|---------|
| `NostrRelayManager` | Connects to Nostr relays, subscribes to geohash channels |
| `BluetoothMeshManager` | Multipeer Connectivity for iOS-to-iOS mesh |
| `BitchatBLEManager` | CoreBluetooth for direct Bitchat device communication |
| `SoundChainBridge` | Orchestrates all three networks |
| `BridgeManager` | SwiftUI state management + location/geohash |

**Bitchat BLE UUIDs (from their GitHub):**
```swift
// Testnet
serviceUUID: "F47B5E2D-4A9E-4C5A-9B3F-8E1D2C3A4B5A"
// Mainnet
serviceUUID: "F47B5E2D-4A9E-4C5A-9B3F-8E1D2C3A4B5C"
// Characteristic
characteristicUUID: "A1B2C3D4-E5F6-4A5B-8C9D-0E1F2A3B4C5D"
```

**Message Flow:**
1. Web → Nostr relays → Bridge receives → Forwards to Bluetooth mesh + Bitchat BLE
2. Bitchat → BLE → Bridge receives → Forwards to Nostr relays → Web receives

**Important:** Bridge uses simplified Nostr signing (not proper Schnorr). Messages FROM Bridge may be rejected by clients that verify signatures. Messages TO Bridge work fine.

**Testing via Xcode:**
1. Open `native/SoundChainBridge/SoundChainBridge.xcodeproj`
2. Select iPhone target
3. Build and run (`Cmd+R`)
4. Allow location and Bluetooth permissions
5. Tap "Start Bridge"

### Bridge Test Logs

**Jan 23, 2026 - 8:20 AM - War Room 3-Device Test**
Testing across 3 devices (iPhone Pro, iPhone 14, iPad). Results:
```
✅ WebSocket connected to multiple Nostr relays
✅ Geohash subscription active (9tbmte - local area)
✅ Messages received from Nostr:
   - "5d6b72b1... /pro saying peace"
   - "0fb17749... /14/🧬"
✅ Bridge forwarding: Nostr → Bluetooth/Bitchat
✅ Publishing: 2/4 relays succeeded
⚠️ relay.damus.io & relay.nostr.band dropped (normal flakiness)
⚠️ No Bluetooth mesh peers (devices not close enough)
```
**Status:** Core bridge functionality WORKING. Nostr ↔ Bridge communication confirmed. Bluetooth mesh pending physical proximity test.

---

## SMART CONTRACT ADDRESSES

| Contract | Address | Network | Status |
|----------|---------|---------|--------|
| **SoundChain Safe (Treasury)** | `0x519BED3fE32272Fa8f1AECaf86DbFbd674Ee703B` | Polygon | **FEE COLLECTION** |
| OGUN Token | `0x45f1af89486aeec2da0b06340cd9cd3bd741a15c` | Polygon | LIVE |
| StreamingRewardsDistributor | `0xcf9416c49D525f7a50299c71f33606A158F28546` | Polygon | Funded (5M OGUN) |
| StakingRewards | Config address | Polygon | LIVE |
| SCidRegistry | Deployed | Polygon | LIVE |
| RoyaltySplitter | Not deployed yet | Polygon | CONTRACT READY |
| RoyaltySplitterFactory | Not deployed yet | Polygon | CONTRACT READY |

### SoundChain Safe Treasury (Fee Collection)
**Address:** `0x519BED3fE32272Fa8f1AECaf86DbFbd674Ee703B`
**Polygonscan:** https://polygonscan.com/address/0x519BED3fE32272Fa8f1AECaf86DbFbd674Ee703B

This is where ALL platform fees are collected from:
- NFT Minting (0.05% of gas cost, min 0.001 POL)
- Marketplace Sales (0.05% sale + 0.05% gas = 0.10% total)
- Token Swaps (0.05%)
- Staking/Unstaking (0.05%)
- Cross-chain swaps via ZetaChain (0.05%)

**24 Token Support** - Fees collected in POL from all 24 supported tokens!

**CRITICAL:** Address is `519BED3fE...` NOT `519BD3fE...` (note the 'E' after 'B')

---

## AWS INFRASTRUCTURE

### API Gateway Direct Connection (COMPLETED Feb 4, 2026)

**MILESTONE:** API now connects directly to API Gateway, bypassing the old EC2 proxy!

| Before | After |
|--------|-------|
| `api.soundchain.io` → EC2 (54.89.147.104) → API Gateway | `api.soundchain.io` → **API Gateway DIRECT** |
| SSL expired, proxy broken | Fresh ACM cert (expires Mar 2027) |
| Extra hop, extra cost | Direct, faster, cheaper |

**Configuration:**
- **Custom Domain:** `api.soundchain.io`
- **API Gateway Domain:** `d-bb15gwni7a.execute-api.us-east-1.amazonaws.com`
- **API:** `production-soundchain-api` (ID: `19ne212py4`)
- **Stage:** `production`
- **ACM Certificate:** `d802632a-515a-44a2-984d-371741e03d71`

**DNS Record (name.com):**
```
CNAME  api.soundchain.io  →  d-bb15gwni7a.execute-api.us-east-1.amazonaws.com
```

---

### EC2 Instances

| Name | Instance ID | Type | IP | Status | Purpose |
|------|-------------|------|-----|--------|---------|
| **Soundchain** | `i-0562663ea0b7941a1` | t3.small | 44.209.136.62 | Running | Main server - DB security groups, VPC access |
| **soundchain-bastion** | `i-0fd425cefe208d593` | t2.micro | (none) | Stopped | SSH tunnel to DocumentDB (start when needed) |
| **soundchain-nat-instance** | `i-00a3fd681fab34aaa` | t4g.nano | 3.87.240.89 | Running | NAT for private subnet internet access |

**Monthly Cost:** ~$18/month total (optimized - using NAT instance instead of NAT Gateway saves ~$30/month)

---

### Soundchain Instance (i-0562663ea0b7941a1)
- **Type:** t3.small (2 vCPU)
- **OS:** Ubuntu 24.04 LTS
- **VPC:** vpc-0742bbd5d548c14f0
- **Subnet:** subnet-0ce9ae44fbbbd9947 (private: 10.0.1.61)
- **Elastic IP:** 44.209.136.62
- **Key Pair:** soundchain-key-pair
- **IAM Role:** EC2-SSM-Role
- **Security Groups:** default, SecurityGroup-DB-soundchain-api-production, SecurityGroup-VPC-soundchain-api-production
- **Launched:** Dec 17, 2025

### Bastion Host (i-0fd425cefe208d593)
- **Type:** t2.micro (1 vCPU)
- **OS:** Amazon Linux 2023
- **VPC:** vpc-0742bbd5d548c14f0
- **Subnet:** subnet-023758c486fbc2225 (soundchain-public-subnet)
- **Key Pair:** soundchain-key-pair-2025
- **IAM Role:** AmazonSSMRoleForInstancesQuickSetup
- **Launched:** Jan 29, 2026
- **Status:** Stopped (start only when needed for DB access)

```bash
# Start bastion (only for backend/DB work)
aws ec2 start-instances --instance-ids i-0fd425cefe208d593

# STOP IMMEDIATELY WHEN DONE (costs money!)
aws ec2 stop-instances --instance-ids i-0fd425cefe208d593
```

**When Bastion is Needed:**
- API/backend development requiring DocumentDB
- Database queries/migrations
- SSH tunnel to private resources

**When Bastion is NOT Needed:**
- Frontend-only changes
- Pushing to production
- Vercel deployments

### NAT Instance (i-00a3fd681fab34aaa)
- **Type:** t4g.nano (2 vCPU, ARM64)
- **OS:** Amazon Linux 2023
- **VPC:** vpc-dc305ba1
- **Subnet:** subnet-05718f1ab69abbb0b (soundchain-subnet-us-east-1b)
- **Public IP:** 3.87.240.89
- **Private IP:** 172.33.17.39
- **IAM Role:** AmazonSSMRoleForInstancesQuickSetup
- **Launched:** Dec 15, 2025
- **Purpose:** Provides internet access for resources in private subnets (cheaper than NAT Gateway!)

### SSH Tunnel Command
```bash
ssh -f -N -L 27018:soundchain-production.cluster-cdqm2s8y0pkl.us-east-1.docdb.amazonaws.com:27017 \
  -i ~/.ssh/soundchain-key-pair-2025.pem ec2-user@<BASTION_IP>
```

---

## DEVELOPMENT COMMANDS

```bash
# Frontend
cd web
yarn dev                  # Start dev server
yarn build               # Production build
yarn codegen             # Regenerate GraphQL types (needs API running)
yarn typecheck           # Type check without build

# API
cd api
yarn dev                 # Start API server
yarn start:local         # Start with local MongoDB

# Git Push with SSH
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519" git push

# Init Script (run at start of each session)
~/Desktop/soundchain-init.sh
```

---

## EMBED PLATFORM SUPPORT

### URL Normalization
| Platform | Input | Output |
|----------|-------|--------|
| Spotify | `open.spotify.com/track/X` | `open.spotify.com/embed/track/X` |
| YouTube | `youtube.com/watch?v=X` | ReactPlayer (all formats) |
| SoundCloud | Any URL | oEmbed API → iframe |
| Bandcamp | Any URL | GraphQL query → iframe |

### Platform-Specific Heights
- Bandcamp: 470px
- Spotify: 352px
- SoundCloud: 166px
- YouTube Playlist: 500px (shows tracklist)

### YouTube URL Support (All Formats)
- Standard: `youtube.com/watch?v=VIDEO_ID`
- Shorts: `youtube.com/shorts/VIDEO_ID`
- Live: `youtube.com/live/VIDEO_ID`
- Share: `youtu.be/VIDEO_ID`
- Music: `music.youtube.com/watch?v=VIDEO_ID`
- Playlists: `youtube.com/playlist?list=PLAYLIST_ID`
- Clips: `youtube.com/clip/CLIP_ID`

---

## CRITICAL FILES BY FEATURE

### Authentication
- `web/src/pages/login.tsx` - Login page (PROTECTED)
- `web/src/hooks/useMagicContext.tsx` - Magic SDK context (PROTECTED)
- `web/src/hooks/useMe.ts` - Current user hook (PROTECTED)
- `web/src/lib/apollo/index.tsx` - JWT cookie handling

### Wallet
- `web/src/contexts/UnifiedWalletContext.tsx` - Multi-wallet state
- `web/src/components/dex/WalletConnectButton.tsx` - Mobile wallet connections
- `web/src/components/dex/MultiWalletAggregator.tsx` - Wallet dashboard

### Audio Player
- `web/src/hooks/useAudioPlayer.tsx` - Global player context
- `web/src/components/modals/AudioPlayerModal.tsx` - Fullscreen player
- `web/src/components/WaveformWithComments.tsx` - SoundCloud-style waveform

### Feed/Posts
- `web/src/components/Post/Post.tsx` - Main post component
- `web/src/components/Post/Posts.tsx` - Feed container
- `web/src/utils/NormalizeEmbedLinks.ts` - Embed URL conversion

### Streaming Rewards
- `api/src/services/SCidService.ts` - Rewards logic (PROTECTED)
- `api/src/utils/StreamingRewardsContract.ts` - Contract interaction
- `api/src/models/SCid.ts` - SCid tracking

---

## COMMIT MESSAGE CONVENTIONS

```
feat: New feature
fix: Bug fix
refactor: Code restructuring
debug: Debugging changes (usually temporary)
docs: Documentation
chore: Maintenance
revert: Reverting previous commit
```

---

## SESSION CHECKLIST

### Start of Session
1. Run `~/Desktop/soundchain-init.sh`
2. Check git status: `git status`
3. Read latest handoff: `/Users/soundchain/soundchain-agent/handoffs/`
4. Check for any running servers: `lsof -i :3000`, `lsof -i :4000`

### Before Pushing
1. Test on mobile if UI changes
2. Check no console errors
3. Verify login still works (if auth-related)
4. Run `yarn build` to catch TypeScript errors

### End of Session
1. Create/update handoff in `/Users/soundchain/soundchain-agent/handoffs/`
2. Stop bastion if started: `aws ec2 stop-instances --instance-ids i-0fd425cefe208d593`
3. Document any new bugs or lessons learned

---

## KNOWN LIMITATIONS

### ZetaChain Integration (NOT READY)
- 24 tokens DECLARED in constants
- Only 2 tokens WORK (MATIC, OGUN)
- ZetaChain contracts NOT DEPLOYED
- Cross-chain purchase component returns `null`

**Safe to Announce:** Polygon marketplace, OGUN staking, multi-wallet view
**Cannot Announce:** "24 token support", "Buy with any token", "ZetaChain omnichain"

### TypeScript Errors (Non-Blocking)
These exist but don't block builds:
- SocialLinksForm.tsx - Schema mismatch
- CreateModal.tsx - Buffer type issues
- NFTPlayer.tsx - WebTorrent types
- useMetaMask.ts - Web3 contract types

### Large Files Needing Refactor
| File | Lines | Status |
|------|-------|--------|
| StakingPanel.tsx | 836 | Needs split |
| ProfileHeader.tsx | 1411 | Needs split |
| MultiWalletAggregator.tsx | 737 | Needs split |
| dex/[...slug].tsx | 5000+ | Mega-router pattern |

---

## MOBILE TESTING

### Cloudflare Tunnel
```bash
# Quick tunnel for mobile testing
cloudflared tunnel --url http://127.0.0.1:3000

# Or use launchctl service
launchctl start com.cloudflare.tunnel
```

### tmux for Persistent Sessions
```bash
# Start session
tmux new -s sc
claude

# Reattach after disconnect
tmux attach -t sc

# Alias for .zshrc
alias cc='tmux new -s claude 2>/dev/null || tmux attach -t claude'
```

---

## 🛰️ JANUARY 2026 - THE WAR ROOM ERA 🛰️

### Development Infrastructure

**War Room Configuration (3-Node Fleet)**
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           WAR ROOM - FLEET COMMAND                              │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
  │  🖥️ MINI            │    │  🧀 GRATER          │    │  🎮 ROG             │
  │  192.168.1.22       │    │  192.168.1.23       │    │  192.168.1.29       │
  │                     │    │                     │    │                     │
  │  Headless test      │    │  Log streaming      │    │  Windows testing    │
  │  runner             │    │  (Screen 6)         │    │  16TB storage       │
  │                     │    │                     │    │                     │
  │  • CI/CD jobs       │    │  • Real-time logs   │    │  • Cross-platform   │
  │  • Background tasks │    │  • Error monitoring │    │  • Media backup     │
  │  • Batch processing │    │  • Deployment watch │    │  • Heavy compute    │
  └─────────────────────┘    └─────────────────────┘    └─────────────────────┘
           │                          │                          │
           └──────────────────────────┼──────────────────────────┘
                                      │
                        ┌─────────────┴─────────────┐
                        │  🚀 FLEET COMMANDER       │
                        │  MacBook Pro (M-Series)   │
                        │                           │
                        │  • Primary development    │
                        │  • Claude Code sessions   │
                        │  • Git operations         │
                        │  • Mobile testing via     │
                        │    Cloudflare tunnel      │
                        └─────────────┬─────────────┘
                                      │
                        ┌─────────────┴─────────────┐
                        │  🎖️ SARG                  │
                        │  iPhone 14 Pro Max        │
                        │                           │
                        │  • Claude Code (mobile)   │
                        │  • ttyd terminal          │
                        │  • code-server (VSCode)   │
                        │  • Production testing     │
                        │  • On-the-go commits      │
                        └───────────────────────────┘
```

**War Room Roster**
| Codename | Device | Role |
|----------|--------|------|
| **Fleet Commander** | MacBook Pro (M-Series) | Strategic command, primary dev |
| **Sarg** | iPhone 14 Pro Max | Tactical execution, mobile Claude Code |
| **mini** | Mac Mini (192.168.1.22) | Headless test runner, CI/CD |
| **grater** | Server (192.168.1.23) | Log streaming, monitoring |
| **rog** | Windows PC (192.168.1.29) | Cross-platform testing, 16TB storage |

**Remote Development Stack**
| Component | Purpose | Access |
|-----------|---------|--------|
| **ttyd** | Terminal in browser | `tunnel.soundchain.io/ttyd` |
| **code-server** | VSCode in browser | `tunnel.soundchain.io/code` |
| **Cloudflare Tunnel** | Secure remote access | Zero-trust, no port forwarding |
| **tmux** | Persistent sessions | Survives disconnects |

**Init Script (`~/Desktop/soundchain-init.sh`)**
```bash
#!/bin/bash
cd /Users/soundchain/soundchain
source ~/.zshrc
export PATH="$PATH:$(yarn global bin)"
echo "🚀 SoundChain Dev Environment Ready"
echo "📁 Working dir: $(pwd)"
echo "🌿 Branch: $(git branch --show-current)"
```

### Claude Code + Subagents Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        CLAUDE CODE DEVELOPMENT FLOW                             │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌───────────────────┐
                              │   USER REQUEST    │
                              │   (via terminal)  │
                              └─────────┬─────────┘
                                        │
                                        ▼
                              ┌───────────────────┐
                              │  CLAUDE (OPUS)    │
                              │  Primary Agent    │
                              │                   │
                              │  • Task analysis  │
                              │  • Code generation│
                              │  • File editing   │
                              │  • Git operations │
                              └─────────┬─────────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                         │
              ▼                         ▼                         ▼
    ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
    │  EXPLORE AGENT  │      │   BASH AGENT    │      │   PLAN AGENT    │
    │  (Subagent)     │      │   (Subagent)    │      │   (Subagent)    │
    │                 │      │                 │      │                 │
    │  • Codebase     │      │  • Git commands │      │  • Architecture │
    │    search       │      │  • npm/yarn     │      │    planning     │
    │  • File pattern │      │  • System ops   │      │  • Implementation│
    │    matching     │      │  • Build tasks  │      │    strategy     │
    │  • Context      │      │                 │      │                 │
    │    gathering    │      │                 │      │                 │
    └─────────────────┘      └─────────────────┘      └─────────────────┘

                              PARALLEL EXECUTION
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                         │
              ▼                         ▼                         ▼
         Read files              Run commands             Search code
         in parallel             concurrently             simultaneously
```

**Typical Session Flow:**
1. **Wake up** → Check CLAUDE.md for context
2. **User request** → Analyze scope, spawn subagents if complex
3. **Explore** → Use Explore agent for codebase understanding
4. **Implement** → Edit files, test changes
5. **Commit** → Git add, commit with descriptive message
6. **Push** → Deploy to production via Vercel
7. **Update CLAUDE.md** → Document changes for future sessions

### January 2026 Daily Highlights

**Week 1 (Jan 1-7): Foundation & Streaming Rewards**
- ✅ OGUN Staking launched
- ✅ Streaming rewards contract integration
- ✅ OAuth debugging marathon
- ✅ Batch claims fix (100-item limit)
- ✅ PiggyBank UI for listener rewards

**Week 2 (Jan 8-14): Embeds & Player**
- ✅ YouTube embeds (ALL formats: shorts, live, music, clips)
- ✅ Share link OG images
- ✅ Emote flurry animations
- ✅ NFT playlist playback
- ✅ Init script for dev environment

**Week 3 (Jan 15-21): Mobile & Decentralization**
- ✅ Mobile wallet connections
- ✅ Mobile player crash fixes (memory optimization)
- ✅ Waveform comment triggers
- ✅ Profile balance fixes
- ✅ **BITCHAT INTEGRATION** - Nostr location chat
- ✅ **SOUNDCHAIN BRIDGE APP** - iOS Nostr↔Bluetooth bridge

**Week 4 (Jan 22-28): Multi-Chain & Recovery**
- ✅ Multi-chain EVM balance viewing (5 networks)
- ✅ Video thumbnail OG previews
- ✅ NFT mint flow audit
- ✅ Form input styling overhaul
- ✅ Profile header contrast
- ✅ Stream count dedup fix
- ✅ External wallet balance fetching
- ✅ RoyaltySplitter contract
- ✅ **TDZ CRASH RECOVERY** - Production bisect debugging
- ✅ Platform fee collection (0.05% on all ops)
- ✅ Profile Tip Jar

**Week 5 (Jan 29-30): Engagement Revolution**
- ✅ **ONLINE INDICATORS** - Green dot presence
- ✅ **ACTIVITY FEED** - Social engagement tracking
- ✅ **WEB PUSH NOTIFICATIONS** - Browser alerts (FREE)
- ✅ **NOSTR NIP-17 NOTIFICATIONS** - Decentralized DMs (FREE)
- ✅ Auto-generated Nostr keypairs
- ✅ Session restore keypair generation fix
- ✅ Account settings Nostr identity display

### Stats: January 2026

| Metric | Count |
|--------|-------|
| **Commits** | 150+ |
| **Features Shipped** | 25+ |
| **Bugs Fixed** | 40+ |
| **New Services** | 8 |
| **Smart Contracts** | 2 |
| **iOS Apps** | 1 (Bridge) |
| **Networks Supported** | 6 EVM chains |
| **Notification Channels** | 3 (In-app, Push, Nostr) |
| **Cost to Users for Notifications** | $0 (FREE) |

### Key Innovations

**1. Decentralized Notification Stack**
- No SMS costs (competitors pay $0.01+ per message)
- No push service vendor lock-in
- Works even when user is offline (Nostr relays store messages)
- Privacy-preserving (NIP-17 encrypted, gift-wrapped)

**2. Multi-Wallet Architecture**
- OAuth wallets (Google, Discord, Twitch, Email)
- External wallets (MetaMask, Coinbase, WalletConnect)
- Unified balance aggregation
- Smart wallet selection for minting (bypass rate limits)

**3. WIN-WIN Streaming Rewards**
- Artists earn OGUN per stream
- Listeners earn OGUN for discovery
- 2x rewards for NFT mints
- On-chain distribution via contract

**4. Production Bisect Debugging**
- When site went down, deployed incrementally to prod
- Binary search through commits to isolate culprit
- Found TDZ bug (variable used before declaration)
- Restored 8/9 files safely, fixed root cause

### Lessons Learned

| Lesson | Context |
|--------|---------|
| **Never use variables before declaration** | TDZ crash took site down for hours |
| **Always run `yarn install` after reverts** | Stale lockfile causes invisible bugs |
| **Session restore bypasses login** | Nostr keypair wasn't generating |
| **Mobile preload="auto" kills memory** | Use "metadata" for large audio |
| **Public RPCs have rate limits** | LlamaNodes > polygon-rpc.com |
| **Cross-Origin headers break OAuth popups** | COOP/COEP must be removed |
| **Geohash precision 7 is too precise** | Use 6 for ~1km matching |

---

## HANDOFF HISTORY INDEX

| Date | Key Work | Commits |
|------|----------|---------|
| Nov 16, 2025 | Initial Claude Code integration | - |
| Dec 7, 2025 | ZetaChain contracts | - |
| Dec 22-23, 2025 | Universal Playlist, Mongoose fixes | Multiple |
| Dec 28-31, 2025 | IPFS, Waveform, OAuth | Multiple |
| Jan 1-2, 2026 | OGUN Staking, Streaming Rewards | Multiple |
| Jan 3-5, 2026 | OAuth debugging, Wallet UI | Multiple |
| Jan 6, 2026 | Session persistence, OGUN balance | 4e2f70b3f+ |
| Jan 7, 2026 | Batch claims fix, PiggyBank UI | 9d321542d |
| Jan 8, 2026 | GitBook docs | - |
| Jan 9, 2026 | YouTube embeds, all formats | fa0a9a622+ |
| Jan 10, 2026 | Share links, emote flurry | 62d6d85a0+ |
| Jan 12, 2026 | NFT playlist playback, init script | a6f6db307+ |
| Jan 18, 2026 | Mobile wallet connections | 777641a62 |
| Jan 19, 2026 | Mobile player crash fix, waveform comments, profile/balance fixes | Multiple |
| Jan 20, 2026 | Dropdown panel modals, Quick DM, Tip Jar placeholder | dd8886501 |
| Jan 21, 2026 | **Bitchat/Nostr integration** - Location chat, encrypted DMs | Multiple |
| Jan 22, 2026 | **SoundChain Bridge app**, Mobile player crash fix, Geohash precision fix | fce2b1e5f+ |
| Jan 23, 2026 | **Multi-Chain EVM Support** - Network switcher, balance viewing across chains | PR #1179, d6bc95ee2 |
| Jan 24, 2026 | **Video Thumbnail OG Previews** - Canvas frame capture for share link images | 0f264563d |
| Jan 25, 2026 | **NFT Minting Flow Diagnostic** - Full audit of mint/marketplace/ZetaChain status | - |
| Jan 25, 2026 | **Form Input White Box Fix** - Override @tailwindcss/forms for dark backgrounds | c1d132bb2, 3800eca84 |
| Jan 26, 2026 | **Remote Dev Setup** - code-server (VSCode in browser) via Cloudflare tunnel | - |
| Jan 26, 2026 | **Form Input Inner Box Fix** - Reverted to legacy bg-gray-1A styling | 9db9413e2 |
| Jan 26, 2026 | **Polygon Icon Scale Fix** - Added w-4 h-4 constraints to MaticIcon | d26409621 |
| Jan 26, 2026 | **Profile Header Contrast** - Dark backdrop + text shadows for cover images | 57caa5790 |
| Jan 26, 2026 | **View Tabs Contrast** - Dark backdrop for Feed/Dashboard/etc tabs | 3f5a71697 |
| Jan 26, 2026 | **Textarea Full Width Fix** - Force 100% width to override @tailwindcss/forms | 752358923 |
| Jan 26, 2026 | **GitBook: SCid Registry Docs** - Full technical docs for SCid system | soundchain-docs |
| Jan 27, 2026 | **Stream Count Fix** - Dedup bug fix + 30s mark logging + calibration field | c6e10857b, 0ba475f9f, edcb4bb76 |
| Jan 27, 2026 | **External Wallet Balances** - Balance fetching for all wallet types via public RPCs | 6ad2a061e |
| Jan 27, 2026 | **WalletConnect Retry** - Auto-retry with exponential backoff for mobile relay timeouts | 67482b734 |
| Jan 27, 2026 | **Reown Migration (REVERTED)** - Attempted @reown/appkit, reverted due to project ID 403 | 882b1be64→8c688ed69 |
| Jan 27, 2026 | **RoyaltySplitter Contract** - Post-mint collaborator royalty splits via EIP-2981 | soundchain-contracts 038e95b |
| Jan 28, 2026 | **External Wallet Mint Fix** - Fixed _execute() Magic-only gate for external wallets | f7fc29aca |
| Jan 28, 2026 | **SITE DOWN - TDZ Crash** - Nuclear rollback + production bisect identified `dex/[...slug].tsx` as poison pill | 7013a20c8→35428e848 |
| Jan 28, 2026 | **Bisect Recovery** - Restored 8/9 wallet files safely, reverted only culprit file | 908806d93→5912b3a3d |
| Jan 28, 2026 | Dark overlay for bio/nav tabs + track detail play count sync with SCid | 8a0c7071b, 7b5b77854 |
| Jan 29, 2026 | **GAME CHANGER: User Engagement Features** - Online Indicators, Activity Feed, Web Push Notifications | f2b1a5359, 0bfbcd989 |
| Jan 29-30, 2026 | **Decentralized Notifications Stack** - PWA prompt, Background Sync, Nostr subscriptions, auto-generated keypairs | 2c1f67e3a, 6b843c998, 861974dcc |
| Jan 30, 2026 | **🔥 WALLET-FIRST LOGIN** - VIP door for Web3 power users, WalletConnect (300+ wallets), registration flow same as OAuth | fdcae5a7e |
| Jan 30, 2026 | **🎉 OPEN SOURCE LAUNCH** - Public repo live! | - |
| Feb 10, 2026 | **Magic OAuth Fix**, Moltbook Radio Podcasts, Swarm Music Engine | b7ce93e5a |
| Feb 11, 2026 | **🚀 L2 MARKETPLACE LAUNCH** - Hero section, Token/Bundle tabs, CreateTokenListingModal, CreateBundleListingModal, L2 badges | - |

---

## DOCUMENTATION

### GitBook Docs Location
```
/Users/soundchain/soundchain-docs/
```

### Key Documentation Pages

| Page | Path | Description |
|------|------|-------------|
| **SCid Registry** | `developers/scid-registry.md` | Full SCid technical reference - format, schema, API, rewards |
| Smart Contracts | `developers/contracts.md` | Contract addresses, ABIs, functions |
| WIN-WIN Rewards | `platform/streaming-rewards.md` | Streaming rewards explanation |
| API Reference | `developers/api.md` | GraphQL API documentation |

### SCid Documentation Highlights
The `scid-registry.md` page includes:
- **SCid Format**: `SC-POL-XXXX-XXXXXX` breakdown
- **Full Schema**: All 20+ fields in SCid MongoDB record
- **Flow Diagrams**: IPFS → Token ID → SCid linking
- **WIN-WIN Rewards**: Calculation tables and rates
- **GraphQL Examples**: Query examples for SCid data
- **Smart Contract Integration**: JavaScript code samples

---

## ROADMAP

### Completed (Jan 23, 2026)
- **Multi-Chain EVM Balance Viewing**: Users can now view balances across Polygon, Ethereum, Base, Arbitrum, and Optimism
- ChainSwitcher UI component in wallet panel
- MultiChainContext for state management
- Extended blockchainNetworks.ts with all supported networks
- **PR #1179** merged, deployed to production

### Next Session Priority
- Test all OAuth wallet providers (Google, Discord, Twitch, Email)
- Verify wallet addresses created correctly per provider
- Verify POL/OGUN balance callbacks working
- Document any OAuth → blockchain callback issues

### Known Limitation: Video Post Thumbnails (Jan 24, 2026)
**Issue:** Video posts show profile picture in link previews instead of video frame
**Root Cause:** No thumbnail generated on video upload
**Current Behavior:** Falls back to profile picture (shows WHO posted, not WHAT)

**Proper Fix (IPFS/Pinata approach):**
1. **Client-side (preferred):** Capture video frame in browser canvas before upload
2. Upload both video + thumbnail to Pinata IPFS
3. Store thumbnail CID in `mediaThumbnail` field (exists in Post model)
4. Expose `mediaThumbnail` in GraphQL Post type
5. Use for OG image in posts/[id].tsx

**Implementation:**
```javascript
// Client-side thumbnail extraction before upload
const video = document.createElement('video')
video.src = URL.createObjectURL(videoFile)
video.currentTime = 1 // grab frame at 1 second
video.onloadeddata = () => {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0)
  canvas.toBlob(blob => uploadToPinata(blob)) // upload thumbnail
}
```

**Files involved:**
- `web/src/components/Post/PostFormTimeline.tsx` - Add thumbnail capture
- `api/src/models/Post.ts` - mediaThumbnail field exists
- `api/src/resolvers/PostResolver.ts` - Accept mediaThumbnail in mutation
- `web/src/pages/posts/[id].tsx` - OG image logic

### Planned: Multi-Chain OGUN Liquidity (Needs Funding/Partners)
**Status:** Roadmapped, requires liquidity funding

| Chain | Minimum LP | Gas Cost |
|-------|-----------|----------|
| Base | $5,000 | ~$0.01 |
| Arbitrum | $10,000 | ~$0.10 |
| Optimism | $10,000 | ~$0.10 |
| Ethereum | $50,000+ | ~$5-50 |

**Cheapest path:** Bridge-only approach (~$500) or Base-only LP (~$5,000)

### Planned: Solana Integration (Future)
**Status:** Roadmapped, not yet implemented

When ready to implement:
1. Install `@magic-ext/solana` package
2. Update `useMagicContext.tsx` (PROTECTED - careful!)
   - Add SolanaExtension to Magic SDK
   - Fetch Solana public key after login
3. Add `solanaWalletAddress` field to API User model
4. Update GraphQL schema for Solana address
5. Create `useSolanaBalance.ts` hook
6. Update MultiWalletAggregator to show Solana wallet card

**Key Insight:** Solana uses different address derivation - users get a SEPARATE Solana address from their EVM address.

**Package to install:**
```bash
yarn add @magic-ext/solana @solana/web3.js
```

**Env vars to add:**
```
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com
```

---

## NFT MINTING FLOW DIAGNOSTIC (Jan 25, 2026)

### Status: FUNCTIONAL on Polygon

**Full minting flow works:**
```
Upload → IPFS Pin → createEdition() → mintNftTokensToEdition() → MongoDB sync
           ↓              ↓                    ↓
        Pinata      Polygon TX          BlockchainWatcher
```

### Key Files

| Layer | File | Status |
|-------|------|--------|
| **Frontend** | `web/src/components/modals/CreateModal.tsx` | ✅ Working |
| **Blockchain Hook** | `web/src/hooks/useBlockchainV2.ts` | ✅ Working |
| **Magic Wallet** | `web/src/hooks/useMagicContext.tsx` | ✅ PROTECTED |
| **API Service** | `api/src/services/TrackService.ts` | ✅ Working |
| **Edition Service** | `api/src/services/TrackEditionService.ts` | ✅ Working |
| **SCid Rewards** | `api/src/services/SCidService.ts` | ✅ PROTECTED |
| **Contract** | `Soundchain721Editions.sol` | ✅ Deployed |

### Magic Wallet Sync: WORKING

- OAuth login → Magic creates wallet automatically
- `magicWalletAddress` stored in MongoDB user profile
- Also checks: `googleWalletAddress`, `discordWalletAddress`, `twitchWalletAddress`
- Web3 provider from Magic SDK signs all NFT transactions

### Marketplace Purchase Flow: WORKING (Polygon Only)

```
buy-now.tsx → useBlockchainV2.buyItem() → Polygon TX → BlockchainWatcher → MongoDB sync
```

**Supported payments:** MATIC + OGUN (2 of 24 tokens - others pending wallet addresses)

### ZetaChain Contracts: WRITTEN, NOT DEPLOYED

| Contract | Lines | Location | Ready |
|----------|-------|----------|-------|
| `SoundchainOmnichain.sol` | 416 | soundchain-contracts/ | ✅ Compiled |
| `SoundchainFeeCollector.sol` | 354 | soundchain-contracts/ | ✅ Compiled |
| `SoundchainNFTBridge.sol` | 424 | soundchain-contracts/ | ✅ Compiled |
| `OmnichainRouter.sol` | 651 | soundchain-contracts/ | ✅ Compiled |

**Deployment blocker:** Need real Gnosis Safe address in `.env`:
```bash
# In soundchain-contracts/.env
GNOSIS_SAFE=0x0000000000000000000000000000000000000000  # ⚠️ PLACEHOLDER - REPLACE!
```

### ZetaChain Deployment Steps

**1. Set env vars:**
```bash
cd /Users/soundchain/soundchain/soundchain-contracts
# Edit .env:
PRIVATE_KEY=<deployer_key_with_gas>
GNOSIS_SAFE=0xa117469560089210e2d298780a95ace536c59ae9  # Your vault
```

**2. Deploy order:**
```bash
# Test on testnet first
npx hardhat run scripts/deployOmnichain.ts --network amoy

# Then mainnet
npx hardhat run scripts/deployOmnichain.ts --network polygon
npx hardhat run scripts/deployOmnichain.ts --network zetachain
npx hardhat run scripts/deployOmnichain.ts --network ethereum
```

**3. After deploy, add to web/.env:**
```bash
NEXT_PUBLIC_FEE_COLLECTOR_137=0x...
NEXT_PUBLIC_OMNICHAIN_7000=0x...
NEXT_PUBLIC_NFT_BRIDGE_137=0x...
```

### Marketplace Gaps

| Gap | Impact | Fix |
|-----|--------|-----|
| CrossChainPurchase returns `null` | No omnichain buys | Deploy ZetaChain contracts |
| Only 2/24 tokens work | Limited payment options | Add token addresses to Gnosis vault |
| No escrow contracts | Race condition risk | Future improvement |

### Supported Networks (23 chains declared)

| Category | Networks |
|----------|----------|
| Layer 1 | Ethereum, Polygon, Avalanche |
| Layer 2 | Arbitrum, Optimism, Base, Blast |
| Omnichain | ZetaChain (7000) |
| Specialized | Abstract, ApeChain, Berachain, Flow, Ronin, Sei, Zora, + more |

### Token Support Status

**Working (2):** MATIC, OGUN
**Declared (22 more):** PENGU, ETH, USDC, USDT, SOL, BNB, DOGE, BONK, MEATEOR, PEPE, BASE, XTZ, AVAX, SHIB, XRP, SUI, HBAR, LINK, LTC, ZETA, BTC, YZY

**Blocker:** Need wallet addresses for remaining 22 tokens in Gnosis vault

### Quick Wins

1. ✅ Test Polygon mint now - flow is complete
2. Add Gnosis Safe address to deployment config
3. Deploy to Amoy testnet first before mainnet
4. Add remaining 22 token addresses as gathered

---

## QUICK REFERENCE

### API Location
**NOT in soundchain-agent!** API is at: `/Users/soundchain/soundchain/api`

### Key Directories
```
/Users/soundchain/soundchain/web       # Frontend
/Users/soundchain/soundchain/api       # Backend API
/Users/soundchain/soundchain-agent     # Agent/handoffs
/Users/soundchain/soundchain-contracts # Smart contracts
/Users/soundchain/soundchain-docs      # GitBook docs
```

### MATIC to POL
Legacy code references "MATIC" but Polygon's native token is now "POL". Update references when integrating.

---

## MOLTBOOK INTEGRATION (Feb 5, 2026)

### What is Moltbook?
**The social network for AI agents.** Agents can post, comment, upvote, follow each other, and create communities.

### API Reference
```
Base URL: https://www.moltbook.com/api/v1
Auth: Bearer token in Authorization header

Key Endpoints:
- POST /agents/register - Register new agent (returns API key)
- GET /posts - Fetch posts (sort: hot, new, top, rising)
- POST /posts - Create post
- GET /search?q={query} - AI-powered semantic search
- POST /agents/{name}/follow - Follow agent
- GET /feed - Personalized feed
- GET /agents/me - Your profile

Rate Limits:
- 100 req/min global
- 1 post/30 min
- 50 comments/day

Credentials: ~/.config/moltbook/credentials.json
```

### SoundChain Agent Gateway (In Progress)
Building agent-friendly API at `/api/agent/*` for Moltbook agents to:
- Browse SoundChain feed without OAuth
- Search tracks and artists
- React to posts with agent token
- Discover trending music

**Agent skill file:** `https://soundchain.fm/skill.md`

### Concept: "90s Mall for AI Agents"
SoundChain as a social destination where Moltbook agents hang out, discover music, interact with feeds - like a virtual mall experience.

---

*This document consolidates all handoff knowledge. Update as new lessons are learned.*
