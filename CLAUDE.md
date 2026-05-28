# CLAUDE.md - SoundChain Development Guide

## 🟣 SESSION: May 28, 2026 (Frank → Sarg, autonomous, midday) — PROFILE REELS PILL + INNER CIRCLE RESTORED (`c81a23f`) + FURL TERMINAL HEAT/BATTERY FIX (`f67b9bc`)

Two ships. Frank on Sarg: *"we pushed aome shipments this morning on profile wall again. i notice a couple bugs one the reels avatar pill isnt present and circle is missing my curcle of friends i added and there is no way ti add to my circle now? its missing how to add and remove frineds to my iner circle"* → mid-run: *"bro everytime i use furl xterm and jump on claude mypjone immediately heats up and battery starts to drain!"*.

### Ship 1 — Profile reels pill + inner circle (`c81a23f`, +513/-328, 1 file: `web/src/components/dex/ProfileReels.tsx`)

Two root causes, both confirmed in code — NOT caused by the morning identity ships (`c4f8fa0`/`a477201`), they were latent:

1. **Reels avatar pill + circle stories were empty** because `ProfileReels` fetched stories via the Apollo `publicStories` query against `api.soundchain.io` — which is DOWN (the pinned open follow-up). `StoriesBar` already uses the Vercel-direct `/api/feed/stories` and works. Swapped `ProfileReels` to the same endpoint (`/api/feed/stories?limit=200`).
2. **Circle was ALWAYS empty even when api was up**: `followingIds` mapped `n.id` (the follow-EDGE id) instead of `n.followedProfile.id`. The circle filter then matched edge-ids against story profile-ids → never hit. Fixed to read `followedProfile.id`.

Then built the inner-circle management Frank asked for (all Vercel-direct — no Apollo):
- **Circle row now shows EVERY followed friend** (not just those with active stories): colorful story ring + tappable → StoryViewer when they have a live reel, plain gray ring → navigates to their profile otherwise. Friends-with-stories sort first.
- **Own profile gets management**: an **Add** pill (purple, `UserPlus`) opens an inline `AddCircleModal` that searches `/api/users/explore?search=` and follows via `/api/follow/toggle {action:'follow'}`; a **× remove** badge on each circle member unfollows via the same endpoint (`action:'unfollow'`); refetches following on change.
- **Add Reel pill** (cyan dashed + your avatar) on own profile opens `CreateStoryModal` so the reels avatar pill is always reachable even with zero stories.
- Viewing someone ELSE's profile = read-only (no Add/remove pills), titles switch to "Your Reels/Circle" vs "<name>'s Reels/Circle".

### Ship 2 — FURL terminal heat/battery (`f67b9bc`, +105/-80, 2 files)

Phone heats + drains *whenever FURL xterm is open AND you're chatting with Claude*. Two stacked GPU/CPU hogs:
- **`web/public/furl-terminal.html`**: `allowTransparency: true` with a solid `#0a0a0a` theme bg forced per-cell alpha compositing on every canvas write. Set `false` → cheap opaque fills, zero visual change. (cursorBlink already off, scrollback already 1500, CanvasAddon already loaded from prior battery passes.)
- **`web/src/components/AgentStatusTicker.tsx`** neural visualizer: the rAF `loop` ran at full **60fps** (the "20fps" comment only throttled the React `setRegions` cadence via `frameCount % 3`, NOT the rAF). And it runs while `window.__lucyThinking` is true — i.e. exactly while you chat on a phone — stacked on the terminal's canvas repaints. Replaced the raw `requestAnimationFrame(loop)` reschedule with a `setTimeout(frameInterval) → single rAF` scheduler gated to **targetFps**: 10fps mobile (`pointer:coarse` or `<768px`), 6fps `prefers-reduced-motion`, 24fps desktop. `stopLoop` clears the timer too. Wakeups drop 3-6x; synthetic brain rhythm looks identical.

### Lessons
1. **A component that "lost" a feature may never have been migrated off dead Apollo.** `ProfileReels` was the last stories surface still on `publicStories`/api.soundchain.io while `StoriesBar` moved to Vercel-direct months ago. When api went down, it silently emptied. Audit sibling components for the same data source when one works and one doesn't.
2. **Map the right id off a follow edge.** `useFollowing` nodes are `{ id: edgeId, followedProfile: {...} }`. Mapping `.id` gives edge ids — a silent filter-never-matches bug. See [[feed-create-body-field-trap]]-class field traps.
3. **"Throttled to Nfps" must gate the rAF reschedule, not just setState.** A `frameCount % 3` guard around `setState` still leaves the rAF firing 60×/s doing FFT/sine math. Real battery savings come from sleeping `1000/fps` ms between frames (setTimeout→rAF).
4. **Decorative animation that runs during inference is the worst case** — it pegs the GPU at the exact moment the user is actively waiting on a phone. Throttle hard on mobile + honor `prefers-reduced-motion`.

### Verify path (Frank → Sarg, iPhone)
1. `https://soundchain.io/users/furdA1` → Wall tab → **Your Reels** row shows the cyan "Add Reel" pill (+ your reel bubble if you have a live story); **Your Circle** row shows every friend you follow + a purple "Add" pill.
2. Tap **Add** → search a handle → tap Add → they appear in your circle (no api.soundchain.io dependency).
3. Tap the **×** on a circle member → they're removed (unfollowed).
4. Open FURL xterm, chat with Claude on the phone → noticeably less heat; the neural bars animate slower (10fps) but smooth.

---

## 🪪 SESSION: May 28, 2026 (Frank → Sarg, AM polish pass) — PROFILE DESKTOP POLISH: FULL-SPECTRUM READABLE NAMES, ONE TIGHT IDENTITY CARD, KILL BLACK BAND + 40vh GAP (`c4f8fa0`, 2 files)

Frank woke, tested DESKTOP (3 screenshots), flagged: *"theres still black background on user and handle name"* + *"the top of image is cropped abit under [nav]"* + *"theres still a massive gap from bio to social pills"* + *"do you see how my background image is light blue and the fluid gl colors are light blue?"* + *"this is all on desktop make sure mobile renders the same i think mobile profile pic is perfectly set."*

### Root causes
- **Black band** = identity/POAP/bio were transparent strips between the profile-pic banner and the cover image → showed the page's pure-black bg as a flat dead-band (worse on wide desktop).
- **Massive gap** = the cover image was `h-[40vh]` with stats/social pinned `absolute bottom-0`; on a tall desktop viewport that's a ~400px void of mostly-empty circuit board between bio and stats.
- **Color blend** = `.sc-fluid-name` gradient was cyan/blue-heavy → mono light-blue, same hue as furdA1's light-blue banner.
- **Cropped top** = the banner's `h-24 from-black/55` top gradient darkened the image top under the nav.

### What shipped (`c4f8fa0`, +59/-66, 2 files)
- **`web/src/styles/globals.css`** — `.sc-fluid-name` now sweeps the FULL SoundChain spectrum (cyan→indigo→purple→pink→gold→emerald, `background-size:320%`, 6s) so it never reads mono light-blue; added a dark **text-shadow outline halo** (paints from glyph geometry, not the transparent fill) so names stay legible on ANY bg — light-blue cover, bright photo, dark page.
- **`web/src/pages/dex/[...slug].tsx`** — (1) merged name/@handle/POAPs/bio into ONE cohesive cyberpunk **identity card** (`bg-gradient-to-b from-[#0b0f1c] via-[#080a12] to-[#06070d]` + neon left spine + glow underline, `py-2 space-y-1`) → the flat black dead-band is gone, it's now a designed dark surface; (2) cover image `h-[40vh] min-h-[250px]` → tight `h-[200px] sm:h-[240px] md:h-[280px]` banner so the social/stats overlay sits right under the bio (gap killed); (3) banner top gradient `h-24 from-black/55` → `h-12 from-black/25` (clean top, not cropped).

### Mobile posture
Frank: *"mobile profile pic is perfectly set."* The profile-pic banner heights (`h-[180px] sm:[220px] md:[260px]`) are UNTOUCHED. The identity card consolidation + color upgrade improve both surfaces; the cover-height reduction tightens both (cover ≠ the "profile pic" Frank praised). No mobile-only divergence introduced.

### Build + deploy
- `yarn build` clean 149.19s, new css bundle `a1de7376b9e8ce53.css`. Pushed `c4f8fa0` → `soundchain-site` building on production target. (verify alias promotes + serves the new css hash per [[feedback_verify_chunk_hash_promote_after_push]].)

### Lessons
1. **A bg-clip-text gradient blends if its hue matches the bg** — sweep the full brand spectrum + add a dark text-shadow halo (works even with transparent fill) so identity text pops on ANY background. The halo is the readability guarantee, the spectrum is the polish.
2. **`h-[40vh]` + `absolute bottom-0` content = a desktop void.** vh-based hero heights balloon on tall monitors; a fixed-px banner keeps the overlay content close to the flow above it.
3. **Consolidate sibling strips into one designed surface** to kill a "flat black band" — the band reads as dead space precisely because it's transparent-over-page-black between two images; a gradient panel + neon frame makes it intentional.

---

## 🪪 SESSION: May 28, 2026 (Frank → Sarg, autonomous, ~midnight, Frank asleep) — PROFILE IDENTITY FINAL: LIQUID-COLOR NAME+HANDLE, KILL BLACK BAR, RESTORE GOLD FOUNDER LOGO (`a477201`, 3 files)

Frank (then *"goodnight im passing out i wont be here to help you you have your orders"*): handle/name look "crappy," gaps "ridiculous," a **black BG blocking the profile pic**, wanted **only the chars in BOTH user + handle to carry multi-SoundChain-color fluid-gl**, and *"this poap is so bad!! what happened to my gold soundchain logo only tito myself and jeremy have the gold founder logo please add it back!!"*. Five+ broken WebGL fluid ships preceded this (`edc6f7a`→…→`0696484`).

### Root causes (all confirmed in code)
1. **Black bar** = the identity row's `bg-gradient-to-r from-black/85 via-black/70 to-black/85 backdrop-blur-md` — read as an opaque band slapped under the pic.
2. **Gap** = the handle's `FluidNameOverlay` lived in an `h-6 sm:h-7 max-w-[260px]` canvas box (taller than the text) + `py-2.5` padding.
3. **Only handle had color** — the WebGL effect was handle-only; the display name was plain white. And the WebGL kept regressing (white/warped/doubled with the static fallback).
4. **Terrible POAP** = `UserSymbols.tsx` rendered admins a **flat `#facc15` circle with a black "S"** (lines 79–82), NOT the real `SoundchainGoldLogo` gold swirl. Founder mark gated on `teamMember` (unreliable) instead of handle.

### What shipped (`a477201`, +86/-55, 3 files)
- **`web/src/styles/globals.css`** — new `.sc-fluid-name` class + `@keyframes scFluidNameShift`: `background-clip:text` + transparent fill over a 6-stop cyan→blue→indigo→violet→fuchsia→cyan gradient, `background-size:280%`, 7s ease-in-out shift, gold-free drop-shadow glow, `prefers-reduced-motion` kill-switch. Liquid color flows THROUGH crisp glyphs — bulletproof (no WebGL, no warp, no doubling, works on Fire TV).
- **`web/src/pages/dex/[...slug].tsx`** — identity stack rewrite: dropped `FluidNameOverlay` import+usage; removed black bg from identity/POAP/bio strips (kept neon spine + underline); tight stack `py-1.5` + `leading-tight`, `<h1 class="sc-fluid-name">` name over `<h2 class="sc-fluid-name">@handle`; **founder gold logo gated on `ADMIN_HANDLES.includes(handle)`** (furdA1/jeremy_soundchain/tito) using the real `SoundchainGoldLogo`, inline on line 1 after the blue check; POAP row now `showFounder={false}` so the gold logo isn't duplicated.
- **`web/src/components/UserSymbols.tsx`** — replaced the flat yellow circle+S with `<SoundchainGoldLogo>`; exported `ADMIN_HANDLES`; added `showFounder` prop (default true). Fixes the founder mark EVERYWHERE UserSymbols renders (comments, lists, profile).

### Decision — dropped WebGL fluid-gl for CSS liquid gradient
Frank asleep + 5 prior WebGL ships failed (white `vec3(1.0)`, warped glyphs, doubled text vs the static fallback). His actual GOAL — *"give every users names a polish effect no matter what color the profile pic is"* — is delivered reliably by an animated `bg-clip-text` gradient: every char colored, crisp, readable, animated, consistent name↔handle, zero context-loss risk. `FluidNameOverlay.tsx` stays in the repo if he wants WebGL back.

### Build + deploy + VERIFIED
- `yarn build` clean 68.22s.
- Pushed `a477201` → `soundchain-site` deploy READY on production target at 00:16. Verified prod alias promoted: `soundchain.io` serves css bundle `460628e9fe715e37.css` containing `sc-fluid-name` + `scFluidNameShift` (chunk-hash protocol satisfied).

### Verify path (Frank, iPhone, AM)
1. Hard-refresh `https://soundchain.io/users/furdA1` → display name AND @handle both shimmer cyan→blue→violet→fuchsia, crisp + readable, tightly stacked, NO black bar under the pic.
2. Line 1: name + blue ✓ + **gold SoundChain founder swirl** (the real logo, not a yellow circle). Only furdA1/jeremy/tito get it.
3. POAP row: event-attendance badge + NFT/creator symbols, no duplicate gold logo.
4. Cross-check a non-founder profile → name+handle liquid color, blue check if verified, NO gold logo.

### Lessons
1. **When WebGL identity text fails N times, the goal is "colorful + readable + animated," not "WebGL."** CSS `bg-clip-text` gradient nails the goal with none of the failure surface. Don't keep polishing a turd shader.
2. **Founder marks gate on the handle allowlist, not a `teamMember` boolean** that may be unset on the very founders it's meant for.
3. **Fix the badge at the shared component (`UserSymbols`)** so every surface inherits the real gold logo, not just the page in the screenshot.
4. **"Remove black bg" = transparent strip + keep the neon accents** — the cyberpunk frame (spine/underline) carries the style; the opaque black was just blocking the pic.

---

## 🪪 SESSION: May 27, 2026 (Frank → Sarg, autonomous, late) — PROFILE/WALL FIX: READABLE+COLORFUL FLUID HANDLE, RESTORE BLUE CHECK + ATTENDANCE POAP + BIO (`0696484`, 2 files)

Frank: *"your work on usernames and handles with web-gl fluid is all off i cant read one of the names and theres no coloring to the chars its only white so what kind of fluid-gl effects work on white 🤦🏽‍♂️ wheres my blue check mark wheres my attendence poap badge? its all fine and wrong! the gaps are still present i dont see my bio!"* + *"bro this refactor has to [hit it out the] park! so users start to live their wall!!"*.

The May 27 fluid identity arc (`edc6f7a`→`df1899f`→`8618352`→`a5b9a24`) shipped a broken result. Root causes, all confirmed in code:

1. **`FluidNameOverlay` shader hardcoded white** — `gl_FragColor = vec4(vec3(1.0), alpha)`. "No coloring, only white." Fix: animated cyan→blue→violet liquid flows through letters via FBM+time.
2. **Shader warped the glyph UVs** — small handle text smeared into mush ("can't read"). Fix: sample glyph alpha UNdistorted (crisp letters); the fluid reads as liquid COLOR flowing through readable letters, not warped shapes. handleOnly texture left-aligned for a clean two-line identity.
3. **Blue check missing** — the hand-rolled identity row gated `VerifiedIcon` behind `!teamMember`, and called `UserSymbols` WITHOUT `verified`. Founder/team members never saw a blue check. Fix: show blue `Verified` whenever `verified`, decoupled from teamMember, alongside the gold logo + symbols.
4. **Attendance POAP missing** — the refactor replaced `<DisplayName>` (which renders `Badge.SupporterFirstEventAeSc` → `/badges/badge-01.svg`) with a hand-rolled row that dropped it. Fix: restored the event-attendance badge in the POAP row (`ProfileBadge.SupporterFirstEventAeSc`, enum alias-imported to avoid the UI `Badge` name collision).
5. **Bio missing / gaps** — bio was buried at the bottom of the 40vh cover-image overlay (gray text on a photo, easy to miss; blank where it should be = the "gap"). Fix: pulled bio into its own readable panel flush in the identity stack (falls back to `me.profile.bio` on own profile); removed the buried duplicate from the cover overlay.

### Identity stack now (top→down)
profile-pic banner (CLEAN) → identity row [name + blue check + gold logo + symbols, then @handle on its own fluid line w/ static colored fallback] → POAPs row [gold founder + event-attendance badge + on-chain symbols] → bio panel → cover image (social links + stats overlay).

### Build + deploy
- `yarn build` (web) clean 67.52s. Pushed `0696484` to main → web webhook auto-deploy.
- Files: `web/src/components/FluidNameOverlay.tsx`, `web/src/pages/dex/[...slug].tsx`.

### Verify path (Frank → Sarg)
1. Hard-refresh `https://soundchain.io/users/<your-handle>` → @handle reads cleanly with cyan/blue/violet color flowing through it (not white, not warped).
2. Identity line shows your blue ✓ check AND gold founder logo AND founder ✦ symbol together.
3. POAPs row shows the event-attendance badge (badge-01.svg).
4. Your bio shows on its own panel right under the POAPs row.
5. No blank gap between the pic and your identity/bio.

### Lessons
1. **A visual effect on white pixels is no effect.** The whole point of "fluid-gl on text" is color + motion; hardcoding `vec3(1.0)` made it pointless. Color the alpha, don't just alpha the white.
2. **Don't warp the glyph to fake "fluid."** Readability is non-negotiable on identity text. Flow color through crisp letters instead of displacing letter geometry.
3. **A hand-rolled row that replaces `<DisplayName>` inherits the duty to render everything it did** — verified, team, symbols, POAP-leaderboard, AND the event-supporter badge. Dropping any is a silent regression ([[feedback_no_silent_regressions]]).
4. **The flagship surface bar is "users want to live here."** Identity must feel complete + sharp, not experimental. See [[feedback_constrain_effect_to_named_element]].

---

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
