# Git Commit History Index

This document indexes key commits by feature area for quick reference.

## EMBED/MEDIA SYSTEM

### Direct Embed Implementation
```
1cfc67d8a fix: Direct iframe embeds for Spotify/SoundCloud/Bandcamp + reliable guest posting
09ca043e6 fix: Use appropriate embed heights for Spotify/SoundCloud/Bandcamp
fdd4c44c7 fix: Improve iframe embed compatibility for Bandcamp/Spotify/SoundCloud
```

### Embed Thumbnails
```
c48c9a86a feat: Add embed thumbnails for Spotify, SoundCloud, Bandcamp, Vimeo
7941429c6 feat: Add mediaThumbnail field + server-side oEmbed thumbnail fetching
9fb04b824 feat: Add client-side oEmbed proxy for embed thumbnails
014244c40 feat: Add originalMediaLink for better oEmbed thumbnail lookups
```

### Live Embed Preview
```
8820e6db7 feat: Live embed preview for ALL platforms in both grid and list views
9e390a66c feat: Show live embed preview for Spotify/SoundCloud/Bandcamp instead of gradient placeholder
6af81b11f feat: Make feed posts playable inline with ReactPlayer
```

### ReactPlayer Integration
```
7945a4651 fix: Use ReactPlayer light mode for YouTube/Vimeo/Facebook thumbnails in grid
dc5afd92d fix: Restore ReactPlayer with light mode for feed embeds
b65266a66 fix: YouTube embed thumbnails not loading
```

## FEED/POST SYSTEM

### Instagram-Style Layout
```
406480de0 feat: Instagram desktop-style feed layout
67950062f fix: Instagram-style media display, remove camera icon, fix embeds
844f9a50c feat: Premium Web3 UI for feed cards with post modal
```

### Feed Features
```
0d1043797 feat: Feed as default view + fix profile routing + audio embeds
186d7cdb3 feat: Public feed access + improved embed thumbnails
67f87cfc7 feat: Improve compact feed view and Users tab
```

### Post Width/Layout
```
11cb12fdf fix: Wider posts (614px), platform-specific embed heights, fallback for non-embed URLs
```

## WAVEFORM/AUDIO

### SoundCloud-Style Waveform
```
ff3228f5a feat: Add bookmark system and SoundCloud-style waveform comments
```

### Audio Player
```
477aaad6d feat: Add expandable fullscreen audio player
728d0bd74 fix: Mobile audio player layout, DEX crash prevention, feed stability
```

### Waveform Legacy (Original Implementation)
```
9ee2050d7 waveform folder
4914b6d4e waveform folder
a155857e5 Merge pull request #657 from agencyenterprise/fix_waveform_mobile_bug
4956c4e1b Merge pull request #652 from agencyenterprise/render_waveform_server
```

## NFT/BLOCKCHAIN

### SCid (SoundChain ID)
```
2606be3e4 feat: Add SCid (SoundChain ID) - Web3 replacement for ISRC
7be628b03 fix: Fix SCid TypeScript build errors for Typegoose compatibility
```

### NFT Features
```
(Search git log for "nft", "mint", "token", "edition" for full list)
```

## AUTHENTICATION

### Guest Posting
```
1cfc67d8a fix: Direct iframe embeds for Spotify/SoundCloud/Bandcamp + reliable guest posting
8389b4f2d fix: Enhanced platform thumbnails, enabled public posting without wallet
```

### OAuth
```
(Search git log for "oauth", "google", "magic", "discord" for full list)
```

## DEX/MARKETPLACE

### DEX Features
```
e81bcd233 fix: Add feedback and admin views to DEX, fix menu links
```

## EPHEMERAL/STORIES

### 24h Expiring Posts
```
(Recent feature - check commits mentioning "ephemeral", "expire", "stories")
```

## BUG FIXES - COMMON PATTERNS

### Feed Stability
```
f7b8cb082 fix: Prevent Feed re-render loop causing white screen glitch
810940f31 fix: Debounce feed row height updates to stop embed glitching
728d0bd74 fix: Mobile audio player layout, DEX crash prevention, feed stability
```

### Profile Crashes
```
941dac708 fix: Profile page crash + video embed tab crash
```

---

## HOW TO SEARCH COMMITS

```bash
# Search by keyword
git log --oneline --all --grep="keyword" -i

# Search by file
git log --oneline --all -- path/to/file.tsx

# See commit details
git show <commit-hash>

# See file at specific commit
git show <commit-hash>:path/to/file.tsx
```
