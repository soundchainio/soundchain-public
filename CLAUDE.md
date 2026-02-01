# CLAUDE.md - SoundChain Development Guide

**Last Updated:** January 31, 2026
**Project Start:** July 14, 2021
**Total Commits:** 4,800+ on production branch

---

## 🚨 CURRENT SESSION (Jan 31, 2026) - OPEN SOURCE MIGRATION RECOVERY

**Environment:** Remote ttyd terminal via Cloudflare tunnel
**Working Dir:** `/Users/soundchain/soundchain`
**Branch:** production
**New Public Repo:** `github.com/soundchainio/soundchain-public`

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
- Magic Secret Key: `sk_live_87427547E4E2E5AE` (from api/.env.local)

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
│   0x45f1af894...       Rewards        0xF0287926D...      0xD772ccf78...│
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
| **NFT V2 (Editions)** | `0xF0287926D495719b239340Fc31d268b76bAD8B42` | Soundchain721Editions.json |
| **Marketplace V1** | `0xD772ccf784Df67E14186AA6E512c1A1bd32F394f` | SoundchainMarketplace.json |
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
                        │  📱 REMOTE ACCESS         │
                        │  iPhone 14 Pro Max        │
                        │                           │
                        │  • ttyd terminal          │
                        │  • code-server (VSCode)   │
                        │  • Production testing     │
                        │  • On-the-go commits      │
                        └───────────────────────────┘
```

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

*This document consolidates all handoff knowledge. Update as new lessons are learned.*
