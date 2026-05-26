# CLAUDE.md - SoundChain Development Guide

## 🧱 SESSION: May 25, 2026 (Frank → Sarg, autonomous) — /NODES + /WALL GRID/LIST VIEW-TOGGLE PILLS RESTORED + MINT-STYLE CARD STACK (`b98e2e0`, +149/-70, 3 files)

Frank: *"claude im biticing on nodes ns wall the grid pills for different view options is miaaing neae the conpose nav bar/line on far right where it used to be . list view is current view on feed in nodes and wall bug grid minimizes all posts to cards stacked but im loving how the cards render and stack on mint.soundchain.io. once you gather the missing pills icons for grid and list view for nodes/feed and wall/posts lets have them stack like mint.soundchain.io stacks em we need that look to rival IG and fb and X etc"*.

### Root causes (two surfaces, two distinct gaps)

| Surface | Pre-ship state | Why |
|---|---|---|
| `/nodes` (`web/src/pages/nodes.tsx`) | NO view-toggle pills, list-only feed via inline `<Post>` loop. | Never wired. `<Posts>` (which supports `viewMode` since `f02591c`) was never imported here — /nodes ships its own `/api/feed/posts` pipeline, not Apollo. |
| `/users/[handle]` wall (`web/src/pages/dex/[...slug].tsx`) | Pills exist at `:3254-3260`, but inside the `MainPillNav` flex row w/ no overflow-x / no flex-shrink protection. On mobile, MainPillNav's nav pills push the toggle off-screen since the row is `flex items-center gap-1.5` (no wrap, no overflow gate). |

The mint marketplace look Frank wants comes from `mint/src/pages/marketplace.tsx:588,665`: `grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2` w/ `aspect-[3/4]` NftChip cards. Web's existing Posts grid path used a virtualized react-window `FixedSizeGrid` w/ 2-5 cols — fine for density but the virtualization gates load-more on parent scroll height, and cells were sized at `columnWidth + 60` (square media + fat footer) → not the tight portrait stack of mint.

### What shipped (`b98e2e0`, +149/-70, 3 files)

**1. `web/src/pages/nodes.tsx`** (+50/-25)
- Imported `CompactPost` + `LayoutGrid` + `List as ListIcon` from lucide-react
- New `feedViewMode` state (`'list' | 'grid'`, default `'list'`)
- Compose row at line 570 became `flex items-center gap-2`: composer button (`flex-1`) on left, view-toggle pill cluster (`flex-shrink-0`) on right. Pills sit inside a `rounded-lg border border-white/5 bg-black/40 p-0.5` capsule — visually grouped, always visible regardless of compose state
- Feed render branched: `feedViewMode === 'grid'` uses `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 sm:gap-2` w/ `<CompactPost>`; otherwise inline `<Post>` list
- Skeleton + empty state + load-more button all gate on `col-span-full` when grid is active (no row-collapse artifacts)
- Compose box no longer wraps the toggle (so guests still see pills + can browse cards)

**2. `web/src/components/Post/Posts.tsx`** (+38/-52)
- Grid branch dropped FixedSizeGrid + AutoSizer + InfiniteLoader entirely → native CSS grid w/ same mint columns (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 sm:gap-2`)
- IntersectionObserver auto-load-more effect now fires when `useSimpleMode || viewMode === 'grid'` (previously simple-mode only)
- List branch unchanged — still virtualized via react-window VariableSizeList for long feeds where post heights vary wildly

**3. `web/src/pages/dex/[...slug].tsx`** (+46/-1, no removals)
- Two new pill rows added near where Posts actually renders:
  - Above `MemoizedFeedPosts` inside the `selectedView === 'feed'` branch (`:4118`)
  - Above `MemoizedMyFeedPosts` inside the `profileTab === 'myfeed'` branch (`:8128`)
- Both use the same pill capsule grammar as /nodes for consistency (rounded-lg border bg-black/40 p-0.5)
- Upstream MainPillNav pills kept — these new ones are duplication, not replacement, so the toggle is reachable from two locations on the wall

### Architecture decisions (load-bearing)

1. **Don't rewire /nodes feed through Apollo `<Posts>`** — /nodes already has a working `/api/feed/posts` Vercel-direct pipeline w/ `feedNodes`. Adding `<Posts>` would mean Apollo-only re-render path + duplicate fetches. Instead /nodes imports `CompactPost` and uses its own `feedNodes` data directly.
2. **Native CSS grid > FixedSizeGrid for mint-style stack.** Virtualization buys very little when card heights are fixed by aspect ratio and feed length is typically <200. CSS grid renders crisper, scrolls naturally, and matches mint visually 1:1.
3. **Duplicate the pills near the feed start, don't move them.** Some users navigate via the upstream MainPillNav row; moving the pills would break that. Adding a second instance is cheap (8 lines per surface) and guarantees mobile visibility.
4. **Same pill capsule grammar across /nodes + /wall feed + /wall myfeed.** `rounded-lg border border-white/5 bg-black/40 p-0.5` → inner buttons `p-1.5 rounded-md`. Visually identical so users learn the affordance once.
5. **Skeleton + empty state get `col-span-full` when grid active.** Otherwise grid behavior treats them as single-cell items and the layout collapses to a 1-col strip.
6. **CompactPost not modified.** Its grid card already uses `aspect-square` media + tight footer w/ avatar + reactions/comments/share. The dense columns + `gap-1.5` parent give the mint stack feel without touching the card itself.

### Build + deploy

- `yarn build` 81.88s clean, all routes prerendered, shared FLJ 718 kB unchanged
- Pushed `b98e2e0` to main → Vercel webhook auto-deploy (Bug #27 fix from May 13 still holding on web/)
- Verified `https://soundchain.io/nodes` HTTP 200, `last-modified: Tue, 26 May 2026 05:58:59 GMT`, `age: 0` after the build promoted

### Verify path (Frank → Sarg post-deploy)

1. Hard-refresh `https://soundchain.io/nodes` → far right of the COMPOSE POST row → see [LIST][GRID] pill capsule
2. Default = list view (inline `<Post>` w/ media)
3. Tap GRID pill → feed re-renders as dense card stack (2 cols mobile, 3-5 desktop) matching `mint.soundchain.io/marketplace`
4. Tap LIST pill → back to full-detail posts
5. Hard-refresh `https://soundchain.io/users/<handle>?view=feed` → above feed list → same [LIST][GRID] pill capsule, identical behavior
6. Same on `/users/<own-handle>?view=profile&tab=myfeed` → pill capsule above MemoizedMyFeedPosts
7. Cross-check: pills in the upstream MainPillNav row on the wall (`:3254`) ALSO still work — both locations toggle the same `viewMode` state, no orphan UI

### Lessons

1. **"It's not wired up" vs "it's wired but broken" are different bugs.** /nodes was never wired — adding /nodes pills meant new state + new render branch. The wall was wired but visually buried — adding wall pills meant duplicating an existing toggle into a more reachable spot. Diagnose which class before reaching for the same fix.
2. **Native CSS grid is the right answer for fixed-aspect card stacks.** FixedSizeGrid existed because someone optimistically reached for virtualization; in practice mint proves the dense CSS grid is fast enough + visually superior + much less code (50% reduction in Posts.tsx grid branch).
3. **Don't unify two render pipelines mid-ship.** /nodes uses /api/feed/posts (Vercel-direct), the wall uses Apollo Posts. Refactoring /nodes to use Apollo would have been a 200-line ship that ALSO needed to verify the Apollo posts path post-Phase 7e Lambda eviction. Importing `CompactPost` directly = 5-line bridge.
4. **Duplicate ≠ drift when both call the same state setter.** Both wall pill instances call `setViewMode` on the same useState. No source-of-truth split, no sync bug surface. Cheap duplication is fine when it preserves UX consistency.

### Open follow-ups (next session)

- Frank iPhone verify both surfaces — confirm pills visible + grid stack matches mint vibes
- If wall pill duplication feels redundant, can drop the upstream MainPillNav-adjacent pair (`dex/[...slug].tsx:3254-3260`) in a follow-up cleanup
- CompactPost grid card could optionally be tightened (less rounded, more mint-NftChip-like crisp edges) if Frank wants tighter visual parity — current ship keeps existing card design + just stacks denser
- `api.soundchain.io` AWS Console TLS bridge repair — Frank's hands needed (unchanged from May 17/19)

---

## 🚨 OPEN FOLLOW-UP (Frank-tasked, May 17, 2026) — `api.soundchain.io` custom-domain bridge DOWN

**Frank's hands needed (AWS Console).** Lambda + API Gateway are healthy — DNS resolves to `d-bb15gwni7a.execute-api.us-east-1.amazonaws.com` and the underlying API GW URL responds in 154ms — but TLS connections to `api.soundchain.io` time out after 8s. Custom-domain → API Gateway mapping is broken at the TLS layer (likely ACM cert detached / custom domain mapping removed / wrong stage binding). Check API Gateway → Custom domain names → `api.soundchain.io`, verify ACM cert `d802632a-515a-44a2-984d-371741e03d71` is attached, re-map to `production-soundchain-api` stage `production` if missing. Playbook in CLAUDE.md "AWS INFRASTRUCTURE" section. **NOT blocking auth post `9ccf9bf` (useMe now reads /api/me direct → Atlas)** — but every remaining Apollo query in the app (posts, comments, feed enrichment, reactions, marketplace metadata) is silently failing while this is down. Phase 7e Apollo strip is the proper long-term fix; api.soundchain.io repair is the short-term unblock.

---

## 🏀 SESSION: May 19, 2026 (Frank → Sarg) — PHASE 16.49: T-POSE BUG FINALLY FIXED (commit `5926028`)

Frank tested Phase 16.48 (`db50c12`) and reported every action pill (SHOOT/DUNK/LAYUP/FADEAWAY/REBOUND/BLOCK/PASS/CROSSOVER/JABSTEP/PUMPFAKE) still rendering as T-pose. *"claude tge player still ahoots and does all the action pills on roght sode all in T body formationz"*. Then: *"i dod a screen revording i will share shortylwhen i get home"*. Phase 16.49 is the THIRD fix attempt across two days and the first one that's mathematically correct.

### Root cause (third diagnostic round)

`THREE.AnimationUtils.makeClipAdditive` computes per-frame additive values as `q_value × q_referenceFrame⁻¹` (verified by reading `web/node_modules/three/src/animation/AnimationUtils.js:288-315`). With Phase 16.42's `bindQuat × delta` keyframes still in place:

- `q_value_N = bindQuat × deltaN`
- `q_ref = bindQuat` (frame 0)
- `additive_N = (bindQuat × deltaN) × bindQuat⁻¹` — **NOT** equal to `deltaN`

At additive playback: `q_final = q_base × additive_N = q_base × bindQuat × deltaN × bindQuat⁻¹` — wrong rotation axis, wrong magnitude. Visual symptom: arms locked near T-pose with subtle wiggles instead of executing the actual shooting motion.

### What shipped (`5926028`, +15 / -14, 1 file: GalleryRoom3D.tsx)

`quatTrack` at `GalleryRoom3D.tsx:1916-1929` stripped of `bindQuat` composition:

```ts
// Phase 16.49 — RAW DELTA quats (no bindQuat composition)
const quatTrack = (bonePath, times, eulers) => {
  if (!bonePath) return null
  const flat = new Float32Array(times.length * 4)
  for (let i = 0; i < eulers.length; i++) {
    _e.set(eulers[i][0] || 0, eulers[i][1] || 0, eulers[i][2] || 0)
    _q.setFromEuler(_e)
    flat[i*4] = _q.x; flat[i*4+1] = _q.y; flat[i*4+2] = _q.z; flat[i*4+3] = _q.w
  }
  return new THREE.QuaternionKeyframeTrack(`${bonePath}.quaternion`, times, flat)
}
```

Frame 0 = identity quat (Euler `[0,0,0]`). `makeClipAdditive` leaves frame 0 as identity = zero contribution at clip start. Middle frames = pure deltas. Additive playback: `q_final = q_base × q_delta` = arm rotates from idle position (arms at sides) by `q_delta` and back to idle at clip end. Removed `_qBind` + `_qDelta` allocations — `quatTrack` is simpler and faster.

### Architecture (load-bearing — don't ship Phase 16.50 that re-adds bind composition)

1. **Mixamo XBot GLB bind pose IS T-pose at the shoulders.** Every Mixamo character is authored with arms-out as the bind. `bone.quaternion` at GLTF load captures T-pose rotation, not arms-at-sides. The "arms at sides" pose is what the IDLE animation produces, not the bind.
2. **Raw deltas + additive = correct.** Idle drives the base pose. Authored shoot clip adds rotation delta on top via `q_base × q_delta`. Result: arm rotates from wherever idle has it to wherever delta takes it.
3. **`bindQuat × delta + additive` = mathematically WRONG.** `makeClipAdditive`'s quaternion subtraction doesn't unwind the bind multiplication cleanly. Don't try to "be smart" by composing on bind — three.js's engine does that for you via the base layer.
4. **`bindQuat × delta + REPLACE` (Phase 16.42 / 16.43) = also broken.** Frame 0 = bindQuat = T-pose, so every move SNAPS to T-pose at clip start before applying deltas.
5. **The captured `bindQuat` is now unused.** Removed for clarity + microperf.

### Phase arc (the painful path)

| Phase | Commit | What it tried | Why it didn't work |
|---|---|---|---|
| 16.42 | `3b8f68d` | `bindQuat × delta` + REPLACE crossfade | Frame 0 = T-pose snap on every gesture |
| 16.43 | `4a4ac3c` | Denser Kobe keyframes on top of 16.42 | Polish on broken foundation = polished broken |
| 16.44 | `4d59b82` | Fans + crowd cheer (unrelated to player anim) | Independent ship, didn't surface or fix T-pose |
| 16.48 | `db50c12` | Switch to additive blending, keep bind keyframes | Math: `(bindQuat × delta) × bindQuat⁻¹` ≠ delta |
| **16.49** | **`5926028`** | **Strip bind composition + keep additive** | **Frame 0 = identity, deltas apply cleanly via `q_base × q_delta`** |

### Build + deploy

- `yarn build` 84.29s clean
- Pushed `5926028` to `main` → Vercel webhook auto-deploys (Bug #27 fix from May 13 still holding on web/)

### Verify path (Frank → Sarg post-deploy)

1. Hard-refresh `https://soundchain.io/gallery3d?theme=gym`
2. Tap SHOOT → arm rotates from idle (arms at sides) UP overhead and back down. Ball releases at the peak.
3. Same test on DUNK / LAYUP / FADEAWAY / REBOUND / BLOCK / PASS / CROSSOVER / JABSTEP / PUMPFAKE / DEFENSE — all should rotate from idle through their authored gesture and back.
4. Frank's pending iPhone screen recording will confirm cross-device.

### Lessons

1. **Three.js animation math doesn't commute.** Quaternion multiplication order matters at every layer (keyframe authoring, makeClipAdditive subtraction, additive playback composition). Verify the math symbolically before shipping a fix — `q_final = q_base × additive` only equals `q_base × delta` when `additive = delta`. If your additive value has bind quats baked in, the bind quats appear in `q_final` too.
2. **Verify against the ACTUAL three.js source, not assumed behavior.** Phase 16.48 assumed `makeClipAdditive` would produce the right additive values "somehow." Reading the source revealed exactly the multiplication order — and made the bind composition asymmetry visible.
3. **Frank's screen recording is the right verification tool.** Three failed fix-and-ship cycles burned more time than a 30-second recording would have. Default to "screen recording first, fix second" when the bug is visual and the spec is ambiguous.
4. **A "fix" shipped + verified by intuition is not actually verified.** Phase 16.48's commit message claimed success based on the additive hypothesis, not on Frank actually playing the gym. Sarg memory + `[[feedback_threejs_additive_for_layered_anims]]` now reflect that 16.48 was incomplete and 16.49 is the actual fix.

### Open follow-ups

- **`api.soundchain.io` custom-domain TLS bridge repair** — Frank's hands needed (AWS Console). Pinned top of CLAUDE.md.
- **Anvil RTX 5000 + Mixamo retarget** — banked behind AWS Console + `NORMAN_URL`. Replaces today's hand-keyframed gestures with proper NBA-rigged retargets.
- **TripoSR mesh on court (Phase 16.50)** — auto-rig Frank's CharacterDesigner output to XBot skeleton via Mixamo Auto-Rigger API.
- **WebRTC peer-sync for 1-on-1 arena matchups** — single-player gym dialed; 2-player is next frontier.

---


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


---

*Architecture reference, bug history, AWS/dev/embed/marketplace/CI/CD docs, and ROADMAP have all rotated to `/Users/soundchain/claude-booklet.md` to keep CLAUDE.md under 40k chars. Search the booklet by section header when you need them.*
