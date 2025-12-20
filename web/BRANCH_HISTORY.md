# SoundChain Branch History Reference

## Quick Reference Commands

### Check legacy code in develop branch:
```bash
# View a file from develop branch (without switching)
git show origin/develop:path/to/file.ts

# Example - see legacy EmbedService:
git show origin/develop:api/src/services/EmbedService.ts

# Example - see legacy NormalizeEmbedLinks:
git show origin/develop:web/src/utils/NormalizeEmbedLinks.ts

# Search for commits with keyword across ALL branches:
git log --all --oneline --grep="embed" -i

# See commit history for a specific file across branches:
git log --all --oneline -- path/to/file.ts
```

---

## Branch Overview

| Branch | Commits | Status | Notes |
|--------|---------|--------|-------|
| **production** | 4,637 | Active - Live site | Current main branch |
| **develop** | 4,088 | Archived | Legacy 2021-2023 development |
| **staging** | 4,003 | Archived | Legacy pre-prod testing |
| **develop-old** | 3,071 | Archived | Even older development |
| **staging-old** | 3,060 | Archived | Even older staging |

---

## Legacy Files (develop branch)

### API Services
| File | Purpose |
|------|---------|
| `api/src/services/EmbedService.ts` | Server-side embed URL extraction (Cheerio scraping) |
| `api/src/services/PostService.ts` | Post CRUD operations |
| `api/src/services/TrackService.ts` | Track management |
| `api/src/resolvers/PostResolver.ts` | GraphQL post resolvers |

### Web Utilities
| File | Purpose |
|------|---------|
| `web/src/utils/NormalizeEmbedLinks.ts` | URL-to-embed conversion |
| `web/src/components/Post/Post.tsx` | Post rendering with embeds |
| `web/src/components/LinksModal.tsx` | Media link picker modal |
| `web/src/components/PostLinkInput.tsx` | URL input with validation |

---

## Feature Implementation Timeline

### Embed System (2021)
```
July 2021: Initial post system
Aug 10: YouTube + SoundCloud embeds
Aug 11: Spotify + Vimeo embeds
Aug 25: Embed links in post field
Sep 16: Bandcamp embed (EmbedService.ts created)
```

### Authentication Evolution
```
2021: MetaMask wallet connect
2022: Magic Link email auth
2023: Google OAuth added
2024: Guest mode + wallet address posts
2025: Magic OAuth improvements
```

### NFT/Marketplace
```
2021: Basic NFT minting on Polygon
2022: OGUN token + marketplace
2022: Auction system
2023: Multi-edition tracks
2024: Base chain support
2025: ZetaChain swap integration
```

### Social Features
```
2021: Posts + reactions
2021: Comments + reposts
2022: Notifications system
2023: DM messaging
2024: Emoji flurries + stickers
2025: Waveform comments (SoundCloud-style)
```

---

## Commit Search Patterns

### Find embed-related commits:
```bash
git log --all --oneline --grep="embed\|mediaLink\|iframe" -i | head -30
```

### Find authentication commits:
```bash
git log --all --oneline --grep="auth\|login\|magic\|oauth\|wallet" -i | head -30
```

### Find NFT/blockchain commits:
```bash
git log --all --oneline --grep="nft\|mint\|blockchain\|contract\|polygon" -i | head -30
```

### Find waveform commits:
```bash
git log --all --oneline --grep="waveform\|wavesurfer" -i | head -30
```

---

## Key Legacy Commits (develop branch)

### Embed Features
| Commit | Date | Description |
|--------|------|-------------|
| `46e588d48` | 2021-08-10 | YouTube/SoundCloud in posts |
| `351f8aea2` | 2021-08-11 | Spotify link support |
| `163ef686f` | 2021-08-11 | Vimeo embed |
| `3bb1f5e41` | 2021-09-16 | Bandcamp embed + EmbedService |
| `93835f335` | 2021-09-16 | Merge bandcamp-embed branch |

### Audio Player
| Commit | Date | Description |
|--------|------|-------------|
| `8bc7fb7f5` | 2022 | Audio player development |
| `37d0e9523` | 2022 | Mobile/Desktop players |
| `d1739e483` | 2022 | Mobile bottom audio player |

### Marketplace
| Commit | Date | Description |
|--------|------|-------------|
| `52847fa9d` | 2022 | OGUN marketplace |
| `10042d6ae` | 2022 | Contract logic + marketplace details |
| `0e01a6e22` | 2022 | Single currency type |

---

## How to Restore Legacy Patterns

If you need to understand how something worked in the legacy era:

1. **Find the file in develop branch:**
   ```bash
   git show origin/develop:path/to/file.ts | less
   ```

2. **Compare with production:**
   ```bash
   git diff origin/develop origin/production -- path/to/file.ts
   ```

3. **Find when a pattern was changed:**
   ```bash
   git log --oneline --all -- path/to/file.ts | head -20
   ```

4. **See full commit with changes:**
   ```bash
   git show COMMIT_HASH --stat
   git show COMMIT_HASH -- path/to/file.ts
   ```

---

## Notes

- The **develop** branch stopped receiving updates around 2023
- **production** became the main branch for direct pushes
- Legacy patterns (like EmbedService) may be useful reference for fixes
- Always check develop branch when debugging "how it used to work"
