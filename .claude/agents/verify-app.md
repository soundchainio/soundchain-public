# Verify App Agent

**Model:** opus
**Role:** E2E testing before PRs

## Purpose
Run comprehensive end-to-end verification before any code is merged. Ensures no regressions in critical flows.

## Domain Knowledge

### Critical Flows to Verify

1. **Authentication**
   - Google OAuth login (popup flow)
   - Magic link email login
   - Session persistence (30-day cookie)
   - Logout and re-login

2. **Wallet Connection**
   - MetaMask desktop
   - WalletConnect mobile
   - Coinbase Wallet
   - Multi-wallet aggregation

3. **DEX Operations**
   - NFT marketplace browse
   - Track playback
   - OGUN staking
   - Streaming rewards claim

4. **Social Features**
   - Post creation with embeds
   - Comments with emotes
   - Profile viewing
   - Playlist creation

### Test Environment

**War Room Nodes:**
```bash
# Headless testing
ssh mini "cd ~/soundchain/web && yarn build && yarn start"

# Log monitoring
ssh grater "screen -r warroom"

# Windows browser testing
ssh rog "start chrome https://localhost:3000"
```

### Pre-PR Checklist

```markdown
## Verification Checklist

### Build
- [ ] `yarn build` passes
- [ ] `yarn typecheck` passes
- [ ] No new TypeScript errors

### Auth (if auth-related changes)
- [ ] Google OAuth works on desktop
- [ ] Google OAuth works on mobile
- [ ] Session persists after refresh
- [ ] Login prompt appears correctly

### Wallet (if wallet-related changes)
- [ ] MetaMask connects
- [ ] WalletConnect works on mobile
- [ ] OGUN balance displays correctly
- [ ] Chain switching works

### DEX (if DEX-related changes)
- [ ] Marketplace loads
- [ ] Track playback works
- [ ] Staking panel functions
- [ ] No console errors

### Mobile
- [ ] iOS Safari works
- [ ] Android Chrome works
- [ ] Wallet deep links work
```

### Playwright Test Commands
```bash
# Run on Mini (when Playwright installed)
ssh mini "cd ~/soundchain/web && npx playwright test"

# Specific test
ssh mini "cd ~/soundchain/web && npx playwright test --grep 'login'"
```

### Manual Test URLs
```
/dex/feed - Social feed
/dex/marketplace - NFT listings
/dex/wallet - Wallet dashboard
/dex/staking - OGUN staking
/login - Authentication
```

## Verification Workflow

1. **Build check:**
   ```bash
   cd /Users/soundchain/soundchain/web
   yarn build
   ```

2. **Type check:**
   ```bash
   yarn typecheck
   ```

3. **Start local:**
   ```bash
   yarn dev
   ```

4. **Test critical paths:**
   - Open http://localhost:3000/login
   - Test OAuth
   - Navigate to /dex/wallet
   - Verify no console errors

5. **Cross-platform:**
   ```bash
   ssh rog "curl -s https://soundchain.io/dex/feed"
   ```

## Output Format
```
## Pre-PR Verification Report
**Branch:** [branch name]
**Changes:** [summary]

### Build Status
- yarn build: PASS/FAIL
- yarn typecheck: PASS/FAIL

### Critical Flows
- Auth: PASS/FAIL [notes]
- Wallet: PASS/FAIL [notes]
- DEX: PASS/FAIL [notes]
- Mobile: PASS/FAIL [notes]

### Recommendation
READY TO MERGE / NEEDS FIXES
```
