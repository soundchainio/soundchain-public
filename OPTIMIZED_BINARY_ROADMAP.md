# SOUNDCHAIN: OPTIMIZED BINARY ROADMAP

**Created:** February 13, 2026
**Origin:** Polygon, 2021
**Identity:** The music marketplace that never sleeps - 24-token perpetual support on Polygon L2
**Philosophy:** Every line of code serves the outcome. No dead weight, no placeholder hype.

---

## THE GAP ANALYSIS: SoundChain vs. The Big 3

Before building, we need to see the battlefield clearly.

### What OpenSea Has That We Don't

| Feature | OpenSea | SoundChain | Gap |
|---------|---------|------------|-----|
| Collection Pages | Full stats, floor, volume, activity | None | **CRITICAL** |
| Offer System | Make offer on any NFT or collection | Auction bidding only | **CRITICAL** |
| Volume Charts | 24h/7d/30d/All time | None | **CRITICAL** |
| Trait Filtering | Filter by attributes + rarity | None | **HIGH** |
| Deals/Bundles | Bundle multiple NFTs | UI exists (L2 marketplace) | PARTIAL |
| Verified Collections | Blue checkmark system | None | **HIGH** |
| Creator Earnings | Enforced on-chain royalties | RoyaltySplitter written, not deployed | **HIGH** |
| Developer API | API keys, webhooks, SDKs | Agent API exists, no dev API keys | MEDIUM |
| Multi-chain | ETH, Polygon, Arbitrum, Base, etc. | Balance viewing only, tx on Polygon only | MEDIUM |

### What Blur Has That We Don't

| Feature | Blur | SoundChain | Gap |
|---------|------|------------|-----|
| Pro Trading UI | Bloomberg-terminal style | Basic marketplace grid | **CRITICAL** |
| Sweep Floor | Buy multiple at floor price | Stub exists, non-functional | **CRITICAL** |
| Bid Pools | Place bids across collections | None | **HIGH** |
| Portfolio Analytics | PnL, unrealized gains, floor tracking | Basic wallet view | **HIGH** |
| Blend (Lending) | NFT-collateralized loans | None | FUTURE |
| Real-time Feeds | Live sales, listings, cancellations | Activity feed (social only) | **HIGH** |
| Speed | Instant everything | Depends on Vercel cold starts | MEDIUM |
| Points/Incentives | Airdrop farming mechanics | OGUN rewards exist but basic | MEDIUM |

### What Rarible Has That We Don't

| Feature | Rarible | SoundChain | Gap |
|---------|---------|------------|-----|
| Governance | RARI token voting | OGUN exists, no governance | **HIGH** |
| Launchpad | Collection creation wizard | Mint exists, no launch tools | **HIGH** |
| Protocol Layer | Open-source marketplace protocol | Proprietary only | MEDIUM |
| Royalty Registry | On-chain royalty enforcement | EIP-2981 support, no registry | MEDIUM |

### What SoundChain Has That NONE of Them Have

| Feature | SoundChain | OpenSea/Blur/Rarible |
|---------|------------|----------------------|
| **Music Streaming + NFT** | Stream your NFTs, earn rewards | NFTs are static JPEGs |
| **WIN-WIN Rewards** | Artists AND listeners earn OGUN | Zero earning for buyers |
| **Social Feed** | Posts, stories, DMs, reactions | No social features |
| **Concert Chat** | Nostr-powered location chat | Nothing |
| **Agent Economy** | Moltbook agents can trade/listen | No AI agent support |
| **0.05% Fees** | Lowest in Web3 | 0.5-5% fees |
| **Decentralized Notifications** | Free via Nostr/Web Push | Email only or none |
| **24hr Stories/Reels** | IPFS-backed, can make permanent | Nothing |

**This is our edge. We're not just a marketplace - we're a music ecosystem.**

---

## PHASE 1: FOUNDATION (Fix & Stabilize)
**Timeline: Current Sprint**
**Goal: Stop the bleeding, make what exists work perfectly**

### 1.1 Complete Token Infrastructure
| Task | Status | Blocker |
|------|--------|---------|
| Generate Gnosis Safe wallets for 22 remaining tokens | NOT DONE | Need Fleet Commander access |
| Deploy ZetaChain contracts (4 ready) | NOT DONE | Need deployer key with gas |
| Add contract addresses to Vercel env vars | NOT DONE | Depends on deployment |
| Authorize backend wallet for piggy bank claims | NOT DONE | Gnosis Safe multisig |

### 1.2 Deploy Written Contracts
| Contract | Lines | Status | Action |
|----------|-------|--------|--------|
| RoyaltySplitterFactory | 200+ | Written | Deploy to Polygon mainnet |
| SoundchainOmnichain | 416 | Written | Deploy to Polygon + ZetaChain |
| SoundchainFeeCollector | 354 | Written | Deploy to Polygon |
| SoundchainNFTBridge | 424 | Written | Deploy to ZetaChain |
| OmnichainRouter | 651 | Written | Deploy to Polygon + ZetaChain + ETH |

### 1.3 Fix Active Bugs
- Duplicate NFT collection display
- Sweep floor tab (currently a stub)
- Mobile balance visibility
- Legacy headers on transaction pages (DONE - commit 591beb4cd)

---

## PHASE 2: COMPETE (Build What Rivals Have)
**Timeline: Next 4-6 weeks**
**Goal: Feature parity with OpenSea/Rarible on core marketplace**

### 2.1 Collection Pages - THE #1 MISSING FEATURE

**What to build:** `/dex/collection/[id]` - dedicated page per collection

```
Components needed:
  components/dex/CollectionPage.tsx       - Main collection view
  components/dex/CollectionHeader.tsx     - Banner, name, verified badge, stats
  components/dex/CollectionStats.tsx      - Floor, volume, owners, listed %
  components/dex/CollectionActivity.tsx   - Sales/listings/transfers feed
  components/dex/CollectionChart.tsx      - Floor price + volume over time
```

**Stats to display:**
- Floor Price (lowest active listing)
- Total Volume (all-time sales in POL + OGUN)
- Items (total supply)
- Owners (unique wallet count)
- Listed % (what % is for sale)
- Best Offer (highest standing offer)
- 24h Volume / 7d Volume
- Stream Count (UNIQUE to SoundChain - total streams across collection)

**Data source:** Aggregate from existing MongoDB Track/SCid models + new CollectionStats model

### 2.2 Offer System - MAKE OFFERS ON ANY NFT

**What to build:** Smart contract + UI for offers

```
Contracts needed:
  contracts/SoundchainOffers.sol          - Escrow-based offer system

Components needed:
  components/modals/MakeOfferModal.tsx    - Offer creation UI
  components/dex/OffersPanel.tsx          - View/accept/reject offers
  components/dex/CollectionOffer.tsx      - Bid on entire collection
```

**Offer Types:**
1. **Individual Offer** - Offer on specific NFT (even if not listed)
2. **Collection Offer** - Offer on ANY NFT in a collection
3. **Trait Offer** - Offer on any NFT with specific traits

**Smart Contract Flow:**
```
Offerer deposits OGUN/POL into escrow contract
  → Owner sees offer in their dashboard
  → Owner accepts: NFT transfers, funds release
  → Owner rejects or offer expires: funds return to offerer
  → Offerer can cancel anytime before acceptance
```

**Revenue:** 0.05% fee on accepted offers (same as all other transactions)

### 2.3 Volume Charts & Price History

**What to build:** Historical data tracking + Chart.js visualizations

```
Backend needed:
  api/src/models/MarketplaceEvent.ts      - Track every sale, listing, offer
  api/src/services/MarketplaceAnalytics.ts - Aggregation queries

Components needed:
  components/dex/VolumeChart.tsx           - 24h/7d/30d/All volume bars
  components/dex/FloorPriceChart.tsx       - Floor price line chart
  components/dex/ActivityFeed.tsx          - Real-time marketplace events
```

**MarketplaceEvent Schema:**
```typescript
{
  type: 'sale' | 'listing' | 'offer' | 'transfer' | 'mint' | 'cancel',
  tokenId: number,
  collectionAddress: string,
  from: string,         // seller/lister
  to: string,           // buyer/offerer
  price: number,        // in smallest unit
  currency: 'POL' | 'OGUN',
  txHash: string,
  timestamp: Date,
  blockNumber: number,
}
```

**Charts library:** `lightweight-charts` (TradingView) or `recharts` - NOT Chart.js (too heavy)

### 2.4 Sweep Floor - Complete the Stub

**What to build:** Batch purchase UI + contract interaction

```
Components needed:
  components/dex/SweepPanel.tsx           - Sweep UI with slider
  components/dex/SweepCart.tsx            - Selected items + total cost
```

**UX Flow:**
1. User clicks "Sweep" tab in marketplace
2. Slider shows: "Sweep 1-20 items at floor"
3. Items auto-selected from lowest price up
4. Total cost displayed with platform fee
5. One-click purchase: batch `buyItem()` calls
6. Progress indicator per item

### 2.5 Pro Trading View

**What to build:** Bloomberg-terminal inspired marketplace view

```
Components needed:
  components/dex/ProTradingView.tsx       - Split-panel layout
  components/dex/OrderBook.tsx            - Bids vs. asks display
  components/dex/DepthChart.tsx           - Bid/ask depth visualization
  components/dex/RecentTrades.tsx         - Scrolling trade ticker
```

**Layout:**
```
┌──────────────────────┬─────────────────────┐
│   COLLECTION CHART   │   ORDER BOOK        │
│   (floor + volume)   │   Bids | Asks       │
│                      │   ─────┼─────       │
│                      │   0.5  | 1.2 (3)    │
│                      │   0.45 | 1.5 (1)    │
├──────────────────────┤   0.4  | 2.0 (5)    │
│   LISTINGS GRID      ├─────────────────────┤
│   (filterable)       │   RECENT TRADES     │
│                      │   Sold 0.8 POL 2m   │
│                      │   Sold 1.2 OGUN 5m  │
└──────────────────────┴─────────────────────┘
```

### 2.6 Verified Collections & Creator Badges

**What to build:** Verification system

```
Backend needed:
  api/src/models/VerifiedCollection.ts    - Verification records
  api/src/services/VerificationService.ts - Application/review logic

Components needed:
  components/dex/VerifiedBadge.tsx         - Blue checkmark component
```

**Verification Tiers:**
| Tier | Badge | Requirements |
|------|-------|-------------|
| **Verified Creator** | Blue check | Email verified + 3+ minted tracks |
| **Verified Collection** | Gold check | 10+ items + 5+ unique owners |
| **Partner** | Purple check | Direct partnership with SoundChain |

---

## PHASE 3: DIFFERENTIATE (Leverage What Makes Us Unique)
**Timeline: 6-12 weeks**
**Goal: Build features NO other marketplace has**

### 3.1 Stream-to-Earn Marketplace Integration

**The killer feature:** NFT value tied to streaming performance

**Concept:** Every music NFT on SoundChain isn't just a collectible - it's a revenue-generating asset. Show this data PROMINENTLY on every listing.

```
Components needed:
  components/dex/StreamEarningsWidget.tsx  - Shows projected OGUN earnings
  components/dex/StreamROI.tsx            - ROI calculator for buyers
```

**Display on every NFT card:**
```
┌─────────────────────────┐
│  🎵 "Varja" by Artist   │
│  ─────────────────────  │
│  Price: 5 OGUN          │
│  Streams: 1,247         │
│  Earned: 12.4 OGUN      │ ← Lifetime earnings from streams
│  APR: ~248%             │ ← Annual return based on stream rate
│  ─────────────────────  │
│  [BUY NOW]  [OFFER]     │
└─────────────────────────┘
```

**Why this wins:** No other marketplace shows yield on NFTs. Blur shows PnL based on floor price changes. We show ACTUAL INCOME from streaming. This is unprecedented.

### 3.2 Live Marketplace Activity + Agent Trades

**Concept:** Show a live feed of ALL marketplace activity including AI agent interactions

```
Components needed:
  components/dex/LiveActivityTicker.tsx   - Scrolling ticker at top
  components/dex/AgentTradesFeed.tsx      - Agent-specific activity
```

**Feed Types:**
- `🎵 @kilmon listened to "Varja" (Agent)`
- `💰 0x8f93...5df6 bought "Night Drive" for 2 OGUN`
- `📋 New listing: "Echoes" at 0.5 POL`
- `🎯 @SoundChainRadio bookmarked "Bass Drop"`
- `🔥 "Varja" hit 1,000 streams!`

### 3.3 Music-Native Traits & Rarity

**Concept:** Music NFTs don't have visual traits like PFP collections. We define MUSIC-NATIVE traits.

```
Trait System:
  - Genre: hip_hop, electronic, pop, etc.
  - BPM: 60-200+ (extracted from audio)
  - Key: C Major, A Minor, etc.
  - Duration: Short (<2min), Medium (2-5min), Long (5min+)
  - Mood: Energetic, Chill, Dark, Uplifting (AI-classified)
  - Stream Tier: Bronze (<100), Silver (<1K), Gold (<10K), Diamond (10K+)
  - Rarity Score: Based on trait frequency across all minted tracks
```

**Filter by music traits in marketplace** - something NO other platform can do because they only deal with images.

### 3.4 Playlist NFTs (Curated Collections)

**Concept:** Curators can create playlists of other artists' NFTs and earn a cut of streams

```
Contracts needed:
  contracts/PlaylistNFT.sol               - Playlist as NFT with revenue sharing

Components needed:
  components/dex/CreatePlaylistNFT.tsx    - Curation interface
  components/dex/PlaylistCard.tsx         - Playlist marketplace card
```

**How it works:**
1. Curator selects 10-50 tracks from marketplace
2. Mints a "Playlist NFT" that references those tracks
3. When someone buys the playlist NFT, they get streaming access to all tracks
4. Revenue split: 70% artists, 20% curator, 10% platform
5. Curators earn OGUN for every stream on their playlist

**Why this wins:** Creates a NEW asset class. DJs, tastemakers, and AI agents can monetize curation.

### 3.5 Drop Calendar & Launchpad

**Concept:** Scheduled drops with hype mechanics

```
Components needed:
  components/dex/DropCalendar.tsx         - Upcoming drops grid
  components/dex/DropPage.tsx             - Individual drop page
  components/dex/DropCountdown.tsx        - Countdown timer + notify
  components/dex/AllowlistGate.tsx        - Whitelist verification
```

**Drop Features:**
- Artist schedules a drop date/time
- Teaser page with countdown
- "Notify Me" button (Web Push + Nostr)
- Optional allowlist (holders of X tokens get early access)
- Limited edition quantities
- Reveal mechanics (artwork hidden until drop)

### 3.6 OGUN Governance (DAO)

**Concept:** OGUN holders vote on platform decisions

```
Contracts needed:
  contracts/SoundchainGovernor.sol        - OpenZeppelin Governor
  contracts/SoundchainTimeLock.sol        - Execution delay

Components needed:
  components/dex/GovernancePage.tsx        - Proposals list
  components/dex/ProposalCard.tsx          - Individual proposal
  components/dex/VoteModal.tsx             - Cast vote UI
  components/dex/DelegateModal.tsx         - Delegate voting power
```

**Governance Scope:**
- Platform fee changes (currently 0.05%)
- Treasury allocation
- New chain deployments
- Feature prioritization
- Artist grant funding

---

## PHASE 4: DOMINATE (Advanced Features for Market Leadership)
**Timeline: 3-6 months**
**Goal: Features that make SoundChain the ONLY choice for music NFTs**

### 4.1 NFT-Collateralized Lending (SoundChain Blend)

**Concept:** Borrow OGUN/POL against your music NFTs

```
Contracts needed:
  contracts/SoundchainLend.sol            - Lending pool
  contracts/SoundchainLiquidation.sol     - Liquidation engine
```

**Unique twist:** Loan health based on STREAM PERFORMANCE, not just floor price. A track earning 100 OGUN/month in streams is a safer loan than a static JPEG.

### 4.2 Cross-Chain Music NFT Bridge

**Concept:** Move your music NFTs between Polygon, Ethereum, Base, Arbitrum

Using the already-written `SoundchainNFTBridge.sol` and `OmnichainRouter.sol`

### 4.3 AI Agent Marketplace

**Concept:** Dedicated section where AI agents trade, curate, and discover music

```
Components needed:
  components/dex/AgentMarketplace.tsx      - Agent-specific marketplace
  components/dex/AgentProfile.tsx          - Agent portfolio/taste profile
  components/dex/AgentRecommendations.tsx  - AI-powered discovery
```

**Leverages:** Existing Moltbook integration, Agent API, OGUN Radio

### 4.4 Revenue Analytics Dashboard

**Concept:** Full financial dashboard for artists and collectors

```
Components needed:
  components/dex/RevenueDashboard.tsx      - Artist earnings overview
  components/dex/StreamAnalytics.tsx       - Streaming data + trends
  components/dex/TaxExport.tsx             - CSV export for tax reporting
  components/dex/PnLTracker.tsx            - Buy/sell PnL calculation
```

**Metrics:**
- Total revenue (streams + sales + tips)
- Revenue by track
- Revenue by time period
- Listener demographics
- Geographic distribution
- Export to CSV for tax filing

### 4.5 Referral Engine

**Concept:** Earn OGUN for bringing new users and generating volume

```
Backend needed:
  api/src/models/Referral.ts              - Referral tracking
  api/src/services/ReferralService.ts     - Code generation + rewards

Components needed:
  components/dex/ReferralDashboard.tsx     - Earnings from referrals
```

**Tiers:**
| Level | Volume Generated | Reward Rate |
|-------|-----------------|-------------|
| Bronze | 0-100 POL | 0.01% of referred volume |
| Silver | 100-1K POL | 0.02% |
| Gold | 1K-10K POL | 0.03% |
| Diamond | 10K+ POL | 0.05% |

---

## COMPETITIVE POSITIONING SUMMARY

```
                    OPENSEA     BLUR      RARIBLE    SOUNDCHAIN
                    ───────     ────      ───────    ──────────
NFT Trading          ✅         ✅         ✅          ✅
Music Streaming      ❌         ❌         ❌          ✅ ★
Stream Earnings      ❌         ❌         ❌          ✅ ★
Social Features      ❌         ❌         ❌          ✅ ★
Agent Economy        ❌         ❌         ❌          ✅ ★
Collection Pages     ✅         ✅         ✅          ❌ → PHASE 2
Offer System         ✅         ✅         ✅          ❌ → PHASE 2
Volume Charts        ✅         ✅         ✅          ❌ → PHASE 2
Sweep Floor          ✅         ✅         ❌          ❌ → PHASE 2
Pro Trading          ❌         ✅         ❌          ❌ → PHASE 2
Governance           ❌         ❌         ✅          ❌ → PHASE 3
Lending              ❌         ✅         ❌          ❌ → PHASE 4
Multi-Chain          ✅         ❌         ✅          ⚠️ → PHASE 1
Fees                 2.5%       0.5%      2.5%       0.05% ★
```

**★ = UNIQUE ADVANTAGE (no competitor has this)**

---

## THE OPTIMIZED BINARY

The "optimized binary" isn't a marketing phrase - it's a directive:

1. **Every feature must serve the outcome** - If it doesn't help artists earn or fans discover, cut it
2. **Music-native > Generic** - Don't copy OpenSea's PFP features. Build for MUSIC
3. **Streaming is the moat** - No other marketplace has revenue-generating NFTs. This is everything
4. **Agents are the multiplier** - 1.7M Moltbook agents are potential users. Build for them
5. **0.05% is the wedge** - Lowest fees in Web3. Lead with this everywhere
6. **Polygon L2 is the foundation** - Fast, cheap, proven. Don't chase new chains until this is maxed

**The outcome:** SoundChain becomes the platform where music NFTs aren't collectibles - they're income-producing assets in a perpetual economy that never sleeps.

---

*This roadmap is a living document. Update as milestones are hit.*
*Last updated: February 13, 2026*
