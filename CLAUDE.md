# CLAUDE.md - SoundChain Development Guide

**Last Updated:** January 22, 2026 (SoundChain Bridge App + Nostr Fixes)
**Project Start:** July 14, 2021
**Total Commits:** 4,800+ on production branch

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
| OGUN Token | `0x45f1af89486aeec2da0b06340cd9cd3bd741a15c` | Polygon | LIVE |
| StreamingRewardsDistributor | `0xcf9416c49D525f7a50299c71f33606A158F28546` | Polygon | Funded (5M OGUN) |
| StakingRewards | Config address | Polygon | LIVE |
| SCidRegistry | Deployed | Polygon | LIVE |

---

## AWS INFRASTRUCTURE

### Bastion Host (Cost Control)
**Instance ID:** `i-0fd425cefe208d593`
**Region:** us-east-1

```bash
# Check status
aws ec2 describe-instances --instance-ids i-0fd425cefe208d593 --query 'Reservations[*].Instances[*].[State.Name]' --output text

# Start (only for backend/DB work)
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

*This document consolidates all handoff knowledge. Update as new lessons are learned.*
