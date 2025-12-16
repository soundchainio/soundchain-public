# SOUNDCHAIN COMPLETE ARCHITECTURE MAP
**Generated:** December 16, 2025
**Agent:** Claude Opus 4.5

---

## QUICK REFERENCE

### API Models (32 total)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| User | Account/auth | email, handle, wallets (magic/google/discord/twitch/metamask) |
| Profile | Public profile | displayName, bio, genres, badges, verified |
| Track | Music tracks | title, artist, artworkUrl, muxAsset, nftData, SCid |
| TrackEdition | Limited editions | trackId, quantity, tokenId (ERC1155) |
| Post | Social posts | body, mediaLink, reactionStats, comments |
| Comment | Post comments | body, postId, profileId |
| Reaction | Post reactions | postId, type (FIRE/LOVE/etc) |
| Follow | Follow graph | followerId, followedId |
| Message | DMs | fromId, toId, message, readAt |
| Notification | All notifications | type, profileId, metadata |
| AuctionItem | Auction listings | reservePrice, endingTime, highestBid |
| BuyNowItem | Fixed-price listings | price, isPaymentOGUN |
| ListingItem | Listing wrapper | trackId, listingType |
| Playlist | Playlists | name, trackIds |
| SCid | SoundChain ID | scid, trackId, streamCount, ogunRewardsEarned |
| FeedItem | Feed entries | profileId, postId |

### API Services (20+ total)
| Service | Key Methods |
|---------|-------------|
| AuthService | register(), getUserFromCredentials() |
| UserService | getUser(), updateHandle(), updateWallet() |
| ProfileService | getProfile(), updateProfile(), followProfile() |
| TrackService | getTracks(), getOwnedTracks(), favoriteCount() |
| PostService | createPost(), deletePost(), getPosts() |
| CommentService | addComment(), getComments() |
| ReactionService | reactToPost(), changeReaction() |
| MessageService | sendMessage(), getMessages(), getChats() |
| NotificationService | createNotification(), getNotifications() |
| AuctionItemService | createAuction(), placeBid(), completeBidding() |
| BuyNowItemService | createBuyNowItem(), buyItem() |
| SCidService | register(), logStream(), transferSCid() |
| FeedService | getFeed(), seedNewProfileFeed() |
| FollowService | getFollowers(), getFollowing() |
| MuxService | createAsset(), getPlaybackId() |
| UploadService | uploadFile(), getSignedUrl() |
| PinningService | pinToIPFS() |
| PolygonService | getMaticUsd(), getTransactionHistory() |

### GraphQL Queries (Key ones)
```graphql
me                    # Current user
profile(handle)       # User profile
tracks(filter, sort)  # Track listings
posts(filter)         # Social posts
feed                  # Timeline
chats                 # DM conversations
chatHistory(profileId)# Messages with user
notifications         # User notifications
listingItems          # Marketplace listings
auctionItems          # Active auctions
exploreUsers          # User discovery
exploreTracks         # Track discovery
scidsByProfile        # User's SCids
```

### GraphQL Mutations (Key ones)
```graphql
register(input)       # Create account
createPost(input)     # New post
createTrack(input)    # Upload track
sendMessage(input)    # Send DM
reactToPost(input)    # Add reaction
follow(profileId)     # Follow user
createAuction(input)  # List for auction
createBuyNowItem      # List fixed-price
placeBid(input)       # Bid on auction
registerSCid(trackId) # Register SCid
logStream(scid)       # Log stream for rewards
```

---

## DEX PAGE VIEWS & REQUIRED WIRING

### Dashboard View (`selectedView === 'dashboard'`)
**Should Show:**
- Total users count → `exploreUsersData?.exploreUsers?.nodes?.length`
- Total tracks count → `tracksData?.tracks?.nodes?.length`
- Total NFTs listed → `listingItemsData?.listingItems?.nodes?.length`
- Genre charts → Grouped tracks by genre
- Recent activity feed

**Queries Needed:**
- `useExploreUsersQuery`
- `useTracksQuery`
- `useListingItemsQuery`
- `useGroupedTracksQuery`

### Feed View (`selectedView === 'feed'`)
**Should Show:**
- Posts from followed users
- Post creation form
- Reactions, comments, reposts
- Media embeds (YouTube, SoundCloud, etc.)

**Queries/Mutations Needed:**
- `useFeedQuery` or `usePostsQuery`
- `useCreatePostMutation`
- `useReactToPostMutation`
- `useAddCommentMutation`

### Users View (`selectedView === 'users'`)
**Should Show:**
- User grid/list
- Search by name/handle
- Follow/unfollow buttons
- Leaderboard by followers

**Queries Needed:**
- `useExploreUsersQuery`
- `useFollowProfileMutation`
- `useUnfollowProfileMutation`

### Buy View (`selectedView === 'buy'`)
**Should Show:**
- NFT listings (tracks, editions)
- Filter by price, genre
- Buy now / Place bid buttons

**Queries Needed:**
- `useListingItemsQuery`
- `useAuctionItemsQuery`
- `useBuyNowItemsQuery`

### Sell View (`selectedView === 'sell'`)
**Should Show:**
- User's owned tracks
- List for auction form
- List for buy-now form
- Active listings management

**Queries/Mutations Needed:**
- `useOwnedTracksQuery`
- `useCreateAuctionMutation`
- `useCreateBuyNowItemMutation`

### Library View (`selectedView === 'library'`)
**Should Show:**
- Favorited tracks
- Owned NFTs
- Playlists
- Listening history

**Queries Needed:**
- `useFavoriteTracksQuery`
- `useOwnedTracksQuery`
- `usePlaylistsQuery`

### Wallet View (`selectedView === 'wallet'`)
**Should Show:**
- MATIC balance
- OGUN balance
- Connected wallets (Magic, OAuth, MetaMask)
- Transaction history
- Send/Receive forms
- ZetaChain swap portal
- Transfer NFTs

**Data Sources:**
- `useMagicContext()` → balance, ogunBalance, account
- `useMetaMask()` → metamask balances
- ZetaChain swap (UI only for now)

### Settings View (`selectedView === 'settings'`)
**Should Show:**
- Display name → links to /settings/name
- Username → links to /settings/username
- Bio → links to /settings/bio
- Profile picture → links to /settings/profile-picture
- Social links → links to /settings/social-links
- Security → links to /settings/security

### Messages View (`selectedView === 'messages'`)
**Should Show:**
- Conversation list
- Chat window
- Send message form
- Unread indicators

**Queries/Mutations Needed:**
- `useChatsQuery`
- `useChatHistoryLazyQuery`
- `useSendMessageMutation`

### Notifications View (`selectedView === 'notifications'`)
**Should Show:**
- All notification types
- Read/unread status
- Links to relevant content

**Queries Needed:**
- `useNotificationsQuery`
- `useClearNotificationsMutation`

---

## HEADER ICONS & BUTTONS

| Icon | Action | Status |
|------|--------|--------|
| Logo | Navigate to /dex | ✅ |
| Search | Filter tracks/users | Needs verification |
| Post+ | Open post creation | ✅ |
| Mint+ | Open track upload modal | ✅ |
| Backend Panel | Show DB stats (admin only) | ✅ |
| Bell (Notifications) | Open notifications dropdown | ✅ |
| Wallet Connect | Connect/disconnect wallet | ✅ |
| User Avatar | Open user menu dropdown | ✅ |

### User Menu Items
| Item | Action | Status |
|------|--------|--------|
| Profile | Navigate to /dex/users/{handle} | Needs verification |
| Alerts | Open notifications | ✅ |
| Inbox | Open messages | ✅ |
| Wallet | Navigate to wallet view | ✅ |
| Docs | Open GitBook (external) | Needs verification |
| Leave Feedback | Open Google Form (external) | Needs verification |
| Admin Panel | Show admin panel (founders only) | Needs verification |
| Account Settings | Navigate to settings view | ✅ |
| Logout | Clear auth, redirect to login | Needs verification |

---

## SMART CONTRACTS

| Contract | Address | Network |
|----------|---------|---------|
| Soundchain721 | config.NFT_ADDRESS | Polygon |
| Soundchain1155 | config.NFT_MULTIPLE_EDITION_ADDRESS | Polygon |
| Marketplace | config.MARKETPLACE_ADDRESS | Polygon |
| MarketplaceEditions | config.MARKETPLACE_MULTIPLE_EDITION_ADDRESS | Polygon |
| Auction | config.AUCTION_ADDRESS | Polygon |
| SoundchainOGUN20 | config.ogunTokenAddress | Polygon |

---

## AUTHENTICATION FLOW

```
1. User enters email on /login
2. Magic SDK sends magic link email
3. User clicks link, Magic authenticates
4. Frontend gets DID token
5. Call register/login mutation with DID
6. Backend validates with Magic API
7. Create/find User + Profile
8. Generate JWT
9. Store JWT in localStorage
10. All subsequent requests include JWT header
```

---

## NOTIFICATION TYPES

| Type | Trigger | Fields |
|------|---------|--------|
| NewPost | User you follow posts | authorName, postId |
| Comment | Comment on your post | commentBody, postId |
| Reaction | Reaction on your post | reactionType, postId |
| Follower | Someone follows you | followerName, followerId |
| NewBid | Bid on your auction | bidAmount, auctionId |
| Outbid | Your bid was outbid | newBidAmount, auctionId |
| WonAuction | You won auction | trackName, price |
| AuctionEnded | Your auction ended | trackName, winnerName |
| NFTSold | Your NFT was sold | trackName, price, buyerName |
| VerificationRequest | Badge request update | status |

---

## SCid (SoundChain ID) SYSTEM

**Format:** `SC-[CHAIN]-[HASH]-[YEAR][SEQ]`
**Example:** `SC-POL-7B3A-2400001`

**Chains:** POL (Polygon), ETH (Ethereum), AVA (Avalanche), BASE, TEZ (Tezos)

**Rewards:**
- Base: 0.001 OGUN per stream
- Verified bonus: 1.5x multiplier
- Max daily: 1000 OGUN per track
- Min duration: 30 seconds

---

## FILE LOCATIONS

### API
- Models: `/api/src/models/`
- Services: `/api/src/services/`
- Resolvers: `/api/src/resolvers/`
- Types: `/api/src/types/`
- Lambda: `/api/src/lambda/`

### Web
- Pages: `/web/src/pages/`
- Components: `/web/src/components/`
- Hooks: `/web/src/hooks/`
- Contexts: `/web/src/contexts/`
- GraphQL: `/web/src/lib/graphql.ts`

### Contracts
- Solidity: `/soundchain-contracts/contracts/`
- ABIs: `/soundchain-contracts/abi/`
- TypeChain: `/soundchain-contracts/typechain/`
