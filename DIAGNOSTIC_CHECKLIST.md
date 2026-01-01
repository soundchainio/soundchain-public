# SoundChain DEX - Master Diagnostic Checklist
## Created: January 1, 2026 - New Year Full Audit
## TARGET: Multi-Billion Dollar Evaluation

---

## BLOCKCHAIN INFRASTRUCTURE (soundchain-contracts)

### OGUN Staking Contract (Ready to Deploy!)
- [ ] Deploy StakingRewards.sol to Polygon mainnet
- [ ] Fund contract with OGUN reward supply
- [ ] Verify contract on Polygonscan
- [ ] Integrate staking UI in frontend
- [ ] Test stake/unstake/withdraw rewards flow

### Omnichain Fee Collection (0.05%)
- [ ] Create Gnosis Safe on Ethereum
- [ ] Create Gnosis Safe on Polygon
- [ ] Create Gnosis Safe on Base
- [ ] Create Gnosis Safe on Arbitrum
- [ ] Create Gnosis Safe on Optimism
- [ ] Create Gnosis Safe on ZetaChain
- [ ] Create Gnosis Safe on BSC
- [ ] Create Gnosis Safe on Avalanche
- [ ] (+ 15 more chains - see soundchain-contracts/HANDOFF.md)
- [ ] Deploy OmnichainRouter on ZetaChain
- [ ] Deploy ChainConnectors on all 23 chains
- [ ] Set fee collector addresses to Gnosis Safes

### ZetaChain Integration
- [ ] ZetaChain minting works
- [ ] Cross-chain royalty distribution
- [ ] ZRC-20 token support
- [ ] Bridge from other chains working

---

## NAV BAR FULL AUDIT (All Downstream Flows)

### 1. FEED (/dex/feed)
**Upstream:** Login → Feed loads
**Core Functionality:**
- [ ] Posts load on page render
- [ ] Infinite scroll/pagination works
- [ ] Post creation works
- [ ] Post with text only
- [ ] Post with media (image upload)
- [ ] Post with video
- [ ] Post with track/NFT embed
- [ ] Emotes/stickers render as IMAGES
- [ ] URLs auto-linkify
- [ ] Guest posts (wallet-based)
**Downstream - Comments:**
- [ ] Comment modal opens
- [ ] Existing comments load
- [ ] Add comment works
- [ ] Emotes in comments render as IMAGES
- [ ] Reply to comment works
- [ ] Delete own comment works
**Downstream - Reactions:**
- [ ] Like/fire reaction works
- [ ] Reaction count updates
- [ ] View reactions modal works
**Downstream - Repost:**
- [ ] Repost button works
- [ ] Repost with quote works
- [ ] Reposts show in feed
**Downstream - Share:**
- [ ] Share post URL works
- [ ] OG image shows when shared externally

### 2. DASHBOARD (/dex)
**Upstream:** Login → Dashboard loads
**Core Functionality:**
- [ ] User stats display (followers, tracks, etc.)
- [ ] NFT collection loads
- [ ] Track grid displays correctly
- [ ] Balance displays (MATIC, OGUN, etc.)
**Downstream - NFT Card:**
- [ ] Click NFT → Track detail page
- [ ] Play button works on hover
- [ ] Add to playlist works
- [ ] Favorite button works
**Downstream - Wallet Section:**
- [ ] Transaction history loads
- [ ] Transfer NFT works
- [ ] View on Polygonscan links work

### 3. USERS/EXPLORE (/dex/explore)
**Upstream:** Navigation → Users tab
**Core Functionality:**
- [ ] Users list loads
- [ ] User avatars display
- [ ] User names/handles display
- [ ] Search users works
- [ ] Load more pagination works
**Downstream - User Click:**
- [ ] Click user → Profile page loads
- [ ] Profile avatar displays
- [ ] Profile bio displays
- [ ] User's tracks load
- [ ] Follow button works
- [ ] Message button works

### 4. MARKETPLACE (/dex/marketplace)
**Upstream:** Navigation → Marketplace tab
**Core Functionality:**
- [ ] NFT listings load
- [ ] Filter by type (NFT/Token/Bundle)
- [ ] Search marketplace works
- [ ] Price displays correctly (MATIC)
- [ ] MATIC icon shows (not "!")
**Downstream - NFT Click:**
- [ ] Click NFT → Detail page
- [ ] Buy button works
- [ ] Bid button works (if auction)
- [ ] Transaction completes on blockchain
- [ ] NFT transfers to buyer wallet

### 5. LIBRARY (/dex/library)
**Upstream:** Navigation → Library tab
**Core Functionality:**
- [ ] Favorited tracks load
- [ ] Track list displays
- [ ] Play button works
- [ ] Remove from library works
**Downstream - Track Click:**
- [ ] Click track → Detail page OR plays
- [ ] Add to playlist works

### 6. PLAYLIST (/dex/playlist)
**Upstream:** Navigation → Playlist tab
**Core Functionality:**
- [ ] User's playlists load
- [ ] Create new playlist works
- [ ] Delete playlist works
- [ ] Edit playlist name works
**Downstream - Playlist Click:**
- [ ] Open playlist → Tracks display
- [ ] NFT tracks PLAY (CRITICAL!)
- [ ] External links PLAY (Bandcamp, SoundCloud)
- [ ] Queue displays correctly
- [ ] Skip next/previous works
- [ ] Shuffle works
- [ ] Loop works (NEW)
- [ ] Remove track from playlist works
- [ ] Reorder tracks works

---

## CRITICAL PRIORITY (Blocking Core Features)

### Playlist System
- [ ] NFT tracks play when clicked in playlist
- [ ] External links (Bandcamp, SoundCloud) process into queue
- [ ] Play/Pause works for all track types
- [ ] Skip next/previous works
- [ ] Loop button works (NEW - just added)
- [ ] Shuffle button works
- [ ] Queue displays correctly
- [ ] Delete track from playlist works
- [ ] Playlist saves persist

### Minting Flow
- [ ] Polygon minting works
- [ ] ZetaChain minting works
- [ ] Collaborator splits work
- [ ] IPFS upload works (Pinata)
- [ ] Metadata saves correctly
- [ ] NFT appears in user's collection after mint

---

## HIGH PRIORITY (User-Facing Features)

### Authentication & Wallets
- [ ] Google OAuth login (Safari)
- [ ] Discord OAuth login
- [ ] Twitch OAuth login
- [ ] Email/Magic Link login
- [ ] WalletConnect connection
- [ ] Coinbase Wallet connection
- [ ] MetaMask connection
- [ ] Wallet disconnect works
- [ ] Session persists on refresh

### Profile Pages
- [ ] User profiles load at /dex/users/[handle]
- [ ] Profile avatar displays
- [ ] Cover photo displays
- [ ] Bio text shows
- [ ] Social links work
- [ ] Follower/following counts accurate
- [ ] "My Tracks" tab shows user's NFTs
- [ ] "Favorites" tab works
- [ ] Share Profile button works (NEW)
- [ ] OG image thumbnail when sharing profile URL

### Track Pages
- [ ] Track detail page loads at /dex/track/[id]
- [ ] Album artwork displays
- [ ] Play button works
- [ ] Artist name clickable (goes to profile)
- [ ] Blockchain data displays (token ID, contract, IPFS)
- [ ] Polygonscan links work
- [ ] Favorite button works
- [ ] Share button works
- [ ] Buy NFT button works
- [ ] OG image thumbnail when sharing track URL

---

## ALL MODALS (26 Total)

### Audio & Playback
- [ ] **AudioPlayerModal** - Fullscreen player with waveform, controls, playlist
- [ ] **AddToPlaylistModal** - Add track to existing playlist
- [ ] **CreatePlaylistModal** - Create new playlist

### Posts & Comments
- [ ] **CommentModal** - View/add comments on posts
- [ ] **PostModal** - Create/edit post
- [ ] **GuestPostModal** - Guest wallet-based posting
- [ ] **ReactionsModal** - View reactions on post

### NFT & Marketplace
- [ ] **CreateModal** - Mint new NFT
- [ ] **ApproveModal** - Approve NFT for sale
- [ ] **BidsHistoryModal** - View bid history
- [ ] **FilterMarketplaceModal** - Filter marketplace listings
- [ ] **RemoveListingConfirmationModal** - Confirm remove listing

### Transfers
- [ ] **TransferConfirmationModal** - Confirm NFT transfer
- [ ] **TransferOgunConfirmationModal** - Confirm OGUN token transfer
- [ ] **NftTransferConfirmationModal** - NFT transfer confirmation

### Delete/Remove Confirmations
- [ ] **ConfirmDeleteNFTModal** - Confirm NFT deletion
- [ ] **ConfirmDeleteEditionModal** - Confirm edition deletion
- [ ] **DenyReasonModal** - Provide denial reason

### Profile & Social
- [ ] **FollowersModal** - View followers/following list
- [ ] **LinksModal** - Edit social links
- [ ] **AuthorActionsModal** - Author management actions

### Utility
- [ ] **UnderDevelopmentModal** - Feature coming soon
- [ ] **CustomModal** - Generic custom modal wrapper
- [ ] **Modal** - Base modal component

### Context/Portal
- [ ] **ModalsPortal** - Portal for rendering modals
- [ ] **ModalContext** - Modal state management
- [ ] **Web3ModalContext** - Web3 wallet modal context

---

## MEDIUM PRIORITY (Social Features)

### Feed
- [ ] Posts load on /dex/feed
- [ ] Creating new post works
- [ ] Emotes/stickers render as images (not text)
- [ ] Comments load on posts
- [ ] Adding comment works
- [ ] Emotes in comments render as images
- [ ] Like/react to post works
- [ ] Repost works
- [ ] Post with media (image/video) works
- [ ] URLs in posts are clickable
- [ ] Guest posts work (wallet-based)

### DM Messaging
- [ ] Messages tab loads at /dex/messages
- [ ] Conversation list shows
- [ ] Open conversation works
- [ ] Send message works
- [ ] Receive message (real-time?) works
- [ ] Message notifications work

### Notifications
- [ ] Notifications tab loads
- [ ] New follower notification works
- [ ] Comment notification works
- [ ] Like notification works
- [ ] Mark as read works

---

## HEADER & NAVIGATION

### Desktop Header
- [ ] Logo links to home/dex
- [ ] Search bar works
- [ ] Profile dropdown works
- [ ] Notifications icon shows count
- [ ] All navigation links work

### Mobile Navigation
- [ ] Bottom nav displays
- [ ] All tabs navigate correctly
- [ ] "My Music" button works (NEW)
- [ ] Profile icon works

### Left Sidebar (Desktop)
- [ ] All menu items visible
- [ ] Links navigate correctly
- [ ] Active state highlights current page

---

## MARKETPLACE

- [ ] NFT listings load
- [ ] Filter by type works (NFT/Token/Bundle)
- [ ] Search works
- [ ] Click NFT goes to detail page
- [ ] Buy button works
- [ ] Price displays correctly (MATIC/ETH)

---

## EXPLORE

- [ ] Users tab loads users
- [ ] Tracks tab loads tracks
- [ ] Search filters work
- [ ] Click user goes to profile
- [ ] Click track goes to detail/plays

---

## WALLET VIEW

- [ ] Shows connected wallet address
- [ ] Balance displays
- [ ] Transaction history loads
- [ ] NFT collection displays
- [ ] Transfer NFT works

---

## SETTINGS

- [ ] Profile preview shows correct data
- [ ] Edit profile link works
- [ ] Account settings accessible
- [ ] 2FA setup works
- [ ] Notification preferences work
- [ ] Wallet settings work

---

## KNOWN WORKING (from recent fixes)

- [x] Google OAuth (Safari) - Magic SDK v22.4.0
- [x] Emote rendering in posts - regex fixed
- [x] Emote rendering in comments - normalized newlines (NEW)
- [x] Loop button in audio player (NEW)
- [x] Share profile button (NEW)
- [x] OG image for track pages
- [x] Mobile feed scroll
- [x] Sticker picker (100+ emotes)
- [x] Comment 500 char limit
- [x] Profile avatar fallbacks

---

## TESTING PROCEDURE

1. **Fresh Browser Test** - Clear cache, login fresh
2. **Mobile Test** - Test on actual phone (iOS Safari, Android Chrome)
3. **Desktop Test** - Test on Chrome, Safari, Firefox
4. **User Feedback** - Collect from beta users

---

## BUG REPORTS FROM USERS

| Date | User | Bug Description | Status |
|------|------|-----------------|--------|
| | | | |

---

*Last Updated: January 1, 2026*
