# Claude Code Session - SoundChain Development
**Last Updated:** December 11, 2025
**Agent:** Claude Code (Opus 4.5)
**Branch:** production

---

## Current Focus: OAuth Login + Multi-Wallet Support

### Active Issues
1. **Google/Email OAuth Login** - Stuck on spinner (Discord/Twitch work fine)
2. **Genre Loading Error** - Red badge on DEX dashboard (API fix deployed, awaiting verification)

### Recent Changes (This Session)

#### OAuth Login Fix - Popup Removed
**File:** `web/src/pages/login.tsx`
**Change:** Removed `loginWithPopup` code that was causing black screen with spinner
**Commit:** `4ff26dbe` - "fix: Remove loginWithPopup, use only loginWithRedirect for OAuth"
**Status:** Deployed to Vercel (13:32 build)

The loginWithPopup was added to try widget-based OAuth but caused a black screen. Reverted to only using `loginWithRedirect`.

---

## OAuth2 Architecture (Magic SDK)

### Auth Flow
1. User clicks Google/Discord/Twitch button
2. `handleSocialLogin()` calls `oauth2.loginWithRedirect({ provider, redirectURI })`
3. Browser redirects to OAuth provider
4. After auth, provider redirects back to `/login`
5. `getRedirectResult()` in useEffect retrieves the token
6. Token exchanged for JWT via `login` mutation

### Files
- `web/src/pages/login.tsx` - Frontend OAuth handling
- `api/src/resolvers/UserResolver.ts` - Login mutation (lines 73-130)
- `api/src/services/AuthService.ts` - User registration/lookup
- `api/src/services/UserService.ts` - Wallet updates

### Magic Instance
```typescript
const createAuthMagic = () => {
  return new Magic(MAGIC_KEY, {
    extensions: [new OAuthExtension()],
  });
};
```
**Important:** No network config for OAuth - network config causes OAuth to hang.

---

## Multi-Wallet Support (Implemented)

### User Model Fields
```typescript
googleWalletAddress?: string;    // Google OAuth wallet
discordWalletAddress?: string;   // Discord OAuth wallet
twitchWalletAddress?: string;    // Twitch OAuth wallet
emailWalletAddress?: string;     // Email magic link wallet
magicWalletAddress: string;      // Default/legacy wallet
metaMaskWalletAddressees: string[]; // External MetaMask wallets
```

### Wallet Update Flow
On login, if wallet address changed:
1. `UserResolver.login()` checks current wallet vs Magic's publicAddress
2. Calls `userService.updateOAuthWallet()` with provider type
3. Updates provider-specific field + magicWalletAddress

### UI
DEX wallet tab shows "OAuth Wallets" section with 4 provider cards (2x2 grid)

---

## API Deployment

### GitHub Actions
- Triggers on push to `api/**` files
- Builds and deploys Lambda functions
- Environment: AWS Lambda + DocumentDB

### Genre Fix
**Commit:** `7a7e12f9` - "fix: Make TrackEdition.marketplace nullable"
**File:** `api/src/models/TrackEdition.ts:28-30`
**Status:** In production branch, deployed via GitHub Actions

---

## Known Issues

### 1. OAuth Redirect Not Triggering
- Google "Test Connection" works in Magic Dashboard
- People API enabled in Google Cloud Console
- OAuth consent screen in production mode
- Redirect URIs configured correctly
- But clicking "Login with Google" doesn't redirect

**Investigation needed:** Why `loginWithRedirect` doesn't trigger browser navigation

### 2. Mongoose Symbol Error (Low Priority)
Console shows Symbol-related error when loading tracks. Separate from OAuth issue.

---

## Environment

### Magic Link
- SDK: `magic-sdk@31.2.0`, `@magic-ext/oauth2@13.2.0`
- Live Key: `pk_live_858EC1BFF763F101`
- Dashboard: Providers configured (Google, Discord, Twitch)

### Google OAuth
- Client ID configured in Magic Dashboard
- Redirect URIs: `https://auth.magic.link/v1/oauth2/...` (Magic handles)
- APIs enabled: People API

### Deployment
- Web: Vercel (auto-deploy on push)
- API: AWS Lambda via GitHub Actions
- DB: AWS DocumentDB

---

## Quick Commands

```bash
# Push all (from root)
git push origin production

# Local dev
cd /Users/soundchain/soundchain/web && yarn dev

# API local (requires SSH tunnel for DocumentDB)
cd /Users/soundchain/soundchain/api && yarn start:local
```

---

## Session History

### December 11, 2025 (Afternoon)
- Fixed OAuth to use context Magic instance (has network config)
- Removed loginWithPopup (caused black screen)
- Deployed commit `f3448755` - uses `magic` from context, falls back to `authMagicRef`
- New login chunk: `login-a350f610be325d17.js`

**Key insight:** The separate auth-only Magic instance (without network config) was the issue.
The context Magic instance has proper `network: { rpcUrl, chainId }` config and works.

### Previous Sessions
- Added multi-wallet support (4 OAuth providers)
- Fixed genre loading (TrackEdition.marketplace nullable)
- Fixed feed embed glitch (ReactPlayer with light prop)
- Fixed bottom audio player positioning
- Fixed NFT pagination (50 -> 20)

---

**Status:** OAuth login under investigation | Genre fix deployed | Multi-wallet implemented
