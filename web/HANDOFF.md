# SoundChain Codebase Handoff Document

**Last Updated:** January 5, 2026
**Total Commits:** 4,800+ on production branch
**Project Start:** July 14, 2021

---

## ⚠️ CRITICAL: CURRENT STATUS (Jan 5, 2026)

### Google OAuth Login Status - FIXED ✅
- **Mobile Chrome:** WORKING - using `loginWithPopup`
- **Desktop Chrome:** WORKING - using `loginWithPopup`
- **Fix Commit:** `17921861f` - switched from broken `loginWithRedirect` to `loginWithPopup`
- **Login prompt bug:** FIXED in `fc9f60ae2` - checks localStorage token as backup

### URGENT: Google OAuth Users Locked Out
- Need to query DB for users with `authMethod: 'google'`
- Bastion host is STOPPED - start it to run query
- Query: `db.collection('users').find({ authMethod: 'google' })`

### Legacy Wallet Functionality - MOSTLY INTEGRATED ✅
User provided 9 legacy screenshots. After analysis, most functionality **already exists** in production:

**Already Working:**
- ✅ `useBlockchainV2.ts` - Full blockchain operations (sendMatic, sendOgun, NFT operations)
- ✅ `TransferConfirmationModal.tsx` - Transaction confirmation with gas fees and 2FA
- ✅ `WalletSelected.tsx` - Wallet display component
- ✅ `useMaxGasFee.tsx` - Gas fee estimation
- ✅ `MaxGasFee.tsx` - Gas fee display component
- ✅ `useWalletContext.tsx` - DefaultWallet switching (re-enabled in `4bf71c332`)

**Jan 5 Fixes:**
- `94b2735e7` - MetaMask now falls back to WalletConnect (instead of install page redirect)
- `4bf71c332` - Re-enabled DefaultWallet switching mutation (was disabled due to webpack issue)

**Completed:**
- ✅ MATIC → POL rebrand done in `5b18600a0` (user-facing text only)

**Legacy reference files saved to:** `/src/legacy-reference/` (for comparison only)

### Package Versions That Work
```json
"@magic-ext/oauth2": "14.0.0",
"magic-sdk": "28.4.0",
"@magic-sdk/commons": "24.0.0"
```

### OAuth Debugging History (Jan 3-5, 2026)
The OAuth login has been unstable. Key commits in the debugging journey:
- `a6977e07b` (12/31) - Upgrade to @magic-ext/oauth2
- `9815054d4` (01/03) - Popup-based OAuth for Chrome
- `1895d4a61` (01/04) - Another oauth2 upgrade attempt
- `2d9b14660` (01/04) - Battery optimization + OAuth race fix
- `ea4c884e9` (01/05) - Popup flow for all platforms

**DO NOT** modify the global `useMe` hook - it breaks OAuth login flow.

---

## 📅 RECENT CHANGES (Dec 22, 2025 - Jan 5, 2026)

### January 6, 2026 - Rich oEmbed Share Previews
- `5e504f442` - Fix Discord/social media share previews
  - **Problem:** Share URLs showed plain text instead of rich embeds with artwork
  - **Solution:**
    - Updated `/api/oembed.ts` to fetch actual track/profile data from GraphQL
    - Added oEmbed discovery `<link>` tag to page Head
  - Now shares show: track title, artist name, artwork image, playable embed

### January 5, 2026 (Session 3) - Legacy Wallet + POL + SCid Worker
- `5b18600a0` - Rebrand MATIC to POL in all user-facing UI
- `4bf71c332` - Re-enable DefaultWallet switching mutation
- `94b2735e7` - MetaMask fallback to WalletConnect (instead of install redirect)
- **NEW:** Created SCid Worker (`~/soundchain-agent/scid_worker.py`) - Local AI assistant
  - Run `~/soundchain-agent/start_worker.sh` before sessions to save API tokens
  - Delegates bash, grep, file reads to local Ollama models (FREE)
  - See `~/soundchain-agent/HANDOFF_2026-01-05_SCidWorker.md` for details

### January 5, 2026 (Session 2)
- `86b522d21` - Remove await blocking OAuth redirect
- `3c5c13947` - Move LOGIN button closer to email field
- `b5c6dd6fa` - Restore working OAuth from a6977e07b
- `8b12edd7e` - Debug OAuth redirect logging (rolled back)
- `1625f8667` - Remove await blocking OAuth (first attempt)
- `7652f078d` - Add type=button to OAuth buttons
- `8a82f3e96` - Restore OAuth2 redirect flow
- `0e8b701ab` - Update HANDOFF.md with 2 weeks progress

### January 5, 2026 (Session 1)
- `0574b009e` - Revert login prompt fix (broke OAuth)
- `8f8676ecb` - Fix login prompt in AudioPlayerModal (REVERTED)
- `ba76fe294` - Remove debug code from wallet page
- `ea4c884e9` - Use popup flow for Google OAuth
- `471bdcb9a` - Reinstall OAuth2 extension

### January 4, 2026
- `2d9b14660` - Battery optimization + Google OAuth race condition fix
- `a979bd483` - Restore original wallet page
- `75ce69b96` - Restore Figma-style wallet cards with NFT rows
- `1895d4a61` - Upgrade to @magic-ext/oauth2 for Chrome
- `d13bd92cb` - Add Magic wallet.connectWithUI()
- `6680c4238` - Multi-chain aggregator + WalletConnect fix

### January 3, 2026
- `2b8ae01d1` - Full Backend dashboard from Figma
- `fe0724f33` - Major UI audit fixes
- `f23f5f327` - CRITICAL: defaultWallet is ENUM not address
- `87b1ab809` - NFT Collection modal with Figma grid
- `ba93030a5` - Figma-style NFT grid for wallet page
- `9815054d4` - Popup-based OAuth for Chrome (cookie blocking)
- `c8a85ba69` - Multi-wallet aggregator inline NFT display

### January 2, 2026
- `3b52dce4d` - Web3 Backend Dashboard + StreamingRewards FUNDED
- `e8413b55b` - Stake tab, Tip Bucket feature
- `ecf07b5e4` - Loop mode button in music player
- `8893fca2f` - OGUN streaming rewards with correct imports

### January 1, 2026
- `979b02fbd` - OGUN Streaming Rewards System
- `f27696761` - OGUN Staking panel in DEX
- `d01f31006` - Loop mode, chain explorers, mint chain selection
- `4773bed30` - Loop playback properly restarts track

### December 31, 2025
- `a6977e07b` - Upgrade to @magic-ext/oauth2 (LAST STABLE OAUTH?)
- `e166914ac` - Artwork fallback handling
- `c63bc8543` - window.location.origin for OAuth redirect
- `32d58b8ec` - Fix toggleFavorite in TracksGrid
- `864a00c3c` - Track grid cards in profile Music tab
- `af03df674` - Playlist bugs - delete, external links, NFT playback
- `d073425a3` - Comment system fixes - emote rendering

### December 30, 2025
- `e003f0b9a` - Critical GraphQL errors fixed
- `b889d2fa0` - SCid certificate upload to Create Modal
- `90b8576a5` - Developer Portal with API key management
- `aa797aef2` - Google login using shared Magic context
- `8c3c08464` - iOS text input fix (white text on white bg)

### December 29, 2025
- `26a3ec6ce` - Non-web3 SCid minting (Bandcamp/DistroKid style)
- `cb183851b` - Developer Platform for startup announcements
- `e4679b0e5` - Skip Web Audio API on iOS/Safari for CarPlay
- `8783b4bc6` - Deduplicate user avatars
- `a1cfa3977` - -24 LUFS audio normalization

### December 28, 2025
- `554738be7` - Pinata/IPFS streaming integration
- `ed7d127b9` - IPFS CID migration for decentralized streaming
- `75da829d3` - artworkWithFallback field resolver
- `1ffc42510` - Top Charts mobile display fixes

### December 26, 2025
- `b8c3a68ee` - SoundCloud-style waveform with comments
- `664b40e95` - Full-width static waveform visualization
- `be9ea3f35` - DAW-style vertical bars from center
- `6143c22f2` - Emoji picker and stickers for comments
- `677a066ab` - New Year's 2026 themed comment eruptions

### December 24, 2025
- `d761b9e04` - Library page shows real data
- `634ea4f73` - Playlist item mutations for external links
- `903aa7371` - Playlist tracks loading fix
- `d5b10ce30` - External link input to PlaylistDetail

### December 23, 2025
- `bf260835c` - Inline playable share cards for Twitter/Discord
- `5533fdb45` - Profile page posts feed loads correctly
- `e51208422` - Revamped playlist modal - external links
- `960423b1e` - Artwork upload to playlist creation
- `1b8284093` - Playlist play functionality + delete

---

**Related Documents:**
- `LEGACY_TO_DEX_MIGRATION.md` - Full audit of legacy flows to port
- `BRANCH_HISTORY.md` - Multi-branch reference guide
- `GIT_HISTORY_INDEX.md` - Key commits by feature

---

## 0. MULTI-BRANCH HISTORY (CRITICAL)

### Branch Commit Counts
| Branch | Commits | Era | Purpose |
|--------|---------|-----|---------|
| **production** | 4,637 | 2021-present | Live site deployments |
| **develop** | 4,088 | 2021-2023 | Legacy development branch |
| **develop-old** | 3,071 | 2021-2022 | Archived development |
| **staging** | 4,003 | 2021-2023 | Pre-production testing |
| **staging-old** | 3,060 | 2021-2022 | Archived staging |

### Legacy Embed Architecture (develop branch, 2021-2022)

The original embed system used **server-side URL normalization**:

**1. EmbedService.ts (API - Server Side)**
```typescript
// api/src/services/EmbedService.ts
import axios from 'axios';
import cheerio from 'cheerio';

export class EmbedService extends Service {
  async bandcampLink(url: string): Promise<string> {
    const html = await axios.get(url);
    const $ = cheerio.load(html.data);
    const embedUrl = $('meta[property="og:video"]').attr('content');
    return embedUrl || '';
  }
}
```

**2. NormalizeEmbedLinks.ts (Web - Client Side)**
```typescript
// Converts user URLs to embed-ready URLs
getNormalizedLink(url) → embedUrl

// Platform normalizations:
// YouTube: extract videoId → /embed/videoId
// Spotify: extract trackId → /embed/track/trackId
// SoundCloud: oEmbed API → iframe src
// Vimeo: extract videoId → /video/videoId
// Bandcamp: GraphQL bandcampLink query → EmbedService scrapes og:video
```

### Key Embed Commits Timeline (2021)
| Date | Commit | Description |
|------|--------|-------------|
| 2021-07-29 | `459f8c043` | Add SoundCloud link field |
| 2021-08-10 | `46e588d48` | YouTube/SoundCloud show in posts |
| 2021-08-11 | `351f8aea2` | Added Spotify link |
| 2021-08-11 | `163ef686f` | Added Vimeo embed |
| 2021-08-17 | `228a9846b` | Adding mediaLink as optional |
| 2021-08-25 | `542f2e4f6` | Embed links on new post field |
| 2021-09-14 | `a9bcb45d2` | Fix embed link |
| 2021-09-16 | `3bb1f5e41` | **Added Bandcamp embed** (EmbedService created) |

### Branch Divergence
- **develop** branch has legacy code patterns (EmbedService, older component structure)
- **production** branch evolved with different patterns (direct iframes, ReactPlayer)
- When searching for "how things worked before" - check develop branch!

### KEY DIFFERENCES: Legacy (develop) vs Current (production)

| Feature | Legacy (develop) | Current (production) |
|---------|------------------|---------------------|
| **Pages** | Separate files: `/home.tsx`, `/explore.tsx`, `/library.tsx` | Consolidated: `/dex/[...slug].tsx` mega-router |
| **Post Embeds** | Simple iframe with `post.mediaLink`, 250px height | Platform-specific heights, loading states |
| **Lists** | `react-window` virtualized lists | Standard React rendering |
| **Components** | `GridView`, `ListView`, `ExploreAll` | `CompactPost`, `Post` with views integrated |
| **Navigation** | `TabsMenu` component | Integrated in DEX page |
| **Feed** | `/home` → `Feed` component → `Posts` | `/dex/feed` → mega-router |

### Legacy Component Patterns Worth Restoring

**1. Simple Post Embed (develop branch):**
```tsx
{post.mediaLink && (
  hasLazyLoadWithThumbnailSupport(post.mediaLink) ? (
    <ReactPlayer url={post.mediaLink} light />
  ) : (
    <iframe src={post.mediaLink} className="min-h-[250px] w-full" />
  )
)}
```

**2. Virtualized Posts List (develop branch):**
```tsx
import { VariableSizeList as List } from 'react-window'
import InfiniteLoader from 'react-window-infinite-loader'
// Uses react-virtualized-auto-sizer for performance
```

**3. TabsMenu Navigation (develop branch):**
```tsx
<TabsMenu
  isGrid={isGrid}
  setIsGrid={setIsGrid}
  sorting={sorting}
  setSorting={setSorting}
  tabList={[ExploreTab.ALL, ExploreTab.TRACKS, ExploreTab.USERS]}
  selectedTab={selectedTab}
  setSelectedTab={setSelectedTab}
/>
```

**4. GridView for Tracks (develop branch):**
```tsx
<GridView
  loading={loading}
  hasNextPage={pageInfo.hasNextPage}
  loadMore={loadMore}
  tracks={tracks}
  handleOnPlayClicked={handleOnPlayClicked}
/>
```

### Commands to View Legacy Code
```bash
# View legacy Post component:
git show origin/develop:web/src/components/Post/Post.tsx

# View legacy Explore component:
git show origin/develop:web/src/components/pages/ExplorePage/Explore.tsx

# View legacy GridView:
git show origin/develop:web/src/components/GridView/GridView.tsx

# View legacy Posts list:
git show origin/develop:web/src/components/Post/Posts.tsx
```

---

## 1. PROJECT OVERVIEW

SoundChain is a Web3 music platform combining:
- **NFT Marketplace** - Buy/sell music NFTs with auctions and fixed price listings
- **Social Feed** - Instagram/X style posts with media embeds, reactions, comments
- **Audio Streaming** - Track playback with waveform visualization
- **Creator Tools** - Upload tracks, create editions, manage royalties
- **DEX Interface** - Decentralized exchange for NFT trading

### Tech Stack
- **Frontend:** Next.js, React, TypeScript, TailwindCSS, Apollo Client
- **Backend (API):** Node.js, TypeGraphQL, MongoDB (DocumentDB), TypeORM/Typegoose
- **Blockchain:** Polygon (MATIC), OGUN token, ERC-721/ERC-1155 NFTs
- **Infrastructure:** AWS Lambda, Vercel, S3, CloudFront

---

## 2. KEY FEATURE AREAS

### 2.1 Media Embeds (Current Focus)
**Status:** Working - iframe embeds for audio platforms restored

Key commits:
- `5cb6c8d54` - Replaced iframes with link cards (reverted approach)
- `fdd4c44c7` - Improved iframe embed compatibility
- `09ca043e6` - Platform-specific embed heights (Bandcamp 470px, Spotify 352px, SoundCloud 166px)
- `1cfc67d8a` - Direct iframe embeds for Spotify/SoundCloud/Bandcamp
- `8820e6db7` - Live embed preview for ALL platforms
- `c48c9a86a` - Embed thumbnails for Spotify, SoundCloud, Bandcamp, Vimeo

**Implementation:**
- `src/components/Post/Post.tsx` - Main post component with embed rendering
- `src/utils/NormalizeEmbedLinks.ts` - URL normalization to embed format
- `src/types/MediaProvider.ts` - Platform type definitions

**URL Normalization:**
- Spotify: `open.spotify.com/track/X` → `open.spotify.com/embed/track/X`
- SoundCloud: Uses oEmbed API via `normalizeSoundcloud()`
- Bandcamp: Uses GraphQL `BandcampLinkDocument` query
- YouTube: Already supported by ReactPlayer

### 2.2 Waveform with Comments (SoundCloud-style)
**Status:** Component exists, integrated into track details

Key commits:
- `ff3228f5a` - Add bookmark system and SoundCloud-style waveform comments

**Files:**
- `src/components/WaveformWithComments.tsx` - Main waveform component
- `src/hooks/useTrackComments.ts` - Hook for comment CRUD
- `api/src/resolvers/TrackCommentResolver.ts` - GraphQL resolver
- `api/src/models/TrackComment.ts` - MongoDB model

**Features:**
- WaveSurfer.js visualization
- Timestamped comments as avatar markers
- Click waveform to add comment at timestamp
- Hover to see comment popup
- Syncs with global audio player

### 2.3 Authentication
**Methods supported:**
- Magic Link (email)
- Google OAuth
- Discord OAuth
- Twitch OAuth
- Guest posting (wallet-only, no account)

Key commits:
- Google OAuth integration
- Guest posting without wallet requirement

### 2.4 Feed System
**Views:**
- Grid view (Instagram-style cards)
- List view (horizontal cards)
- Detail view (full post modal)

Key commits:
- `406480de0` - Instagram desktop-style feed layout
- `844f9a50c` - Premium Web3 UI for feed cards
- `0d1043797` - Feed as default view

**Post Types:**
- Text-only posts
- Media link posts (YouTube, Spotify, SoundCloud, Bandcamp, etc.)
- Track posts (attached NFT/track)
- Repost posts
- Ephemeral posts (24h expiring media)

### 2.5 NFT/Marketplace
**Listing Types:**
- Auctions (time-limited bidding)
- Buy Now (fixed price)
- Editions (multiple copies)

**Blockchain:**
- Polygon network
- OGUN token for payments
- MATIC for gas

### 2.6 Universal Playlist (NEW - December 2025)
**Status:** Complete - Full implementation for mobile and desktop

**Vision:** SoundChain playlists are the world's first universal music aggregator that supports:
- **SoundChain NFTs** - Owned and marketplace tracks
- **External URLs** - YouTube, SoundCloud, Bandcamp, Spotify, Apple Music, Tidal, Vimeo, custom links
- **User Uploads** - Drag-and-drop audio files (S3 integration pending)

**Why This Matters:** This makes soundchain.io the only site that allows any link or file from private hosts to be added to playlists alongside SoundChain NFTs. Foundation for OGUN streaming rewards integration.

**API Files:**
- `api/src/models/PlaylistTrack.ts` - Extended with `sourceType`, `externalUrl`, `uploadedFileUrl`, `title`, `artist`, `artworkUrl`, `duration`, `position`
- `api/src/types/AddPlaylistItem.ts` - Input type for universal playlist items
- `api/src/types/AddPlaylistItemPayload.ts` - Mutation response types
- `api/src/services/PlaylistService.ts` - Added `addPlaylistItem()`, `deletePlaylistItem()`, `reorderPlaylistItems()`
- `api/src/resolvers/PlaylistResolver.ts` - Added mutations for universal playlist

**Frontend Files:**
- `web/src/components/Playlist/AddToPlaylistModal.tsx` - URL input + drag-drop UI
- `web/src/components/Playlist/PlaylistDetail.tsx` - Updated to render mixed sources
- `web/src/components/Playlist/PlaylistCard.tsx` - Updated mosaic for mixed sources
- `web/src/lib/graphql.ts` - Added `PlaylistTrackSourceType` enum and mutations

**Source Types (PlaylistTrackSourceType):**
```typescript
enum PlaylistTrackSourceType {
  Nft = 'nft',           // SoundChain NFT track
  Youtube = 'youtube',   // YouTube video/music
  Soundcloud = 'soundcloud',
  Bandcamp = 'bandcamp',
  Spotify = 'spotify',
  AppleMusic = 'apple_music',
  Tidal = 'tidal',
  Vimeo = 'vimeo',
  Upload = 'upload',     // User-uploaded file
  Custom = 'custom',     // Any other URL
}
```

**Playback Behavior:**
- **NFT tracks:** Full playback with audio player
- **Uploaded files:** Full playback with audio player (when S3 integration complete)
- **External URLs:** Opens in new tab (embeds planned for future)

**Mutations:**
- `addPlaylistItem(input: AddPlaylistItemInput)` - Add any source type
- `deletePlaylistItem(playlistItemId: String)` - Remove item by ID
- `reorderPlaylistItems(playlistId: String, itemIds: [String])` - Reorder items

### 2.7 SCid (SoundChain ID)
**Status:** Complete with on-chain registry

Key commits:
- `2606be3e4` - Add SCid (SoundChain ID) - Web3 replacement for ISRC
- `c41e227ea` - Auto-generate SCid during track creation
- `3dc976594` - Add on-chain SCid registration to SCidService

**SCid Format:** `SC-[CHAIN]-[ARTIST_HASH]-[YEAR][SEQUENCE]`
- Example: `SC-POL-7B3A-2400001`
- Components: Prefix + Chain Code + 4-char Artist Hash + 2-digit Year + 5-digit Sequence

**Smart Contract:** `SCidRegistry.sol` (UUPS Upgradeable Proxy)
- On-chain registration of SCids with ownership verification
- Batch registration support (up to 100 per tx)
- Cross-chain verification queries
- Registrar role for backend authorization
- Deploy: `npx hardhat run scripts/deploy-scid-registry.ts --network polygon`

**API Integration:**
- Auto-generates SCid when track is created (`TrackService.createTrack`)
- `SCidService.registerOnChain()` - Register on-chain after creation
- `SCidContract.ts` - Ethers.js utility for contract interaction
- Requires `SCID_REGISTRY_SIGNER_KEY` env var for signing

**Files:**
- `api/src/utils/SCidGenerator.ts` - SCid generation logic
- `api/src/models/SCid.ts` - MongoDB model with status tracking
- `api/src/services/SCidService.ts` - Registration, streaming, OGUN rewards
- `api/src/utils/SCidContract.ts` - Smart contract interaction
- `soundchain-contracts/contracts/SCidRegistry.sol` - On-chain registry

---

## 3. DIRECTORY STRUCTURE

```
soundchain/
├── web/                          # Next.js frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Post/            # Post components (Post.tsx, CompactPost.tsx, etc.)
│   │   │   ├── pages/           # Page-specific components
│   │   │   ├── dex/             # DEX marketplace components
│   │   │   ├── modals/          # Modal dialogs
│   │   │   └── forms/           # Form components
│   │   ├── pages/               # Next.js pages
│   │   │   ├── dex/             # DEX routes
│   │   │   ├── posts/           # Post detail pages
│   │   │   └── profiles/        # Profile pages
│   │   ├── hooks/               # React hooks
│   │   ├── lib/                 # GraphQL client, generated types
│   │   ├── graphql/             # GraphQL operation files
│   │   ├── utils/               # Utility functions
│   │   └── types/               # TypeScript types
│   └── public/                  # Static assets
│
├── api/                          # GraphQL API (TypeGraphQL)
│   └── src/
│       ├── resolvers/           # GraphQL resolvers
│       ├── models/              # MongoDB/Typegoose models
│       ├── services/            # Business logic
│       └── types/               # Type definitions
│
└── soundchain-contracts/         # Smart contracts (Solidity)
```

---

## 4. IMPORTANT FILES

### Frontend Core
- `web/src/lib/graphql.ts` - Generated GraphQL types and hooks
- `web/src/lib/apollo.ts` - Apollo Client configuration
- `web/src/hooks/useAudioPlayer.tsx` - Global audio player context
- `web/src/hooks/useMe.ts` - Current user hook

### Post/Feed System
- `web/src/components/Post/Post.tsx` - Main post component
- `web/src/components/Post/CompactPost.tsx` - Grid view card
- `web/src/components/Post/Posts.tsx` - Post list/grid container
- `web/src/components/Post/PostActions.tsx` - Like/comment/share buttons
- `web/src/utils/NormalizeEmbedLinks.ts` - Embed URL conversion

### Audio/Waveform
- `web/src/components/WaveformWithComments.tsx` - SoundCloud-style waveform
- `web/src/components/MiniAudioPlayer.tsx` - In-post audio player
- `web/src/components/FastAudioPlayer.tsx` - Optimized audio player

### DEX/Marketplace
- `web/src/pages/dex/` - DEX page routes
- `web/src/components/dex/` - DEX components

---

## 5. RECENT CHANGES (December 2025)

### Completed December 22 (Late Session)

1. **Site Crash Fix** - Fixed `TypeError: Cannot read properties of undefined (reading 'FollowerCount')`
   - Removed non-existent `SortUserField.FollowerCount` from `RightSidebar.tsx`
   - Fixed field names in `LeftSidebar.tsx`: `coverPictureUrl` → `coverPicture`, `artistProfileId` → `profileId`

2. **Playlist Creation Fix** - Fixed mobile playlist creation failure
   - Added `errorPolicy: 'all'` to `CreatePlaylistModal.tsx` to handle partial GraphQL errors
   - API: Refetch document after save in `PlaylistService.ts` to avoid mongoose Symbol serialization error

3. **Now Playing Modal Redesign** - Matched legacy Figma design
   - Fire icon for favorites (with glow effect when active)
   - Rainbow gradient progress bar (teal → blue → purple → pink → yellow)
   - Mobile-first fullscreen layout
   - Expandable playlist section
   - File: `src/components/modals/AudioPlayerModal.tsx`

4. **Waveform in Bottom Player** - Added visual waveform like legacy
   - New `MiniWaveform` component with CSS-only animated bars
   - Rainbow gradient progress visualization
   - Click-to-seek support
   - Added to desktop bottom player (`BotttomPlayerTrackSlider.tsx`)
   - Mobile player gets gradient progress bar at top
   - Files: `src/components/common/BottomAudioPlayer/components/MiniWaveform.tsx`

5. **PlaylistDetail Enhancements** - BUY/LIST/EDIT buttons per track
   - Color-coded action buttons: cyan=buy, yellow=edit, purple=list, pink=auction
   - Shows NFT ownership status and pricing
   - Added NFT/pricing fields to GraphQL query

6. **Cloudflare Tunnel** - Quick tunnel for mobile remote testing
   - Current URL: `https://hourly-boulevard-epa-capable.trycloudflare.com`
   - URLs expire periodically, restart with: `launchctl stop/start com.cloudflare.tunnel`
   - Fixed IPv6 issue - now uses 127.0.0.1 instead of localhost in plist config

7. **Profile Page Tabs** - Added Feed | Music | Playlists tabs like legacy Figma
   - Tab bar with colored underlines (cyan=feed, purple=music, pink=playlists)
   - Feed tab shows posts, Music tab shows tracks, Playlists tab placeholder
   - Create Playlist button visible on own profile
   - File: `src/pages/dex/[...slug].tsx` (profile view section ~line 4600)

8. **Create Playlist Modal Redesign** - Matched legacy Figma design
   - Three tabs: Post | Playlist | Mint (green active indicator)
   - Change Artwork section with ImagePlus icon
   - Name input field with placeholder "Banging Beats"
   - Add track button with search dropdown (searches all tracks)
   - Selected tracks list with REMOVE buttons
   - Green "CREATE PLAYLIST" button
   - File: `src/components/Playlist/CreatePlaylistModal.tsx`

### Completed December 22 (Earlier)
1. **Universal Playlist Aggregator** - Full implementation for mobile and desktop
   - SoundChain playlists now support NFTs, external URLs, and file uploads
   - API: `PlaylistTrack` model extended, new mutations added
   - Web: `AddToPlaylistModal` with URL input and drag-drop zone
   - `PlaylistDetail` updated to render mixed sources with platform badges
   - Source icons: YouTube (red), SoundCloud (orange), Spotify (green), etc.
   - External links open in new tab, NFTs/uploads play in audio player

### Completed December 19-21
1. **Embed Fix** - Restored iframe embeds for Spotify/SoundCloud/Bandcamp (LEGACY UI STYLE)
   - Posts now show embedded players INSIDE the post cards (not redirect links)
   - Uses direct iframe with `post.mediaLink` URL
   - Platform-specific heights: Bandcamp 470px, Spotify 352px, SoundCloud 166px
   - ReactPlayer for YouTube/Vimeo/Facebook with thumbnail support
   - Files updated: `Post.tsx`, `RepostPreview.tsx`
   - Grid view (CompactPost.tsx) uses gradient placeholders - clicking opens full post modal with embed

2. **Waveform Integration** - Added WaveformWithComments to DesktopTrackCard
   - Shows when track is playing
   - Syncs with audio player progress/seek

3. **GraphQL Types** - Added TrackComment types to graphql.ts
   - Queries: trackComments, trackCommentCount
   - Mutations: createTrackComment, deleteTrackComment, likeTrackComment

### Recent Features (Past Week)
- `a3a667fd2` - Fix .lean() for paginate serialization
- `7be628b03` - Fix SCid TypeScript build errors
- `2606be3e4` - Add SCid (SoundChain ID) feature
- `477aaad6d` - Expandable fullscreen audio player
- `3f46ba7e8` - Reduce users query page size

---

## 6. KNOWN ISSUES

### Pre-existing TypeScript Errors (not blocking build)
1. `SocialLinksForm.tsx` - Schema type mismatch
2. `CreateModal.tsx` - Buffer type and missing collaborators
3. `NFTPlayer.tsx` - WebTorrent type issues
4. `FavoriteArtists.tsx` - Query type mismatch
5. `useMetaMask.ts` - Web3 contract type issues

### Embed Considerations
- SoundCloud/Bandcamp URL normalization requires API calls (async)
- Some old posts may have non-embed URLs stored in database
- Fallback link cards shown while embed URL is being fetched

---

## 7. DEVELOPMENT COMMANDS

```bash
# Frontend
cd web
yarn dev                  # Start dev server
yarn build               # Production build
yarn codegen             # Regenerate GraphQL types (needs API running)

# API
cd api
yarn dev                 # Start API server
yarn start:local         # Start with local MongoDB

# Both
yarn tsc --noEmit        # Type check without build
```

---

## 8. COMMIT HISTORY PATTERNS

### Commit Message Conventions
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code restructuring
- `debug:` - Debugging changes
- `chore:` - Maintenance tasks

### Key Feature Commits to Reference

**Embeds:**
- `1cfc67d8a` - Direct iframe embeds (reference implementation)
- `09ca043e6` - Platform-specific heights
- `c48c9a86a` - Embed thumbnails

**Feed/Posts:**
- `406480de0` - Instagram desktop layout
- `844f9a50c` - Premium Web3 UI
- `67950062f` - Instagram-style media display

**Audio:**
- `ff3228f5a` - Waveform with comments
- `477aaad6d` - Expandable audio player

**Auth:**
- Google OAuth integration commits
- Guest posting commits

---

## 9. API ENDPOINTS

GraphQL endpoint: `/graphql`

### Key Queries
- `posts` - Feed posts with pagination
- `post` - Single post by ID
- `track` - Track details
- `trackComments` - Comments for waveform
- `me` - Current user

### Key Mutations
- `createPost` / `guestCreatePost`
- `reactToPost` / `retractReaction`
- `addComment` / `guestAddComment`
- `createTrackComment`
- `toggleFavorite`
- `bookmarkPost` / `unbookmarkPost`

---

## 10. ENVIRONMENT

### Required Environment Variables
- `NEXT_PUBLIC_API_URL` - GraphQL API URL
- `NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY` - Magic.link key
- `MONGODB_URI` - Database connection
- AWS credentials for S3/Lambda

### Deployment
- **Frontend:** Vercel
- **API:** AWS Lambda via Serverless Framework
- **Database:** AWS DocumentDB (MongoDB compatible)

---

*This document should be updated as features are added or changed.*
