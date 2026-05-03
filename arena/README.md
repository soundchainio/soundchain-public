# SoundChain Arena

**Standalone Next.js app for SoundChain's sports + console-gaming surface.**

Deployed at: `arena.soundchain.io`
Native shells (Capacitor): `io.soundchain.arena` (deferred — see Phase 3 below)

---

## What lives here

### Real stats (live data, auto-refresh every 60s)
- **Hub** — `/` Arena landing
- **Live Scoreboard** — `/live` cross-sport aggregator (RedZone-style data dashboard)
- **NBA Playoffs** — `/nba` live scores + Eastern/Western standings
- **NHL Playoffs** — `/nhl` live Stanley Cup scores + standings (with OT losses column)
- **MLB** — `/mlb` daily slate + division standings
- **F1** — `/f1` next race countdown + driver/constructor standings + last race podium

### Free-to-play layer
- **Fantasy** — `/fantasy` league discovery, `/fantasy/[id]` league detail
- **Picks** — `/picks` paused splash (real-money wagering retired May 2, 2026 platform-wide)

### Brand identity
- **Light by default**, dark mode toggle pill in nav (persisted to localStorage)
- **Titillium Web** font (the F1 font; clean motorsport-grade geometric sans)
- **Racing Red `#dc2626` + Hot Orange `#f97316` + Checker Yellow `#facc15`** accent palette
- Visually divorced from soundchain.io's music-side cyan/purple/pink hologram

All features are **free-to-play**. No entry fees, no payouts, no wagering. Real stats, bragging rights, leaderboards, soulbound trophy NFTs only.

## Data sources (all FREE, no API keys)

- **ESPN public scoreboard + standings** — NBA, NHL, MLB, soccer (EPL/MLS), MMA/UFC
- **Jolpica-F1** — drop-in Ergast successor, actively maintained, free
- (Phase 2) **OpenF1** — real-time F1 telemetry (car position, speed, RPM, sectors)

---

## Why this app exists separately from `web/`

`/Users/soundchain/arena-split-plan.md` has the full rationale. Short version:

1. Arena's audience overlaps ~30% with SC's music audience — different competitive set (Sleeper, Underdog, Draft, FaceIt).
2. Brand decoupling protects SC's clean utility/music compliance posture if the regulatory window for real-money wagering ever reopens.
3. Native-ready early: separate Capacitor shells (`io.soundchain.arena`) means Arena can ship to App Store + Play Store without inheriting SC's heavier player/feed/IPFS surface area.
4. Engineering cost bounded by the existing Lerna monorepo — `arena/` is a sibling to `web/`, not a new repo.

---

## Local dev

```bash
cd arena
yarn install
yarn dev          # http://localhost:3001
```

The app intentionally has NO imports from `../web/`. Vercel projects only see their own root directory, so cross-project imports break the build. Phase 2 of the split plan extracts shared concerns into `packages/shared/` for cross-app reuse.

---

## Production deploy (Vercel)

| Setting | Value |
|---|---|
| Project Name | `soundchain-arena` |
| Repo | `soundchainio/soundchain-public` |
| Root Directory | `arena` |
| Framework Preset | Next.js |
| Build Command | `yarn build` (default) |
| Output Directory | `.next` (default) |
| Install Command | `yarn install` |
| Domain | `arena.soundchain.io` |

DNS at name.com:
```
CNAME  arena  →  cname.vercel-dns.com.
```

---

## Native shells (Capacitor — Phase 3, deferred)

```bash
yarn build
yarn cap:add:ios          # generates ios/ Xcode project
yarn cap:add:android      # generates android/ project
yarn cap:ios              # opens Xcode
yarn cap:android          # opens Android Studio
```

Native shells use `server.url: 'https://arena.soundchain.io'` for remote-loaded content — instant updates without app store review for non-native code changes.

App store assets needed before submission:
- Icon master 1024x1024
- Splash screen (matches arena dark hero)
- 5 screenshots per platform
- Listing copy (sports/fantasy/gaming category, NOT music)

---

## Architecture posture

- **Auth-optional in Phase 1.** Pages render without login. Actions that need auth (create league, post challenge) link out to `https://soundchain.io/...` for now.
- **No payments.** Per `472f617` (May 2, 2026), all SC wagering is paused platform-wide. Arena ships free-to-play only.
- **Data sources are public APIs only.** ESPN scoreboards, no Mongo dependency in Phase 1.

---

## Files

```
arena/
├── src/
│   ├── pages/
│   │   ├── _app.tsx           # global wrapper
│   │   ├── _document.tsx      # head + theme color
│   │   ├── index.tsx          # hub
│   │   ├── fantasy.tsx        # league discovery
│   │   ├── fantasy/[id].tsx   # league detail
│   │   ├── picks.tsx          # paused splash
│   │   └── 404.tsx
│   ├── components/
│   │   ├── ArenaShell.tsx     # nav + footer wrapper
│   │   └── PillButton.tsx     # reusable CTA pill
│   └── styles/globals.css
├── public/
│   ├── manifest.json          # PWA install
│   └── robots.txt
├── package.json               # @soundchain/arena
├── next.config.js             # PWA + image domains
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── capacitor.config.ts        # io.soundchain.arena
├── vercel.json                # standalone deploy config
└── .gitignore                 # excludes ios/, android/ (Phase 3)
```
