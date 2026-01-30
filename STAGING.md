# STAGING.md - Feature Queue

**Last Updated:** January 30, 2026

Features and improvements queued for future implementation.

---

## High Priority

### 1. NFT Mint Discord Blast
**Channel:** #general-chat
**Webhook:** `https://discord.com/api/webhooks/1466934816938397797/JXki-oabEedhgHE7i_oMFrAklD903gnGBsSgJL4oRKe3R1FlgstrmXOf3l3OYMM3D4aX`

**Trigger:** When any user mints an NFT on SoundChain

**Discord Message Format:**
```
🎵 NEW NFT MINTED on SoundChain!

Artist: {artistName}
Track: {trackTitle}
Edition: {editionSize} copies
Price: {price} POL

🔗 Listen & Collect: https://soundchain.io/dex/track/{trackId}
```

**Implementation:**
- Add webhook call to `api/src/services/TrackEditionService.ts` after successful `createEdition()`
- Include cover art as embed image
- Rate limit: Max 1 notification per track (not per edition copy)

---

## Medium Priority

### 2. Vercel Deployment Notifications
**Status:** Webhooks configured on "web" project
**Channels:** #github (deployments), #general-chat (major releases)

---

## Ideas / Backlog

- SPid (Social Post ID) rewards for permanent posts
- Solana wallet integration
- Multi-chain OGUN liquidity pools

---
