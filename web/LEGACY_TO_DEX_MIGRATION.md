# Legacy to DEX Migration Audit

**Created:** December 19, 2025
**Purpose:** Port all legacy (develop branch) functionality to new DEX UI while keeping production features

---

## EXECUTIVE SUMMARY

### Branch Stats
| Branch | Commits | Era | Status |
|--------|---------|-----|--------|
| **production** | 4,637 | 2021-present | ACTIVE - New DEX UI |
| **develop** | 4,088 | 2021-2023 | ARCHIVED - Legacy functionality |

### Migration Goal
Port legacy functionality flows to new DEX mega-router while preserving:
- ZetaChain integration (23 tokens)
- Omnichain support
- Track collaborators
- Wallet enhancements
- All new components and features

---

## 1. SOCIAL NETWORK FLOWS

### Legacy (develop branch)
| Component | File | Functionality |
|-----------|------|---------------|
| `Post` | `components/Post/Post.tsx` | Simple iframe embeds, reactions, comments |
| `Posts` | `components/Post/Posts.tsx` | Virtualized list with `react-window` |
| `Feed` | `components/Feed.tsx` | User's personalized feed |
| `Comment` | `components/Comment/Comment.tsx` | Comment thread |
| `CommentForm` | `components/Comment/CommentForm.tsx` | Comment submission |
| `RepostPreview` | `components/Post/RepostPreview.tsx` | Repost rendering |

### Key Legacy Patterns
```typescript
// Virtualized Posts List (PERFORMANCE!)
import { VariableSizeList as List } from 'react-window'
import InfiniteLoader from 'react-window-infinite-loader'

// Simple Embed Pattern
{post.mediaLink && (
  hasLazyLoadWithThumbnailSupport(post.mediaLink)
    ? <ReactPlayer url={post.mediaLink} light />
    : <iframe src={post.mediaLink} className="min-h-[250px] w-full" />
)}
```

### Current (production) - What to Keep
- EmoteRenderer for animated emotes
- Guest posting with wallet address
- Emoji flurries
- Ephemeral 24hr posts
- FastAudioPlayer integration

### Migration Tasks
- [ ] Add `react-window` virtualization to feed for performance
- [ ] Simplify embed rendering (already fixed)
- [ ] Port PostFormTimeline for inline post creation

---

## 2. MARKETPLACE FLOWS

### Legacy Pages (develop branch)
| Page | Route | Functionality |
|------|-------|---------------|
| Marketplace | `/marketplace` | Browse listings with filters |
| List Auction | `/tracks/[id]/list/auction` | Create auction listing |
| List Buy Now | `/tracks/[id]/list/buy-now` | Create fixed price listing |
| Place Bid | `/tracks/[id]/place-bid` | Bid on auction |
| Buy Now | `/tracks/[id]/buy-now` | Purchase fixed price NFT |
| Complete Auction | `/tracks/[id]/complete-auction` | Finalize auction |
| Cancel Auction | `/tracks/[id]/cancel-auction` | Cancel auction |

### Legacy Components
| Component | Functionality |
|-----------|---------------|
| `ListNFTAuction` | Auction listing form with start/end times |
| `ListNFTBuyNow` | Fixed price listing form |
| `BuyNow` | Purchase confirmation with token selection |
| `Auction` | Auction display with timer |
| `BidsHistoryModal` | Bid history popup |
| `PriceCard` | Price display with buy/bid buttons |
| `FilterMarketplaceModal` | Marketplace filters |

### Legacy Smart Contract Integration
```typescript
// useBlockchainV2.ts - Key functions
createAuction(tokenId, weiPrice, startTimestamp, endTimestamp, account, { nft: contractAddress })
placeBid(tokenId, bidAmount)
buyItem(tokenId, priceInWei)
cancelAuction(tokenId)
completeAuction(tokenId)
```

### Current (production) - What to Keep
- ZetaChain multi-token support (23 tokens)
- Base chain integration
- Token price conversion (convertToUSD)
- New marketplace UI components

### Migration Tasks
- [ ] Port auction creation flow to DEX modal
- [ ] Port bid placement flow to DEX modal
- [ ] Port buy now flow to DEX modal
- [ ] Port OGUN token payment option
- [ ] Integrate BidsHistoryModal
- [ ] Port FilterMarketplaceModal functionality

---

## 3. WALLET FLOWS

### Legacy Pages (develop branch)
| Page | Route | Functionality |
|------|-------|---------------|
| Wallet Index | `/wallet` | Wallet overview |
| Transfer | `/wallet/transfer` | Send tokens |
| Transfer OGUN | `/wallet/transferOgun` | Send OGUN tokens |
| Buy | `/wallet/buy` | Buy tokens |
| History | `/wallet/[address]/history` | Transaction history |
| Receive | `/wallet/[address]/receive` | Receive address/QR |

### Legacy Components
| Component | Functionality |
|-----------|---------------|
| `TransferForm` | Token transfer form |
| `TransferConfirmationModal` | Transfer confirmation |
| `HistoryTabs` | History tab navigation |
| `InternalTransactionsTab` | Transaction list |
| `WalletSelector` | Wallet picker |
| `CopyWalletAddress` | Copy address button |
| `ConnectedNetwork` | Network display |

### Legacy Staking
| Page | Functionality |
|------|---------------|
| `/stake` | OGUN staking |
| `/lp-stake` | LP token staking |

### Current (production) - What to Keep
- WalletConnect v2 integration
- Multi-chain support (Polygon, Base, etc.)
- ZetaChain swap integration
- 23 token support
- TransferNfts component

### Migration Tasks
- [ ] Port TransferForm to DEX modal
- [ ] Port staking flows to DEX page
- [ ] Port transaction history view
- [ ] Integrate receive/QR flow
- [ ] Port OGUN-specific transfer logic

---

## 4. USER / PROFILE FLOWS

### Legacy Pages (develop branch)
| Page | Route | Functionality |
|------|-------|---------------|
| Profile | `/profiles/[handle]` | User profile with tabs |
| Settings Index | `/settings` | Settings menu |
| Settings Bio | `/settings/bio` | Edit bio |
| Settings Name | `/settings/name` | Edit display name |
| Settings Username | `/settings/username` | Edit username |
| Settings Social | `/settings/social-links` | Edit social links |
| Settings Picture | `/settings/profile-picture` | Change profile pic |
| Settings Cover | `/settings/cover-picture` | Change cover pic |
| Get Verified | `/get-verified` | Request verification |

### Legacy Profile Components
| Component | Functionality |
|-----------|---------------|
| `ProfileTabs` | Posts/Tracks/Playlists tabs |
| `ProfileCover` | Animated cover backgrounds |
| `FollowButton` | Follow/unfollow |
| `FollowersModal` | Followers/following list |
| `SubscribeButton` | Post notifications |
| `MessageButton` | Open DM |
| `SocialMediaLink` | Social link icons |

### Profile Tabs
```typescript
enum ProfileTab {
  POSTS = 'Posts',
  TRACKS = 'Tracks',
  PLAYLISTS = 'Playlists'
}
```

### Current (production) - What to Keep
- ProfileHeader component
- New avatar styling
- Badge display
- Wallet address button
- All new social link types

### Migration Tasks
- [ ] Port ProfileTabs component
- [ ] Port Playlists tab
- [ ] Port FollowersModal
- [ ] Port all settings pages to DEX modals
- [ ] Integrate verification request flow

---

## 5. TRACK / MINTING FLOWS

### Legacy Pages (develop branch)
| Page | Route | Functionality |
|------|-------|---------------|
| Track Details | `/tracks/[id]` | Full track page |
| Edit Auction | `/tracks/[id]/edit/auction` | Modify auction |
| Edit Buy Now | `/tracks/[id]/edit/buy-now` | Modify listing |

### Legacy Minting Components
| Component | Functionality |
|-----------|---------------|
| `CreateModal` | Full minting wizard |
| `TrackUploader` | Audio file upload |
| `TrackMetadataForm` | Metadata entry |
| `MintingDone` | Success modal |

### Minting Flow (CRITICAL)
```typescript
// CreateModal.tsx - Full flow:
1. handleFileDrop() → Parse ID3 tags with music-metadata-browser
2. setInitialValues() → Pre-fill form with extracted metadata
3. saveID3Tag() → Write ID3 tags back to MP3 with browser-id3-writer
4. upload() → Upload to storage
5. pinToIPFS() → Pin audio to IPFS
6. createMultipleTracks() → Create track in database
7. createEdition() → Create NFT edition on-chain
8. mintNftTokensToEdition() → Mint tokens to edition
9. MintingDone modal → Show success with transaction hash
```

### Track Detail Components
| Component | Functionality |
|-----------|---------------|
| `DesktopTrackCard` | Desktop track display |
| `MobileTrackCard` | Mobile track display |
| `BidHistory` | Auction bid history |
| `DescriptionCard` | Track description |
| `ListingsCard` | Available listings |
| `OwnedEditionListCard` | Owned editions |
| `PriceCard` | Buy/bid interface |

### Current (production) - What to Keep
- WaveformWithComments (new!)
- Track collaborators
- ISRC support
- New metadata fields
- Omnichain minting plans

### Migration Tasks
- [ ] Verify full minting flow works in CreateModal
- [ ] Port ID3 tag reading/writing
- [ ] Port IPFS pinning flow
- [ ] Ensure multi-edition support
- [ ] Port OwnedEditionListCard

---

## 6. MESSAGING FLOWS

### Legacy Pages (develop branch)
| Page | Route | Functionality |
|------|-------|---------------|
| Messages Index | `/messages` | Inbox/conversations list |
| Chat | `/messages/[id]` | Individual conversation |

### Legacy Components
| Component | Functionality |
|-----------|---------------|
| `Inbox` | Conversation list |
| `Chat` | Message thread |
| `ChatLayout` | Chat wrapper |
| `NewMessageForm` | Send message |
| `Message` | Individual message |
| `InboxBadge` | Unread count |

### Current (production) - What to Keep
- DEX messaging integration
- Any new message features

### Migration Tasks
- [ ] Verify messaging works in DEX
- [ ] Port Inbox component if missing
- [ ] Port ChatLayout for proper styling

---

## 7. NOTIFICATION FLOWS

### Legacy Page (develop branch)
| Page | Route | Functionality |
|------|-------|---------------|
| Notifications | `/notifications` | All notifications |

### Legacy Notification Types
| Component | Event |
|-----------|-------|
| `NewPostNotificationItem` | New post from followed user |
| `CommentNotificationItem` | Comment on your post |
| `FollowerNotificationItem` | New follower |
| `ReactionNotificationItem` | Reaction on post |
| `NewBidNotificationItem` | New bid on auction |
| `AuctionEndedNotificationItem` | Auction ended |
| `AuctionIsEndingNotificationItem` | Auction ending soon |
| `NFTSoldNotificationItem` | NFT sold |
| `OutbidNotificationItem` | You were outbid |
| `WonAuctionNotificationItem` | You won auction |
| `DeletedPostNotificationItem` | Post removed |
| `DeletedCommentNotificationItem` | Comment removed |
| `NewVerificationRequestNotificationItem` | Verification request |

### Current (production) - What to Keep
- NotificationsModal in DEX
- Real-time updates

### Migration Tasks
- [ ] Verify all notification types render correctly
- [ ] Port ClearAllNotificationsButton
- [ ] Ensure notification count resets on view

---

## 8. EXPLORE FLOWS

### Legacy Page (develop branch)
| Page | Route | Functionality |
|------|-------|---------------|
| Explore | `/explore` | Discovery with tabs |

### Legacy Explore Tabs
```typescript
enum ExploreTab {
  ALL = 'All',
  TRACKS = 'Tracks',
  USERS = 'Users'
}
```

### Legacy Components
| Component | Functionality |
|-----------|---------------|
| `ExploreAll` | Combined view |
| `ExploreTracks` | Track discovery |
| `ExploreUsersGridView` | User grid |
| `ExploreUsersListView` | User list |
| `ExploreSearchBar` | Search input |
| `ExploreTopTracksBanner` | Featured tracks |
| `TabsMenu` | Tab navigation with grid/list toggle |

### Current (production) - What to Keep
- Genre browsing
- New UI styling
- Any new discovery features

### Migration Tasks
- [ ] Port TabsMenu component
- [ ] Port ExploreAll view
- [ ] Port grid/list toggle functionality
- [ ] Port sorting options

---

## 9. LIBRARY FLOWS

### Legacy Page (develop branch)
| Page | Route | Functionality |
|------|-------|---------------|
| Library | `/library` | User's saved content |

### Legacy Library Tabs
```typescript
enum LibraryTab {
  FAVORITE_TRACKS = 'Favorite Tracks',
  FAVORITE_ARTISTS = 'Favorite Artists'
}
```

### Legacy Components
| Component | Functionality |
|-----------|---------------|
| `FavoriteTracks` | Liked tracks list |
| `FavoriteArtists` | Followed artists |
| `SearchBar` | Library search |
| `TabsMenu` | Tab navigation |

### Current (production) - What to Keep
- LibraryPage component
- Any new library features

### Migration Tasks
- [ ] Port FavoriteTracks component
- [ ] Port FavoriteArtists component
- [ ] Integrate with new DEX library view

---

## 10. BLOCKCHAIN INTEGRATION

### Legacy Hooks (develop branch)
| Hook | Functionality |
|------|---------------|
| `useBlockchain` | V1 contract interactions |
| `useBlockchainV2` | V2 contract interactions |
| `useWalletContext` | Wallet state |
| `useMagicContext` | Magic Link |
| `useWalletConnect` | WalletConnect |
| `useMetaMask` | MetaMask |
| `useMaxGasFee` | Gas estimation |
| `useTokenOwner` | NFT ownership |
| `useEditionOwner` | Edition ownership |

### Key Contract Functions (useBlockchainV2)
```typescript
// NFT Operations
createEdition(tokenId, ...)
mintNftTokensToEdition(editionId, quantity)
transferEdition(tokenId, to)

// Marketplace Operations
listItem(tokenId, price)
buyItem(tokenId, price)
cancelListing(tokenId)

// Auction Operations
createAuction(tokenId, reservePrice, startTime, endTime)
placeBid(tokenId, bidAmount)
completeAuction(tokenId)
cancelAuction(tokenId)

// Token Operations
approve(spender, amount)
transfer(to, amount)
```

### Current (production) - What to Keep
- WalletConnect v2
- Multi-chain support
- ZetaChain integration
- All new token support (23 tokens)

### Migration Tasks
- [ ] Verify all blockchain functions work
- [ ] Port any missing contract integrations
- [ ] Ensure gas estimation works

---

## 11. API SERVICES (Backend)

### Legacy Services (develop branch)
| Service | Functionality |
|---------|---------------|
| `AuctionItemService` | Auction CRUD |
| `BidService` | Bid operations |
| `BuyNowItemService` | Fixed listings |
| `ListingItemService` | All listings |
| `CommentService` | Comments |
| `PostService` | Posts |
| `ReactionService` | Reactions |
| `FeedService` | User feeds |
| `FollowService` | Follow relationships |
| `MessageService` | DMs |
| `NotificationService` | All notifications |
| `ProfileService` | User profiles |
| `TrackService` | Tracks |
| `TrackEditionService` | NFT editions |
| `EmbedService` | URL to embed conversion |
| `PinningService` | IPFS pinning |
| `UploadService` | File uploads |
| `PolygonService` | Blockchain sync |

### Migration Tasks
- [ ] Verify all API services work
- [ ] Port EmbedService if needed for server-side normalization

---

## 12. PRIORITY MIGRATION ORDER

### Phase 1: Core Functionality
1. [ ] Minting flow (CreateModal)
2. [ ] Marketplace listings (auction + buy now)
3. [ ] Bidding and purchasing
4. [ ] Wallet transfers

### Phase 2: Social Features
5. [ ] Feed virtualization
6. [ ] Profile tabs
7. [ ] Messaging
8. [ ] Notifications

### Phase 3: Discovery
9. [ ] Explore tabs
10. [ ] Library tabs
11. [ ] Search improvements

### Phase 4: Polish
12. [ ] Settings modals
13. [ ] Transaction history
14. [ ] All notification types

---

## QUICK REFERENCE: View Legacy Code

```bash
# View any legacy file:
git show origin/develop:path/to/file.tsx

# Key files:
git show origin/develop:web/src/components/modals/CreateModal.tsx  # Minting
git show origin/develop:web/src/pages/tracks/[id]/place-bid.tsx   # Bidding
git show origin/develop:web/src/pages/wallet/transfer.tsx         # Transfers
git show origin/develop:web/src/hooks/useBlockchainV2.ts          # Blockchain
git show origin/develop:web/src/components/Feed.tsx               # Feed
git show origin/develop:web/src/components/Post/Posts.tsx         # Virtualized list
```

---

---

## 13. EXTERNAL SHARING & SOCIAL INTEGRATION

### SEO Component (OpenGraph + Twitter Cards)
Both legacy and production have the same SEO component that enables rich link previews when sharing:

```typescript
// components/SEO.tsx
interface SEOProps {
  title: string
  description: string
  image?: string | null
  canonicalUrl: string
  type?: 'music.song'  // For tracks
}

// Meta tags generated:
// OpenGraph: og:title, og:description, og:image, og:url, og:type, og:site
// Twitter: twitter:title, twitter:description, twitter:image, twitter:card (summary_large_image)
// Canonical URL for SEO
```

### Page-Specific SEO (Legacy Implementation - PORT!)

**Post Page (`/posts/[id]`):**
```typescript
const title = track
  ? `${track.title} - song by ${track.artist} | SoundChain`
  : 'Post | SoundChain'

const description = track
  ? `${post.body} - Listen to ${track.title} on SoundChain. ${track.artist}. ${track.album}.`
  : post.body || 'Check this post on SoundChain'

const image = track?.artworkUrl
```

**Track Page (`/tracks/[id]`):**
```typescript
const title = `${track.title} - song by ${track.artist} | SoundChain`
const description = `Listen to ${track.title} on SoundChain. ${track.artist}. ${track.album}. ${track.releaseYear}.`
const image = track.artworkUrl
const type = 'music.song'  // Special OpenGraph type for music
```

**Profile Page (`/profiles/[handle]`):**
```typescript
const title = `${displayName} | SoundChain`
const description = `${bio} - Join SoundChain to connect with ${displayName}.`
const image = profilePicture
```

### Share Buttons

**TrackShareButton (Legacy - KEEP/PORT):**
```typescript
// Two sharing options:
// 1. "Share URL" - Web Share API with clipboard fallback
// 2. "Share as Post" - Opens post modal with track attached

const handleSharing = async () => {
  const url = `${window.location.origin}/tracks/${trackId}`
  try {
    await navigator.share({
      title: 'SoundChain',
      text: `Listen to this SoundChain track: ${title} - ${artist}`,
      url,
    })
  } catch {
    await navigator.clipboard.writeText(url)
    toast('URL copied to clipboard')
  }
}
```

**PostActions Share (Current - KEEP):**
```typescript
const onShareClick = () => {
  navigator.share({
    title: 'SoundChain',
    text: 'Check out this publication on SoundChain!',
    url: postLink,
  }).catch(error => {
    if (!error.toString().includes('AbortError')) {
      toast('URL copied to clipboard')
    }
  })
}
```

### Social Media Link Component
```typescript
// Profile social links with icons
const companies = {
  instagram: { icon: Instagram, getLink: (h) => `https://instagram.com/${h}` },
  twitter: { icon: Twitter, getLink: (h) => `https://twitter.com/${h}` },
  facebook: { icon: Facebook, getLink: (h) => `https://facebook.com/${h}` },
  soundcloud: { icon: Soundcloud, getLink: (h) => `https://soundcloud.com/${h}/` },
  linktree: { icon: LinktreeSquare, getLink: (h) => `https://linktr.ee/${h}/` },
  discord: { icon: Discord, getLink: (h) => `https://discord.gg/${h}` },
  telegram: { icon: TelegramSquare, getLink: (h) => `https://t.me/${h}/` },
  spotify: { icon: SpotifySquare, getLink: (h) => `https://open.spotify.com/artist/${h}/` },
  bandcamp: { icon: BandcampSquare, getLink: (h) => `https://bandcamp.com/${h}/` },
}
```

### Contract Metadata API (NFT Marketplaces)
```typescript
// pages/api/contractMetadata.ts - For OpenSea, etc.
const metadata = {
  name: 'SoundChain',
  description: 'SoundChain is a decentralized music platform...',
  image: 'https://soundchain.io/soundchain-app-icon.png',
  external_link: 'https://soundchain.io',
}
```

### CopyLink Component (Legacy - KEEP)
```typescript
// Copyable link with visual feedback
<CopyLink link={shareUrl} />
// Shows: [chain icon] [truncated URL] [Copy button]
// Feedback: "Copied!" for 3 seconds
```

### Floating Social Media Menu (Landing Page)
```typescript
// Fixed left-side social links
// Discord, Telegram, Instagram, Twitter, YouTube
// With hover scale animation
```

### Deep Linking URLs
| Content Type | URL Pattern | SEO Title Format |
|--------------|-------------|------------------|
| Post | `/posts/[id]` | `{track.title} - song by {artist} \| SoundChain` |
| Track | `/tracks/[id]` | `{title} - song by {artist} \| SoundChain` |
| Profile | `/profiles/[handle]` | `{displayName} \| SoundChain` |
| Marketplace | `/marketplace` | `Marketplace \| SoundChain` |

### Migration Tasks for External Sharing
- [ ] Ensure SEO component is used on all DEX routes
- [ ] Port dynamic meta tags for posts/tracks/profiles in DEX
- [ ] Verify TrackShareButton works in DEX
- [ ] Ensure PostActions share works on all post types
- [ ] Test link previews on Twitter, Discord, Telegram, Facebook
- [ ] Verify contract metadata API returns correct data
- [ ] Test deep links open correctly from external sources

---

## 14. AUDIO PLAYER & WAVEFORM (PRODUCTION ENHANCEMENTS - KEEP!)

### Current Audio Player Components (production)
| Component | File | Features |
|-----------|------|----------|
| `AudioPlayer` | `AudioPlayer.tsx` | Main footer player |
| `FastAudioPlayer` | `FastAudioPlayer.tsx` | Lightning-fast with preloading, state machine |
| `MiniAudioPlayer` | `MiniAudioPlayer.tsx` | Compact inline player |
| `WaveformWithComments` | `WaveformWithComments.tsx` | SoundCloud-style waveform |
| `wavesurfer` | `wavesurfer.tsx` | WaveSurfer.js wrapper |

### Audio Player Context (KEEP ALL!)
```typescript
// hooks/useAudioPlayerContext.tsx
interface AudioPlayerContextData {
  isPlaying: boolean
  isShuffleOn: boolean
  currentSong: Song
  duration: number
  progress: number
  progressFromSlider: number | null
  hasNext: boolean
  hasPrevious: boolean
  playlist: Song[]
  volume: number
  isFavorite: boolean
  play: (song: Song) => void
  isCurrentSong: (trackId: string) => boolean
  isCurrentlyPlaying: (trackId: string) => boolean
  togglePlay: () => void
  setProgressState: (value: number) => void
  setDurationState: (value: number) => void
  setProgressStateFromSlider: (value: number | null) => void
  setVolume: (value: number) => void
  playlistState: (list: Song[], index: number) => void
  playPrevious: () => void
  playNext: () => void
  jumpTo: (index: number) => void
  toggleShuffle: () => void
  setPlayerFavorite: (isFavorite: boolean) => void
  closePlayer: () => void
}
```

### WaveformWithComments Features (NEW - KEEP!)
```typescript
/**
 * SoundCloud-style interactive waveform
 *
 * Features:
 * - Beautiful gradient waveform visualization (WaveSurfer.js)
 * - Timestamped comments displayed as avatars on the waveform
 * - Hover popups showing comment content
 * - Click to add comment at specific timestamp
 * - Real-time comment display while playing
 * - Like comments
 * - Pinned comments
 */
interface WaveformWithCommentsProps {
  trackId: string
  audioUrl: string
  duration: number
  comments?: TrackComment[]
  onAddComment?: (text: string, timestamp: number) => Promise<void>
  onLikeComment?: (commentId: string) => Promise<void>
  isPlaying?: boolean
  currentTime?: number
  onSeek?: (time: number) => void
  onPlayPause?: () => void
}
```

### FastAudioPlayer Enhancements (NEW - KEEP!)
- State machine architecture (no booleans)
- Audio preloading for instant playback
- Compact mode for grid view
- Loop support

### Integration Points
- `DesktopTrackCard.tsx` - WaveformWithComments integrated
- Footer audio player - Persistent playback across pages
- Grid view posts - FastAudioPlayer for uploaded audio

---

## 14. PRODUCTION ENHANCEMENTS TO PRESERVE

### DO NOT REMOVE - New Features Added in Production

| Feature | Files | Description |
|---------|-------|-------------|
| **ZetaChain Integration** | Various | 23 token swap support |
| **Base Chain** | `useWalletConnect.tsx` | Multi-chain NFT support |
| **Track Collaborators** | Track forms | Split royalties |
| **ISRC Support** | Track metadata | Industry standard codes |
| **Omnichain Minting** | Planned | Cross-chain NFTs |
| **WaveformWithComments** | `WaveformWithComments.tsx` | SoundCloud-style comments |
| **FastAudioPlayer** | `FastAudioPlayer.tsx` | Lightning-fast playback |
| **Ephemeral Posts** | Post creation | 24hr disappearing media |
| **Guest Posting** | `walletAddress` field | Post without account |
| **Emoji Flurries** | Emoji picker | Multiple emoji spam |
| **Animated Emotes** | `EmoteRenderer.tsx` | Custom animated emotes |
| **Instagram-style Feed** | Feed layout | 614px posts, grid view |
| **Inline Comments Modal** | Comment modal | No page redirect |

### Production Commits to Preserve
```bash
# Key feature commits (DO NOT REVERT):
ff3228f5a - Bookmark system + SoundCloud-style waveform comments
3b2de28d7 - Lightning fast audio player with preloading
e2374ea01 - Base chain and multi-chain support
981e3b2f5 - Web3 Archive System for ephemeral posts
892b1d16a - All 24 supported tokens to wallet swap
b8ba5869d - ZetaChain swap portal + Transfer NFTs
406480de0 - Instagram desktop-style feed layout
7c2d314a8 - Inline comment modal
```

---

## FINAL NOTES

1. **KEEP all production enhancements** - ZetaChain, 23 tokens, omnichain, collaborators, waveform, fast player
2. **PORT legacy flows** - Auction, bid, buy, mint, transfer - the logic, not old components
3. **CONSOLIDATE to DEX** - Use modals instead of 60+ separate pages
4. **PERFORMANCE** - Add react-window virtualization for large lists
5. **TEST thoroughly** - Each flow needs end-to-end testing
6. **AUDIO PLAYER** - Footer player + waveform are working - preserve!

---

## SUCCESS CRITERIA

When migration is complete:
- [ ] All NFT minting works (single + multi-edition)
- [ ] Auctions can be created, bid on, and completed
- [ ] Buy Now listings work with all tokens
- [ ] Wallet transfers work for all 23+ tokens
- [ ] Messaging works in DEX
- [ ] All notification types render
- [ ] Explore tabs work with grid/list toggle
- [ ] Library shows favorites
- [ ] Audio player persists across navigation
- [ ] Waveform comments work on track details
- [ ] Embeds play inside posts (not redirect links)
- [ ] All new production features still work

---

*This audit was created to help port legacy functionality to the new DEX UI while preserving all production enhancements. The answers are in the develop branch - use `git show origin/develop:path/to/file` to view legacy implementations.*

