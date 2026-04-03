# FURL Xterm Bug Reports

> Mobile xterm session diagnostics — filed from iPhone 14 Pro Max (Sarg)
> Started: April 3, 2026
> This file is the canonical log of all bugs found/fixed during mobile Claude Code sessions.

---

## HISTORICAL TIMELINE — All Mobile/FURL/Xterm Debugging

### Commits (chronological)
| Commit | Date | Description |
|--------|------|-------------|
| `222a0a2` | Feb 23 | Add 'furl' to CLI bridge whitelist + terminal clipboard support |
| `d1273d2` | Feb 23 | Add mobile paste button to FURL terminal |
| `a314c50` | Feb 24 | FURL tunnel resilience — auto-reconnect on tab switch + keepalive |
| `9f9d55a` | Feb 27 | FURL tunnel session dedup + ANSI garbling prevention |
| `fdff81e` | Feb 27 | Tunnel reconnect preserves Claude session — reattach instead of new shell |
| `a23ae7f` | Feb 27 | Tunnel grace period — ttyd stays alive 30s during disconnects |
| `926b06f` | Feb 27 | Lock tunnel terminal to portrait — landscape kills WebSocket |
| `96a6718` | Feb 28 | Restore original tunnel behavior — auto-relaunch Claude on reconnect |
| `6477ed3` | Feb 28 | Prevent duplicate FURL terminal sessions — guard against effect re-fire |
| `ea2b687` | Feb 28 | Hard lock prevents duplicate FURL terminal sessions — connectingRef |
| `f8d71c8` | Mar 5 | Revert: Restore original AgentStatusTicker + furl-terminal from d1273d2 |
| `632e2dd` | Mar 13 | Apple Watch FURL companion app + skill.md update for NVIDIA Inception |
| `040cb62` | Mar 24 | Call ringtone + vibration + Web Push for offline incoming calls |
| `05e0824` | Mar 19 | Live user count ticker + mobile UI tightening for radio & feed |
| `bdd00cf` | Mar 31 | Mobile battery drain — throttle 3D scene, reduce polling intervals |
| `363d5e6` | Mar 31 | Hide NFT card on mobile — was blocking the radio sphere |
| `6fccd2a` | Mar 31 | Compact mobile radio layout — sphere visible without scrolling |
| `ce2d887` | Apr 1 | 2 UX bugs — false Leave Site dialog + Rotate to Portrait on desktop |
| `e6e4f51` | Apr 3 | Radio audio — use IPFS playbackUrl instead of S3 assetUrl |

---

### Session: Feb 23, 2026 — FURL Terminal Born

**Key bugs found & fixed:**

**xterm.js not rendering on mobile**
- Root Cause: React ref assigned to TWO divs (mobile + desktop), ref always pointed to desktop div (`display: none` on mobile)
- Fix: Split into `xtermContainerMobileRef` and `xtermContainerDesktopRef`, pick visible container at runtime
- Lesson: Never use same React ref on two DOM elements

**CORS issue with ttyd token fetch**
- Root Cause: ttyd has no CORS headers; cross-origin fetch blocked by browser
- Fix: Skip token fetch, use WebSocket directly (bypasses CORS)
- Lesson: ttyd has no CORS headers; cross-origin fetch ALWAYS fails from different domain

**Fullscreen toggle + CLI bridge HTTPS fix added**

---

### Session: Feb 27, 2026 — Tunnel Relay Blitz

**The permanent tunnel was born:** `tunnel.soundchain.io`

Architecture:
```
Browser xterm.js (iPhone Safari)
  → WSS (binary frames)
  → nginx on EC2 (SSL termination) — tunnel.soundchain.io
  → relay server (server.ts, port 3340)
  → MacBook agent (agent.ts, launchd service)
  → WS with ['tty'] subprotocol
  → ttyd (localhost:7681)
  → PTY → zsh → Claude Code
```

**Bug: Terminal blank on ttyd connection**
- Root Cause: ttyd requires WebSocket subprotocol `['tty']` — without it, accepts connection but sends zero output
- Fix: `new WebSocket(TTYD_URL, ['tty'])`

**Bug: Keystrokes not working in terminal**
- Root Cause: Command bytes mismatch — browser sent `0x00` for input, ttyd expects `0x30` (ASCII `'0'`); browser sent `0x01` for resize, ttyd expects `0x31` (ASCII `'1'`)
- Fix: Changed `buf[0] = 0` → `buf[0] = 48`, `buf[0] = 1` → `buf[0] = 49`
- Lesson: ttyd uses ASCII character codes, not raw byte values

**Bug: ttyd auth handshake missing**
- Root Cause: ttyd expects `JSON.stringify({AuthToken: '', columns: 80, rows: 24})` as first message
- Fix: Send auth JSON on `ttyd.on('open')` before setting session ready

**Bug: Portrait lock needed**
- Landscape orientation killed WebSocket connection (viewport resize triggered disconnect)
- Fix: Locked tunnel terminal to portrait mode

**Bug: Session dedup**
- Multiple FURL terminal sessions spawning on re-render
- Fix: `connectingRef` guard prevents duplicate WebSocket connections

---

### Session: Mar 5, 2026 — FURL Iframe Isolation

**Replaced direct xterm.js+WebSocket (~260 lines) with iframe approach (~50 lines)**

```
AgentStatusTicker.tsx (React)
  └── <iframe src="/furl-terminal.html?tunnel=tunnel.soundchain.io">
        └── Standalone HTML with xterm.js + ttyd WebSocket
            └── postMessage API for parent communication
```

New file: `web/public/furl-terminal.html`
- Standalone terminal page loaded in iframe
- Auto-reconnect with exponential backoff (5 max attempts)
- postMessage API: `furl-input`, `furl-disconnect`, `furl-focus`, `furl-fit`
- Auto-reconnect after page refresh via `sessionStorage`

---

### Session: Mar 24, 2026 — First WebRTC Call (iPhone 14)

**MILESTONE: First cellular voice call**
- furdA1 (iPhone 14 Safari) → furl_buildr (MacBook Pro Chrome)
- Incoming call screen with Accept/Decline: WORKING
- Connected call with audio waveform + duration timer: WORKING

**Root Cause of prior failures:** Both phones logged into same account → signals sent to self

**Infrastructure deployed:**
- Self-hosted TURN server on EC2 (coturn 4.6.1)
- Push notifications for offline calls via `/api/push/call-notify`
- iOS limitation: Web Push only works from Safari PWA (Home Screen app)

---

### Session: Mar 30-31, 2026 — FURL EC2 Always-On Plan + Battery Fix

**Problem:** Tunnel drops every time phone backgrounds — recurring pain point
**Plan:** Move FURL responder + Claude CLI to EC2 (24/7, no phone dependency)

**iPhone 14 battery drain on FURL screen:**
- Root Cause: RadioScene4D running 60fps Three.js + 60x/sec FFT + 12K particles
- Fix: Mobile throttles — 30fps cap, DPR 1.5x, antialiasing off, `powerPreference: 'low-power'`, FFT every 2nd frame, bloom half-resolution
- Also reduced: AgentStatusTicker timer 1s→5s, NotificationBadge poll 30s→60s

---

### Session: Apr 1, 2026 — UX Bugs

**False "Leave Site?" dialog on radio page** — browser thought navigation was happening
**Rotate to Portrait prompt showing on desktop** — mobile-only check was missing

---

## ACTIVE BUG LOG

### Bug #1 — Radio Audio Silent (Apr 3, 2026)

**Reporter:** Commander (Sarg/iPhone 14 Pro Max)
**Severity:** Critical — no audio on radio page
**Status:** FIXED (commit `e6e4f51`)

**Symptoms:**
- Navigated to OGUN Radio page
- No audio playing at all
- Page loads, UI renders, but silence

**Root Cause:**
Radio API (`/api/agent/radio.ts`) was serving S3 URLs instead of Pinata IPFS URLs.
- MongoDB projection missing `playbackUrl` field
- `rawToRadioTrack` hardcoded to `track.assetUrl` (S3)
- IPFS-first priority (`playbackUrl || assetUrl`) applied to rest of app on Mar 30 but radio API was never updated
- `onError` handler silently skipped to next track — infinite silent loop

**Fix:**
1. Added `playbackUrl` to MongoDB projection
2. Changed `stream_url: track.assetUrl` → `stream_url: track.playbackUrl || track.assetUrl`
3. Added error logging to audio element (was silently skipping on error)

**Lesson:** When a system-wide audio source change is made, grep ALL endpoints that serve audio URLs — not just the main player components. The radio API was a separate Atlas-direct query that got missed.

---

### Bug #2 — Radio Links Kill Music (Apr 3, 2026)

**Reporter:** Commander (Sarg/iPhone 14 Pro Max)
**Severity:** High — any link tap navigates away from radio, killing playback
**Status:** FIXED

**Symptoms:**
- Tapped "View Track Details" link on radio page
- Browser navigated to `/dex/track/{id}` — new page load
- Radio audio immediately stopped
- Same issue with IPFS/Pinata link, Polygonscan info cards
- Every clickable link on radio page was a full navigation = music death

**Root Cause:**
- "View Track Details" was a Next.js `<Link>` to `/dex/track/{id}` — full page navigation
- Polygonscan info cards were `<a href="..." target="_blank">` — opened new tabs (less bad) but still disruptive
- npm badge was also `<a>` with `target="_blank"`
- No in-page overlay system existed — all links assumed navigation

**Fix:**
1. Replaced all navigating `<Link>` and `<a>` elements with `<button>` elements
2. Built accordion-style overlay modal system (`radioOverlay` state)
3. Two overlay modes:
   - **`details`** — Track info with accordion sections (Info, IPFS, On-Chain, Share) with chevron up/down toggles
   - **`iframe`** — Loads external URLs (Polygonscan, IPFS gateway, full track page) in sandboxed iframe within the overlay
4. "Back to Details" button in iframe mode returns to accordion view
5. X button and click-outside-to-dismiss close the overlay
6. Music keeps playing throughout all overlay interactions
7. Now Playing LIVE indicator shown in overlay header

**Lesson:** On a page with persistent audio playback, NEVER use `<Link>` or `<a>` for info links. All secondary content must load in overlays/modals to protect the audio session. The radio page is a single-page experience — treat it like a music player app, not a website.

---

<!-- Next bug goes here -->
