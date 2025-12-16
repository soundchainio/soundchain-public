# Claude Code Session - SoundChain Development
**Last Updated:** December 16, 2025
**Agent:** Claude Code (Opus 4.5)
**Branch:** production

---

## 🗺️ ARCHITECTURE MAP - Legacy to DEX Migration

### Page Route Mapping (from commit f841a178d)

| Legacy Route | DEX Route | Status |
|--------------|-----------|--------|
| `/wallet` | `/dex/wallet` | ✅ Migrated + ZetaChain Swap Portal added |
| `/notifications` | `/dex/notifications` | ✅ Migrated (inline view) |
| `/messages/*` | `/dex/messages/*` | ✅ Migrated (placeholder) |
| `/settings/*` | `/dex/settings/*` | ✅ Migrated (links to legacy settings pages) |
| `/marketplace` | `/dex` | ✅ Redirects to DEX |

### Key DEX Views (`web/src/pages/dex/[...slug].tsx`)

```
selectedView === 'dashboard'   → Main DEX dashboard with stats, genre charts
selectedView === 'feed'        → Social feed with posts
selectedView === 'users'       → User discovery + leaderboard
selectedView === 'buy'         → Marketplace (tracks, NFTs, tokens, bundles)
selectedView === 'sell'        → Sell interface
selectedView === 'library'     → User's saved tracks, playlists, NFTs
selectedView === 'wallet'      → COMPREHENSIVE wallet page:
                                 • OAuth wallets (Email, Google, Discord, Twitch)
                                 • MATIC/OGUN balances (real from Magic context)
                                 • NFT count from database
                                 • Quick actions (Buy, Send, Receive, Swap)
                                 • ZetaChain Omnichain Swap Portal (NEW!)
                                 • Transfer NFTs section (NEW!)
                                 • Bridge section (Polygon, ZetaChain)
                                 • Transaction history
selectedView === 'settings'    → Settings menu (links to /settings/* pages)
selectedView === 'messages'    → Messages placeholder
selectedView === 'notifications' → Notifications placeholder
selectedView === 'profile'     → User/artist profile view
selectedView === 'track'       → Track detail view (/dex/track/[id])
selectedView === 'mint'        → Mint new NFT view
```

### Menu Items (Header Right Side)

1. **Backend Panel** (admin only - furdA1, JSan619, TitoMag) - Shows real DB stats
2. **Notifications Bell** - Dropdown modal with all notification types
3. **Wallet Connect** - Connect/disconnect wallet button
4. **User Avatar** - Opens dropdown menu with:
   - Profile link
   - Alerts (notifications)
   - Inbox (messages)
   - Wallet
   - Docs (GitBook)
   - Leave Feedback (Google Form)
   - Admin Panel (founders only)
   - Account Settings
   - Logout

### ZetaChain Integration (Omnichain)

**Files:**
- `web/src/hooks/useOmnichain.tsx` - Cross-chain swaps, NFT bridging, fee calculation
- `web/src/components/CrossChainPurchase.tsx` - Cross-chain NFT purchase UI
- `web/src/constants/chains.ts` - 23+ supported chains config

**Supported Chains:**
- Layer 1: Bitcoin, Ethereum, Solana, Avalanche
- Layer 2: Polygon, Arbitrum, Optimism, Base, Blast
- Omnichain: ZetaChain (hub)
- Specialized: Ronin, Zora, ApeChain, etc.

**Fee Structure:** 0.05% (5 basis points) → Gnosis Safe

---

## Summary for User (When You Return)

### Commits Deployed Today (11 total)
Previous commits (from earlier session):
1. `a1395cf0` - Genre error logging
2. `42c0402c` - Handoff docs update
3. `cfde6c6d` - OAuth: Don't await loginWithRedirect
4. `e4bfd20a` - DEX audit handoff
5. `64d432b9` - DEX real balances + backend stats
6. `f3448755` - OAuth uses context Magic instance

New commits (this session):
7. `a89eeb64` - Use auth-only Magic without network config
8. `b187ebac` - Create fresh Magic instance for OAuth with proper await
9. `c15a8b71` - Add Magic preload before OAuth loginWithRedirect
10. `b0218641` - Use fresh Magic instance for OAuth redirect handling
11. `a8023c78` - Add 10s timeout for OAuth redirect to detect silent failures

### OAuth Status (Still Investigating)
- **Problem:** Google OAuth button shows spinner but never redirects to Google
- **Multiple fixes applied:**
  - Using fresh Magic instance (no cached/stale state)
  - Added `magic.preload()` to ensure iframe is ready
  - Added 10-second timeout to detect silent failures
  - Fixed broken reference to removed `createAuthMagic` function

**To Test OAuth:**
1. Clear browser cache completely
2. Open DevTools Console
3. Click "Login with Google"
4. Watch console for these messages:
   ```
   [OAuth2] handleSocialLogin called for google
   [OAuth2] Creating fresh Magic instance...
   [OAuth2] Magic instance created: true
   [OAuth2] oauth2 extension: true
   [OAuth2] Waiting for Magic iframe preload...
   [OAuth2] Magic preload complete
   [OAuth2] Starting OAuth for: google
   [OAuth2] Redirect URI: https://www.soundchain.io/login
   [OAuth2] Calling loginWithRedirect...
   ```
5. If timeout message appears after 10s, Magic SDK is failing silently
6. Check for CSP errors or iframe loading issues in console

### Other Fixes Completed
- **Mobile audio player:** Fixed cropped rendering with responsive CSS
- **DEX crash on play:** Added error handling to handlePlayTrack
- **Feed embed posts:** Increased overscanCount in react-window List

---

## Debugging OAuth If Still Broken

### Possible Causes
1. **Magic iframe not loading:** Check for CSP errors in browser Network tab
2. **API key issue:** Verify `pk_live_858EC1BFF763F101` is valid in Magic dashboard
3. **Redirect URI not whitelisted:** Check Magic dashboard for allowed redirect URIs
4. **Google OAuth app config:** Publishing status may need to be "In Production"

### Console Commands for Debugging
```javascript
// Check if Magic is loading
console.log(window.location.href);

// Check for Magic iframes
document.querySelectorAll('iframe[src*="magic"]');
```

### Magic Dashboard Checklist
1. Go to https://dashboard.magic.link
2. Find SoundChain app
3. Check OAuth Providers > Google
4. Verify redirect URI includes `https://www.soundchain.io/login`
5. Check if Google OAuth credentials are configured

---

## Commands

### Push to Production
```bash
echo 'C@true408' | ssh-add ~/.ssh/id_ed25519 2>/dev/null; git push origin production
```

### Local Dev
```bash
cd /Users/soundchain/soundchain/web && yarn dev
```

---

## Files Modified This Session

### web/src/pages/login.tsx
- Removed `createAuthMagic` factory function
- Now creates fresh Magic instance inline
- Added `preload()` before OAuth redirect
- Added 10-second timeout for silent failure detection
- Fixed broken `authMagicRef` reference in redirect handler

### web/src/components/common/BottomAudioPlayer/MobileBottomAudioPlayer.tsx
- Fixed mobile responsive layout (was rendering desktop styles)
- Added `md:hidden`, proper truncation, safe area insets

### web/src/pages/dex/[...slug].tsx
- Added error handling in handlePlayTrack
- Real wallet balances
- Real backend stats

### web/src/components/Post/Posts.tsx
- Increased overscanCount from 3 to 5 for feed stability

---

## Next Steps

1. **Test OAuth after cache clear** - The logging will show exactly where it fails
2. **If 10s timeout triggers** - Magic SDK iframe isn't loading properly
3. **Check Magic Dashboard** - Verify OAuth configuration
4. **If still broken** - May need to contact Magic.link support

---

**Status:** OAuth fixes deployed (needs testing) | Mobile player fixed | DEX crash fixed | Feed fixed
