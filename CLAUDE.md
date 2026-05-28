# CLAUDE.md - SoundChain Development Guide

## 📱 SESSION: May 27, 2026 (Frank → Sarg, autonomous, late) — LUCY GOES NATIVE: CAPACITOR SHELL + PWA / APP-STORE READY (recovery after mid-flight disconnect)

Frank: *"claude we git disconnected during mid flight i didnt get to copy the chat!! ... can you see scope the current tasks it was related to shipping lucy compacitors configs etc for pwa and apple store ready"*.

A prior session had started turning `lucy/` (lucy.soundchain.io) into BOTH an installable PWA and a native iOS/Android Capacitor shell — the "droid in your palm" — then dropped the tunnel mid-ship. Reconstructed from the uncommitted working tree and finished the punch list.

### Posture — remote-load thin shell (matches web/arena/mint)

The native app is a thin WKWebView pointed at live `lucy.soundchain.io` (`server.url` in `capacitor.config.ts`). Content updates ship instantly, no App Store review cycle. The native layer ONLY adds device superpowers Lucy needs to be an agent: camera (eyes), push (reach out), haptics (body), status/splash/keyboard UX. `webDir = 'native-shell'` (a cyan-orb "waking up" offline splash) because Lucy has load-bearing API routes (`/api/chat → norman`, `/api/tools`) that can't be statically exported.

### What was already in the tree (prior session, uncommitted)

- `lucy/capacitor.config.ts` — appId `io.soundchain.lucy`, remote-load `server.url`, iOS/Android tuning, plugin config (SplashScreen/StatusBar/Push/Keyboard/App), iOS Info.plist usage-string notes in header comment.
- `lucy/src/lib/nativeBridge.ts` — `initNativeShell()` (statusbar + splash-hide + back-button + push registration→`/api/tools`), `captureEyes()` (native Camera w/ web getUserMedia fallback), `haptic()`. ALL `Capacitor.isNativePlatform()`-gated; plugins dynamically imported so the web bundle stays lean.
- `lucy/native-shell/index.html` — offline splash fallback (the `webDir`).
- `package.json` — 11 `@capacitor/*` runtime plugins + ios/android/cli dev deps + `cap:sync`/`cap:add:ios`/`cap:add:android`/etc scripts. `node_modules` already had all 14 packages installed.
- `_app.tsx` — calls `initNativeShell()` on mount (no-op in a normal browser tab).

### What I added to finish PWA + App-Store readiness

1. **App icons + splash (programmatic, on-brand).** No Lucy logo asset existed, so generated the brand orb from the splash CSS: cyan radial-gradient sphere + specular highlight + "LUCY" wordmark on `#05070d`. Source SVGs in `lucy/resources/` (`icon.svg`, `icon-maskable.svg`, `splash.svg`) → rasterized via `rsvg-convert` to `icon.png` (1024) + `icon-maskable-1024.png` + `splash.png` (2732). The 1024/2732 sources are the inputs `@capacitor/assets` will consume to generate all native iOS/Android icon+splash sizes once platforms are added.
2. **PWA icon set** in `lucy/public/icons/` derived via `sips`: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (orb-only, safe-zone centered), `apple-touch-icon.png` (180), `favicon-32/16.png`. `public/favicon.ico` multi-size via `magick`.
3. **`lucy/public/manifest.webmanifest`** — name/short_name, `display: standalone`, `orientation: portrait`, `theme_color`+`background_color` `#05070d`, the 3-icon set (192 any / 512 any / 512 maskable), `id`/`start_url`/`scope` `/`.
4. **`_document.tsx`** — `<link rel="manifest">` + `apple-mobile-web-app-capable` + `apple-mobile-web-app-status-bar-style: black-translucent` + `apple-mobile-web-app-title` + `apple-touch-icon` + favicon links.
5. **`index.tsx` Head** — `viewport-fit=cover` so the standalone PWA / WKWebView respects the notch + safe-area insets (`capacitor.config.ts` already sets `contentInset: 'always'`).

### Build + deploy

- `yarn build` (lucy/) 6.33s clean. Home `/` 13.7 kB / 97.7 kB first-load; `_app` chunk 4 kB (nativeBridge import). `@capacitor/core` adds ~1 kB to the static path — all plugins dynamically imported, off the critical path.
- Pushed to `main` → Vercel webhook auto-deploys lucy (`soundchain-lucy` project, May 20 provisioning).

### Verify path (Frank → Sarg post-deploy)

1. iOS Safari `https://lucy.soundchain.io` → Share → **Add to Home Screen** → icon = cyan Lucy orb, opens standalone (no Safari chrome), dark status bar, splash on launch.
2. Android Chrome → install prompt / ⋮ → **Install app** → maskable orb icon in launcher, standalone.
3. Lighthouse PWA audit on lucy.soundchain.io → installable (manifest + icons + HTTPS) passes.
4. DevTools → Application → Manifest → all 3 icons resolve, no errors.

### Native build = Frank's Mac (deferred, needs Xcode / Android Studio)

`npx cap add ios` + `npx cap add android` generate the native Xcode/Studio projects (NOT committed — generated, platform-specific). Then `npx cap sync`. iOS Info.plist needs the camera/mic/photo usage strings documented in the `capacitor.config.ts` header. `@capacitor/assets` (add as needed) consumes `resources/icon.png` + `resources/splash.png` to fill all native sizes. Because of remote-load posture, the shell is thin — most iteration stays on the web deploy.

### Lessons

1. **Recover from the working tree, not memory.** A mid-flight disconnect leaves the actual artifacts on disk. `git status` + reading the uncommitted files reconstructed the exact task faster + more accurately than guessing from chat fragments.
2. **Programmatic brand icons beat blocking on a design asset.** The splash CSS already defined the Lucy orb; rasterizing an SVG of it (rsvg-convert → sips → magick) produced a clean, consistent icon set across PWA + native without waiting for a logo handoff.
3. **Remote-load Capacitor = one source of truth.** The same lucy.soundchain.io bundle runs in browser, PWA, and native shell. nativeBridge gates every superpower on `isNativePlatform()` so the web path is byte-for-byte untouched.
4. **Generated native projects don't belong in git.** `cap add ios/android` output is platform tooling, regenerable from `capacitor.config.ts` + `resources/`. Commit the config + source art; let the native projects be local/CI artifacts.

### Open follow-ups (unchanged + new)

- **NEW: `npx cap add ios/android` + `@capacitor/assets`** on Frank's Mac w/ Xcode — generate native projects, fill icon/splash sizes, set Info.plist usage strings, archive for TestFlight.
- lucy.soundchain.io CNAME at name.com → `cname.vercel-dns.com` — Frank's hands (still pending; PWA install needs the live HTTPS domain).
- `api.soundchain.io` AWS Console TLS bridge repair — Frank's hands (pinned).
- Vendor secret rotation: Magic + MongoDB on retired cluster + Pinata + 4 X API + Vercel OIDC.

---

## 🎨 SESSION: May 27, 2026 (Frank → Sarg, autonomous, evening) — UI/UX LOOSE-ENDS PASS: GALLERY3D → PROFILE TAB, EXPLORE3D + LAND PILLS GHOSTED, UTILITY PILL COLORING, /NODES FEED HEADER TIGHTENED (4 files)

Frank: *"claude im on sarg and im noticing the work today is looking good . were cleaning uo loose ends on the yi/ux especially on nodes. the gallery3d should be moved to profile tab /wall oage for each users profile oages so when others land on the profile/wall they can explore their gallery. explore3d and landatlas havent been really used and the rest of the pills need coloring its missing that coloring. im wondering if we should ghost the land atlas and wxplore3d for now off soundchains site cause its nog being used at all... i dont want to delete explore3d and landatlas jist hhost yhem and the pills crom the wnyire site for now. ... can we bump ip where it shows(feed" above the stories and rewls and tighen uo that space to be right under the nav bar with profile nodes wtc. i want a tight look here"*.

Four atomic UI cleanups in one ship, flow-steps autonomous, build clean 71.97s.

### Ship 1 — Gallery 3D embedded as a `/wall` profile tab (`web/src/pages/dex/[...slug].tsx`, +29/-3)

NFT/SCid gallery walks now live where visitors actually land (the profile/wall page) instead of buried behind the `/gallery3d` standalone URL. Anyone on `/users/<handle>` taps the new yellow **Gallery 3D** tab between Wall and Posts → `<GalleryRoom3D ownerHandle ownerProfileId theme="cyberpunk" />` mounts in-place with `h-[calc(100vh-280px)] min-h-[420px]` framed by `border border-yellow-500/10 rounded-lg`. Standalone `/gallery3d` route stays for power users + the existing `wallAudioPlaylist` deep-link flow.

- `profileTab` union expanded: `'myfeed' | 'posts' | 'music' | 'shop' | 'playlists' | 'wall' | 'gallery3d' | 'generate'`
- Default-tab effect now honors `?tab=gallery3d` (and any other valid tab slug) for deep-links from search/profile previews
- Dynamic import w/ skeleton loader (yellow LOADING THE GALLERY) — three.js bundle stays out of the initial profile-page payload
- Theme defaults to `cyberpunk` (matches `/gallery3d` default); future enhancement: per-profile gallery theme persisted to `viewingProfile`

### Ship 2 — `/explore3d` + `/land` (Land Atlas) pills ghosted from MainPillNav (`web/src/components/MainPillNav.tsx`, +4/-2 active items, +2 commented)

Both routes stay live and reachable by direct URL — Frank's directive: *"i dont want to delete explore3d and landatlas jist hhost yhem"*. Pills are commented (not deleted) in the items array so restoring them is uncommenting two lines. Removed unused `Globe2` + `Map` imports from lucide-react.

### Ship 3 — All utility pills now have distinct color accents (`web/src/components/MainPillNav.tsx`, palette expanded)

Pre-ship: Profile/Nodes/Explore/Users/Library/Playlists/Archive all rendered with the same `neutral` (gray) accent. Visitors couldn't tell utility pills apart from the page chrome. Post-ship: every pill has its own tailwind color w/ matching active glow + idle hover state:

| Pill | Accent | Active glow |
|---|---|---|
| Profile | sky | `rgba(56,189,248,0.25)` |
| Nodes | cyan | `rgba(34,211,238,0.25)` |
| Arena | red (unchanged) | `rgba(248,113,113,0.25)` |
| Gallery 3D | violet (unchanged) | `rgba(167,139,250,0.25)` |
| Radio | orange (unchanged) | `rgba(251,146,60,0.25)` |
| Explore | emerald | `rgba(52,211,153,0.25)` |
| Users | pink | `rgba(244,114,182,0.25)` |
| Library | amber | `rgba(251,191,36,0.25)` |
| Playlists | fuchsia | `rgba(232,121,249,0.25)` |
| Archive | lime | `rgba(163,230,53,0.25)` |

`Accent` union widened to add `sky | pink | emerald | amber | fuchsia`. `ACCENT_ACTIVE` + `ACCENT_IDLE` records match.

### Ship 4 — `/nodes` feed header tightened: FEED label sits flush under MainPillNav (`web/src/pages/nodes.tsx`, +6/-6)

Pre-ship: outer wrapper had `py-4 space-y-4` → 16px top padding + 16px gaps between stats row → split layout → FEED → StoriesBar. Felt loose and the FEED label appeared too far below the pill nav.

Post-ship: `py-4 space-y-4` → `pt-1 pb-4 space-y-2` shrinks the top buffer by 12px + halves stack gaps. Inside the feed column: replaced the previous `flex items-center justify-between mb-2` FEED header wrapper with a simpler `flex items-center gap-2 px-3 sm:px-0` row — same Activity icon + cyan FEED label + post count, but no surplus container padding above StoriesBar. Inner feed column gap also dropped `space-y-2` → `space-y-1.5`.

Net: on mobile (feed view), DexNavBar → MainPillNav → ~4px gap → **FEED label** → StoriesBar (24hr reels) → compose row → posts. Matches Frank's spec: *"i want a tight look here"*.

### Build + deploy

- `yarn build` 71.97s clean, shared FLJ 718 kB unchanged.
- Files changed: `MainPillNav.tsx`, `nodes.tsx`, `dex/[...slug].tsx`, `CLAUDE.md`. Stale service worker file rotation also folded in (`worker-7Vc...js` → `worker-zPc...js`).
- Pushed to `main` → Vercel webhook auto-deploy (Bug #27 fix from May 13 still holding on web/).

### Verify path (Frank → Sarg post-deploy)

1. Hard-refresh `https://soundchain.io/nodes` → MainPillNav row no longer shows **Explore 3D** or **Land Atlas** pills. Visible pills: Profile (sky), Nodes (cyan, active), Arena (red), Gallery 3D (violet), Radio (orange), Explore (emerald), Users (pink), Library (amber), Playlists (fuchsia), Archive (lime). Every pill has its own color.
2. Same `/nodes` page → FEED label appears immediately under the MainPillNav row (gap reduced by ~16-20px) with StoriesBar directly beneath. No empty band between nav and feed start.
3. Hard-refresh `https://soundchain.io/users/<any-handle>` → tab strip shows Wall (orange) → **Gallery 3D (yellow, NEW)** → Posts (green) → Music (purple) → Shop (amber) → Playlists (pink). Tap Gallery 3D → 3D NFT gallery mounts in-place with cyberpunk theme.
4. Deep-link `https://soundchain.io/users/<handle>?tab=gallery3d` from a fresh tab → lands on the Gallery 3D tab immediately.
5. Direct URLs `/explore3d` + `/land` still load (ghost, not delete) — confirm they 200 even though no pill points at them anymore.
6. Cross-check `/gallery3d` standalone route still works (used by mint card "View in 3D Gallery" affordances, wallAudioPlaylist).

### Architecture decisions (load-bearing)

1. **Comment, don't delete, ghost pills.** Frank explicitly said *"ghost not delete"* — commented entries in items array preserve provenance, history, and a 5-second restore path if user behavior changes. Removing the lines would lose the accent assignment + icon import context.
2. **Default Gallery 3D theme = `cyberpunk`.** Matches `/gallery3d` default. Per-profile theme persistence is a future enhancement (would need a `galleryTheme` field on Profile); shipping cyberpunk-only avoids a schema migration mid-cleanup.
3. **`?tab=` honored in addition to `?wall=`.** The wall-postId deep-link path is preserved (still defaults to Wall when present), but new `?tab=gallery3d` overrides the default for shareable gallery-walk links.
4. **Tight spacing on /nodes, not on /wall.** Wall has multi-row Cover + Avatar + Bio chrome before the tab strip, so tightening the tab→content gap there would actually feel cramped. The fix is /nodes-specific because /nodes is a single-purpose feed surface.
5. **Sky for Profile (not neutral).** Profile is a user's primary destination on the platform — it should read as a feature pill, not chrome. Sky is distinct from cyan (Nodes) but close enough in temperature to feel like a sibling.

### Lessons

1. **Ghost > delete > re-add.** When a feature is "not pulling weight," Frank's pattern is to hide its entry points first and watch what users do. The page-level code is cheap to keep around; the nav real-estate is what costs attention.
2. **Color is recognition.** The pre-ship MainPillNav had 7 of 12 pills rendering as identical `neutral` chrome. Co-workers (Frank's words from older session) couldn't tell features apart. Distinct accents = distinct destinations.
3. **Embed-in-place beats teleport-out.** Moving Gallery 3D into the Wall tab means visitors don't lose their profile context (cover, avatar, bio, music, posts) to walk through a 3D room. The standalone `/gallery3d` route stays for direct-link / immersive use; the Wall tab is for casual discovery.
4. **Tight = removed padding, not removed elements.** The fix for "I want a tight look" was reducing top padding from `py-4` to `pt-1` and inner gaps from `space-y-4` to `space-y-2` — same elements, less air. Adding new layout would have introduced bugs without solving the felt-experience complaint.
5. **`useEffect` dependency arrays widen when adding URL-derived state.** Adding `router.query.tab` to the default-tab effect means in-page nav (`router.push('?tab=gallery3d', undefined, { shallow: true })`) will re-fire the effect and swap profileTab — same pattern as May 27 AM's `mobileTab` URL-sync fix on /nodes.

### Open follow-ups (unchanged from May 27 AM)

- `api.soundchain.io` AWS Console TLS bridge repair — Frank's hands (pinned).
- lucy.soundchain.io CNAME at name.com → `cname.vercel-dns.com` — Frank's hands.
- Vendor secret rotation: Magic + MongoDB on retired cluster + Pinata + 4 X API + Vercel OIDC.
- Anvil RTX 5000 + Mixamo retarget for Phase 16.50.
- WebRTC peer-sync for 1-on-1 arena gym matchups.
- Per-profile Gallery 3D theme persistence (Profile schema field + theme picker inside the embedded gallery).

---

## 🧹 SESSION: May 27, 2026 (Frank → Sarg, autonomous) — /NODES MOBILE UI CLEANUP: PILLS RETIRED + NETWORK MOVES TO AVATAR DROPDOWN (`a7dbea8`, 2 files)

Frank: *"claud exan u remove (pills tabs network and feed as well from nodes im cleabing up the ui, on desktop it already shows bith whichnis great bu mobile we remove both pills and move network to avatar menu dropdown thats where it will be in its new home on mobile. and feed will be defualt page on mobile when landing on nodes use automomous flow steps"*.

### What changed

Mobile `/nodes` no longer renders the `[NETWORK] [FEED]` toggle pill row. Feed is the unconditional mobile landing. Network moved into the avatar dropdown (Quick nav, between Inbox and Mint NFT) as a `lg:hidden` link to `/nodes?tab=network`. Desktop split layout untouched — already shows both columns side-by-side, so the dropdown entry is hidden there too (no redundant nav).

### Files touched

**`web/src/pages/nodes.tsx`**
- Deleted the mobile pill toggle row (was at `:250-257`).
- `mobileTab` useState initializer simplified: only opt-in to `'network'` when URL has `?tab=network`; everything else defaults to `'feed'`.
- New `useEffect(() => { ... }, [router.query?.tab])` syncs `mobileTab` from URL changes. Required because Next.js shallow nav from the avatar dropdown (when already on /nodes) doesn't remount the page — the useState initializer runs only once at mount.

**`web/src/components/DexNavBar.tsx`**
- Added `Network as NetworkIcon` to the lucide-react import block.
- New `<Link href="/nodes?tab=network">` entry in the avatar dropdown's Quick nav, between Inbox and Mint NFT, marked `lg:hidden` with `onClick={close}` so the dropdown closes on tap. Green icon + green hover tint matches the retired NETWORK pill color for visual continuity.

### Architecture decisions (load-bearing)

1. **Keep `mobileTab` state.** All the network/feed visibility gates throughout the JSX use it. Removing it would require rewriting ~30 className expressions. Just drop the UI control and drive state from URL via useEffect.
2. **Default = feed.** Per Frank: *"feed will be defualt page on mobile when landing on nodes"*. Initial state opt-in to network only when query explicitly sets it.
3. **`lg:hidden` on the avatar Network link.** Desktop /nodes already shows network in its left sidebar — a dropdown entry would duplicate the affordance. Hide at lg+.
4. **`onClick={close}`** so the menu dismisses after tap, matching existing dropdown UX (My Profile, Wallet, Inbox).
5. **useEffect, not useMemo** for query→state sync. useMemo would require threading the derived value into every gate; useEffect lets the existing gates stay verbatim.

### Build + deploy

- `yarn build` 79.11s clean, all routes prerendered, shared FLJ 718 kB unchanged.
- Pushed `a7dbea8` to main → Vercel webhook auto-deploy (Bug #27 fix from May 13 still holding).

### Verify path (Frank → Sarg, iPhone)

1. Hard-refresh `https://soundchain.io/nodes` → NO `[NETWORK] [FEED]` pill row. Feed renders full-width immediately.
2. Tap avatar (top-right) → dropdown opens → scroll past Inbox → see green `Network` entry.
3. Tap Network → dropdown closes + URL becomes `/nodes?tab=network` + page swaps to network dashboard (swarm nodes + IPFS/Nostr/WebRTC/Polygon panels + NETWORK COLLECTION).
4. Cross-check desktop (lg+ width) → split layout unchanged; avatar dropdown shows no Network entry (correctly hidden).
5. Deep-link `https://soundchain.io/nodes?tab=network` from a fresh tab → lands on network view immediately.
6. From `/nodes` (feed) → click avatar → Network → confirm useEffect fires + section swaps without remount.

### Lessons

1. **Shallow nav + useState initializer = stale UI.** Next.js's shallow routing intentionally avoids remounts. useState initializers run once. Any state derived from URL needs a `useEffect(..., [router.query.<key>])` companion or it desyncs on in-page nav.
2. **Remove UI before rewiring state.** Deleting the pill row was 7 lines; keeping `mobileTab` + the existing gates avoided touching ~30 JSX expressions. Surgical change > over-refactor.
3. **Avatar dropdown is becoming the mobile control center.** Profile, Wallet, Inbox, Mint, Verification, Frames, Appearance — and now Network. Continue this pattern when something is useful but doesn't earn permanent screen real estate.
4. **`lg:hidden` is the right gate on dropdown items that mirror desktop nav.** DexNavBar mounts on every page; without the gate, the Network entry would clutter the desktop menu where it's redundant.

### Open follow-ups (unchanged)

- `api.soundchain.io` AWS Console TLS bridge repair — Frank's hands (pinned).
- lucy.soundchain.io CNAME at name.com → `cname.vercel-dns.com` — Frank's hands.
- Vendor secret rotation: Magic + MongoDB on retired cluster + Pinata + 4 X API + Vercel OIDC.
- Anvil RTX 5000 + Mixamo retarget for Phase 16.50.
- WebRTC peer-sync for 1-on-1 arena gym matchups.

---

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
