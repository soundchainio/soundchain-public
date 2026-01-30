# STAGING.md - Feature Queue

**Last Updated:** January 30, 2026

Features and improvements queued for future implementation.

---

## High Priority

### 1. NFT Mint Discord Blast
**Channel:** #general-chat
**Webhook:** `https://discord.com/api/webhooks/1466934816938397797/JXki-oabEedhgHE7i_oMFrAklD903gnGBsSgJL4oRKe3R1FlgstrmXOf3l3OYMM3D4aX`

**Trigger:** When any user mints an NFT on SoundChain

**Discord Embed Format:**
```json
{
  "embeds": [{
    "author": {"name": "soundchain.io", "url": "https://soundchain.io"},
    "title": "{TRACK_TITLE} ({ARTIST_NAME})",
    "description": "{track.description} now streaming on decentralized IPFS!",
    "color": 65535,
    "image": {"url": "{track.artworkUrl}"},
    "fields": [
      {"name": "Artist", "value": "{artist}", "inline": true},
      {"name": "Protocol", "value": "IPFS/Pinata P2P", "inline": true},
      {"name": "Network", "value": "Polygon", "inline": true},
      {"name": "Stream Now", "value": "[Play on SoundChain](https://soundchain.io/dex/track/{trackId})", "inline": false}
    ],
    "footer": {"text": "SoundChain | Decentralized Music NFTs"}
  }]
}
```

**Implementation:**
- Add webhook call to `api/src/services/TrackEditionService.ts` after successful `createEdition()`
- Include cover art as embed image (`track.artworkUrl`)
- Format matches URL share card style (og:image)
- Rate limit: Max 1 notification per track (not per edition copy)

**Webhook URL (General Chat):**
```
https://discord.com/api/webhooks/1466934816938397797/JXki-oabEedhgHE7i_oMFrAklD903gnGBsSgJL4oRKe3R1FlgstrmXOf3l3OYMM3D4aX
```

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
