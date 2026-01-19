# CLAUDE.md - SoundChain Development Guide

**Last Updated:** January 18, 2026
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
