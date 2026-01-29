# SoundChain Blockchain Flow - Complete Audit

**Last Updated:** January 28, 2026
**Status:** All operations use DIRECT CONTRACT CALLS (no Magic SDK dependencies)

---

## Contract Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           POLYGON MAINNET (Chain ID: 137)                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │   OGUN Token    │    │ Staking Rewards │    │  LP Staking     │             │
│  │ 0x45f1af894...  │───▶│ 0xe6c3F86a2...  │    │ 0x5748E147b...  │             │
│  │   (ERC-20)      │    │   (Stake OGUN)  │    │  (Stake LP)     │             │
│  └────────┬────────┘    └─────────────────┘    └─────────────────┘             │
│           │                                                                      │
│           │  approve()                                                           │
│           ▼                                                                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │ QuickSwap DEX   │    │  NFT Contract   │    │   Marketplace   │             │
│  │ 0xa5E0829Ca...  │    │ 0xF0287926D...  │───▶│ 0xD772ccf78...  │             │
│  │ (POL↔OGUN Swap) │    │ (721 Editions)  │    │  (Buy/Sell)     │             │
│  └─────────────────┘    └────────┬────────┘    └─────────────────┘             │
│                                  │                                               │
│                                  │  setApprovalForAll()                          │
│                                  ▼                                               │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │ Stream Rewards  │    │  Auction V2     │    │   Treasury      │             │
│  │ 0xcf9416c49...  │    │ 0x35f662bD7...  │    │ 0x519bed3fe...  │             │
│  │(Backend Distrib)│    │ (NFT Auctions)  │    │ (0.05% Fees)    │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Contract Address Reference

| Contract | Address | ABI File |
|----------|---------|----------|
| **OGUN Token** | `0x45f1af89486aeec2da0b06340cd9cd3bd741a15c` | SoundchainOGUN20.json |
| **Staking Rewards** | `0xe6c3F86a250b5AAd762405ce5F579F81Fddc426a` | StakingRewards.json |
| **LP Token** | `0xfF0E141891D0E66b0D094215B44eF433F43066e5` | LPToken.json |
| **LP Staking** | `0x5748E147b5479A97904eFCC466dF4f7C6dbB83F9` | LiquidityPoolRewards.json |
| **NFT V2 (Editions)** | `0xF0287926D495719b239340Fc31d268b76bAD8B42` | Soundchain721Editions.json |
| **Marketplace V1** | `0xD772ccf784Df67E14186AA6E512c1A1bd32F394f` | SoundchainMarketplace.json |
| **Marketplace V2** | `NEXT_PUBLIC_MARKETPLACE_MUTIPLE_EDITION_ADDRESS` | SoundchainMarketplaceEditions.json |
| **Auction V1** | `0x903ea5B8f1BE6EdC74e66dd89565A1d537824A2F` | SoundchainAuction.json |
| **Auction V2** | `0x35f662bD7d418fd7B19518A22aF3D54ea99e7bf0` | SoundchainAuction.json (v2) |
| **QuickSwap Router** | `0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff` | UniswapV2Router.json |
| **Stream Rewards** | `0xcf9416c49D525f7a50299c71f33606A158F28546` | Backend ethers.js |
| **Merkle Claim** | `NEXT_PUBLIC_AIRDROP_CONTRACT_ADDRESS` | MerkleClaimERC20.json |
| **Treasury (Gnosis)** | `0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b` | N/A (native transfer) |

---

## Operation Flow by Feature

### 1. SEND POL (Native Token Transfer)

**File:** `dex/[...slug].tsx` → `handleTransferToken()`

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│    User      │     │   Platform Fee   │     │  Recipient   │
│   Wallet     │────▶│   (0.05%)        │────▶│   Wallet     │
└──────────────┘     └──────────────────┘     └──────────────┘
       │                     │                       │
       │                     ▼                       │
       │             ┌──────────────┐                │
       │             │  Treasury    │                │
       │             │  Gnosis Safe │                │
       │             └──────────────┘                │
       │                                             │
       └─────────────────────────────────────────────┘
                  web3.eth.sendTransaction()
```

**Contract Calls:**
```typescript
// 1. Calculate 0.05% fee
const feeWei = web3.utils.toWei((amount * 0.0005).toFixed(18), 'ether')

// 2. Send fee to treasury
await web3.eth.sendTransaction({
  from: fromAddress,
  to: treasuryAddress,  // 0x519bed3fe...
  value: feeWei
})

// 3. Send remaining to recipient
await web3.eth.sendTransaction({
  from: fromAddress,
  to: recipient,
  value: amountWei
})
```

---

### 2. SEND OGUN (ERC-20 Token Transfer)

**File:** `dex/[...slug].tsx` → `handleTransferToken()` (OGUN branch)

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│    User      │     │   OGUN Contract  │     │  Recipient   │
│   Wallet     │────▶│  0x45f1af894...  │────▶│   Wallet     │
└──────────────┘     └──────────────────┘     └──────────────┘
       │                     │
       │                     ▼
       │             ┌──────────────┐
       │             │  Treasury    │
       │             │ (0.05% OGUN) │
       │             └──────────────┘
```

**Contract Calls:**
```typescript
const contract = new web3.eth.Contract(SoundchainOGUN20.abi, OGUNAddress)

// 1. Send 0.05% fee in OGUN to treasury
await contract.methods.transfer(treasuryAddress, feeWei).send({ from })

// 2. Send remaining OGUN to recipient
await contract.methods.transfer(recipient, amountWei).send({ from })
```

---

### 3. NFT TRANSFER

**File:** `dex/[...slug].tsx` → `handleTransferNFT()`

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│    Owner     │     │   NFT Contract   │     │  New Owner   │
│   Wallet     │────▶│  0xF0287926D...  │────▶│   Wallet     │
└──────────────┘     └──────────────────┘     └──────────────┘
       │
       │  + Platform Fee (0.05% of gas)
       ▼
┌──────────────┐
│  Treasury    │
└──────────────┘
```

**Contract Calls:**
```typescript
const contract = new web3.eth.Contract(Soundchain721.abi, nftAddress)

// 1. Estimate gas for transfer
const gasEstimate = await tx.estimateGas({ from: fromAddress })

// 2. Calculate 0.05% of gas cost
const gasCostWei = gasEstimate * gasPrice
const feeWei = gasCostWei * 0.0005

// 3. Send fee to treasury (POL)
await web3.eth.sendTransaction({ from, to: treasury, value: feeWei })

// 4. Execute NFT transfer
await contract.methods.transferFrom(from, to, tokenId).send({ from })
```

---

### 4. NFT MINT (Edition Creation)

**File:** `CreateModal.tsx` → `handleSubmit()`

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    Artist    │     │   NFT Editions   │     │   Edition        │
│   Wallet     │────▶│  0xF0287926D...  │────▶│   Created        │
└──────────────┘     └──────────────────┘     └──────────────────┘
       │                     │                       │
       │                     ▼                       ▼
       │             ┌──────────────┐     ┌──────────────────┐
       │             │  Treasury    │     │   Mint NFTs to   │
       │             │ (0.05% gas)  │     │   Edition        │
       │             └──────────────┘     └──────────────────┘
```

**Contract Calls:**
```typescript
// Uses useBlockchainV2 hook
const { createEdition, mintNftTokensToEdition } = useBlockchainV2()

// 1. Create edition on-chain
// nftContractEditions.methods.createEdition(quantity, toAddress, royaltyPercentage)
const [editionNumber] = await createEdition(from, to, royalty, quantity, nonce)
  .execute(web3)

// 2. Mint NFTs to edition
// nftContractEditions.methods.safeMintToEditionQuantity(to, uri, editionNumber, quantity)
await mintNftTokensToEdition(uri, from, to, editionNumber, quantity, nonce)
  .execute(web3)
```

---

### 5. MARKETPLACE LISTING

**File:** `useBlockchainV2.ts` → `ListItem` class

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    Seller    │     │   NFT Contract   │     │   Marketplace    │
│   Wallet     │────▶│  setApprovalFor  │────▶│   listItem()     │
└──────────────┘     │  All(marketplace)│     └──────────────────┘
                     └──────────────────┘
```

**Contract Calls:**
```typescript
// 1. Approve marketplace to transfer NFT
const nft = nftContract(web3, nftAddress)
await nft.methods.setApprovalForAll(marketplaceAddress, true).send({ from })

// 2. Create listing
const marketplace = marketplaceEditionsContract(web3)
await marketplace.methods.listItem(
  nftAddress,
  tokenId,
  1,              // quantity
  priceWei,       // POL price
  priceOGUNWei,   // OGUN price
  acceptsMATIC,
  acceptsOGUN,
  startTime
).send({ from })
```

---

### 6. MARKETPLACE BUY

**File:** `useBlockchainV2.ts` → `BuyItem` class

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    Buyer     │     │   Platform Fee   │     │   Marketplace    │
│   Wallet     │────▶│   (0.05%)        │────▶│   buyItem()      │
└──────────────┘     └──────────────────┘     └──────────────────┘
       │                     │                       │
       │                     ▼                       ▼
       │             ┌──────────────┐     ┌──────────────────┐
       │             │  Treasury    │     │  NFT transferred │
       │             └──────────────┘     │  to Buyer        │
       │                                  └──────────────────┘
```

**Contract Calls:**
```typescript
// 1. Calculate 0.05% platform fee
const feeWei = purchaseValue * 0.0005

// 2. Send fee to treasury (in payment token - POL or OGUN)
if (isPaymentOGUN) {
  await ogunContract.methods.transfer(treasury, feeWei).send({ from })
} else {
  await web3.eth.sendTransaction({ from, to: treasury, value: feeWei })
}

// 3. Execute purchase
const marketplace = marketplaceEditionsContract(web3)
await marketplace.methods.buyItem(
  nftAddress,
  tokenId,
  owner,
  isPaymentOGUN
).send({ from, value: isPaymentOGUN ? 0 : priceWei })
```

---

### 7. OGUN STAKING

**File:** `StakingPanel.tsx` → `handleStake()`

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    Staker    │     │   OGUN Token     │     │ Staking Contract │
│   Wallet     │────▶│   approve()      │────▶│   stake()        │
└──────────────┘     └──────────────────┘     └──────────────────┘
       │                                             │
       │  + Platform Fee (0.05%)                     ▼
       ▼                                   ┌──────────────────┐
┌──────────────┐                           │  Earn Rewards    │
│  Treasury    │                           │  Over Time       │
└──────────────┘                           └──────────────────┘
```

**Contract Calls:**
```typescript
const ogun = tokenContract(web3)     // SoundchainOGUN20
const staking = tokenStakeContract(web3)  // StakingRewards

// 1. Send 0.05% fee to treasury
const feeWei = BigNumber(amount).multipliedBy(0.0005)
await ogun.methods.transfer(treasury, feeWei).send({ from })

// 2. Approve staking contract
const remainingWei = BigNumber(amount).minus(feeWei)
await ogun.methods.approve(stakingAddress, remainingWei).send({ from })

// 3. Stake tokens
await staking.methods.stake(remainingWei).send({ from })
```

---

### 8. DEX SWAP (POL ↔ OGUN)

**File:** `StakingPanel.tsx` → `handleSwap()`

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    User      │     │  QuickSwap DEX   │     │   Swap Output    │
│   Wallet     │────▶│  0xa5E0829Ca...  │────▶│   Received       │
└──────────────┘     └──────────────────┘     └──────────────────┘
       │                     │
       │                     ▼
       │  + Fee (0.05%)   [POL→OGUN or OGUN→POL]
       ▼
┌──────────────┐
│  Treasury    │
└──────────────┘
```

**Contract Calls:**
```typescript
const router = routerContract(web3)  // UniswapV2Router

// POL → OGUN
await router.methods.swapExactETHForTokens(
  minAmountOut,
  [WPOL_ADDRESS, OGUN_ADDRESS],
  recipient,
  deadline
).send({ from, value: amountWei })

// OGUN → POL
await ogun.methods.approve(routerAddress, amountWei).send({ from })
await router.methods.swapExactTokensForETH(
  amountWei,
  minAmountOut,
  [OGUN_ADDRESS, WPOL_ADDRESS],
  recipient,
  deadline
).send({ from })
```

---

### 9. NFT SWEEP (Batch Transfer)

**File:** `dex/[...slug].tsx` → `handleSweep()`

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    Owner     │     │   NFT Contract   │     │   New Owner      │
│   Wallet     │────▶│  transferFrom()  │────▶│   Wallet         │
└──────────────┘     │   × N times      │     └──────────────────┘
       │             └──────────────────┘
       │
       │  + Fee (0.05% of total gas)
       ▼
┌──────────────┐
│  Treasury    │
└──────────────┘
```

**Contract Calls:**
```typescript
// 1. Calculate total gas for all transfers
let totalGas = 0
for (const tokenId of selectedTokenIds) {
  const tx = contract.methods.transferFrom(from, to, tokenId)
  totalGas += await tx.estimateGas({ from })
}

// 2. Send 0.05% fee to treasury
const feeWei = totalGas * gasPrice * 0.0005
await web3.eth.sendTransaction({ from, to: treasury, value: feeWei })

// 3. Execute all transfers
for (const tokenId of selectedTokenIds) {
  await contract.methods.transferFrom(from, to, tokenId).send({ from })
}
```

---

### 10. PROFILE TIPS

**File:** `dex/[...slug].tsx` → `handleProfileTip()`

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Tipper     │     │   OGUN Token     │     │   Creator        │
│   Wallet     │────▶│   transfer()     │────▶│   Wallet         │
└──────────────┘     └──────────────────┘     └──────────────────┘
       │                     │
       │                     ▼
       │  + Fee (0.05%)  ┌──────────────┐
       └─────────────────│  Treasury    │
                         └──────────────┘
```

**Contract Calls:**
```typescript
const ogun = new web3.eth.Contract(SoundchainOGUN20.abi, OGUNAddress)

// 1. Send 0.05% fee to treasury
const feeWei = BigNumber(amount).multipliedBy(0.0005)
await ogun.methods.transfer(treasury, feeWei).send({ from })

// 2. Send remaining tip to creator
const tipWei = BigNumber(amount).minus(feeWei)
await ogun.methods.transfer(creatorAddress, tipWei).send({ from })
```

---

### 11. AUCTION OPERATIONS

**File:** `useBlockchainV2.ts` → `CreateAuction`, `PlaceBid`, `ResultAuction` classes

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    Seller    │     │  Auction V2      │     │   Bidders        │
│              │────▶│  createAuction() │◀────│   placeBid()     │
└──────────────┘     └──────────────────┘     └──────────────────┘
                            │
                            ▼
                     ┌──────────────────┐
                     │  resultAuction() │
                     │  → NFT to winner │
                     │  → POL to seller │
                     └──────────────────┘
```

**Contract Calls:**
```typescript
const auction = auctionV2Contract(web3)

// Create auction
await auction.methods.createAuction(
  nftAddress,
  tokenId,
  reservePrice,
  false,      // isPaymentOGUN
  startTime,
  endTime
).send({ from })

// Place bid
await auction.methods.placeBid(
  nftAddress,
  tokenId,
  false,      // isPaymentOGUN
  bidAmount
).send({ from, value: bidAmount })

// Result (settle) auction
await auction.methods.resultAuction(nftAddress, tokenId).send({ from })
```

---

### 12. STREAMING REWARDS (Backend)

**File:** `api/src/utils/StreamingRewardsContract.ts`

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Backend    │     │ StreamingRewards │     │   Artist/User    │
│   (ethers)   │────▶│ 0xcf9416c49...   │────▶│   Wallet         │
└──────────────┘     └──────────────────┘     └──────────────────┘
       │
       │  Uses private key for signing
       ▼
┌──────────────────┐
│  Batch rewards   │
│  distribution    │
└──────────────────┘
```

**Contract Calls (Backend - ethers.js):**
```typescript
const contract = new ethers.Contract(
  STREAMING_REWARDS_ADDRESS,
  StreamingRewardsABI,
  wallet  // ethers.Wallet with private key
)

// Single reward
await contract.submitReward(userAddress, scid, amount, isNft)

// Batch rewards (up to 100)
await contract.batchSubmitRewards(
  addresses[],
  scids[],
  amounts[],
  isNftFlags[]
)
```

---

## Fee Collection Summary

| Operation | Fee Rate | Fee Token | Contract Method |
|-----------|----------|-----------|-----------------|
| POL Transfer | 0.05% of amount | POL | `web3.eth.sendTransaction` |
| OGUN Transfer | 0.05% of amount | OGUN | `ogun.methods.transfer` |
| NFT Transfer | 0.05% of gas cost | POL | `web3.eth.sendTransaction` |
| NFT Sweep | 0.05% of total gas | POL | `web3.eth.sendTransaction` |
| NFT Mint | 0.05% of gas cost | POL | `web3.eth.sendTransaction` |
| OGUN Stake | 0.05% of amount | OGUN | `ogun.methods.transfer` |
| OGUN Unstake | 0.05% of amount | OGUN | `ogun.methods.transfer` |
| DEX Swap | 0.05% of input | POL/OGUN | varies |
| Marketplace Buy | 0.05% of price | POL/OGUN | varies |
| Profile Tips | 0.05% of tip | OGUN | `ogun.methods.transfer` |

**All fees sent to Treasury:** `0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b`

---

## Wallet Support Matrix

| Wallet Type | Source | Provider | Direct Contract Calls |
|-------------|--------|----------|----------------------|
| Magic OAuth | `useMagicContext` | Magic SDK RPC | ✅ Yes |
| MetaMask | `useMetaMask` | window.ethereum | ✅ Yes |
| WalletConnect | `useWalletConnect` | WalletConnect | ✅ Yes |
| Web3Modal | `useUnifiedWallet` | Various | ✅ Yes |
| Coinbase | Web3Modal | Coinbase Wallet | ✅ Yes |

**CRITICAL:** All wallets use the same contract interaction code. The only difference is the Web3 provider source.

---

## Files by Contract Usage

| File | Contracts Used |
|------|----------------|
| `useBlockchainV2.ts` | NFT, Marketplace, Auction, MerkleClaim |
| `StakingPanel.tsx` | OGUN, StakingRewards, QuickSwap |
| `dex/[...slug].tsx` | OGUN, NFT (transfers), StakingRewards |
| `stake.tsx` | OGUN, StakingRewards, LPToken, LPStaking |
| `lp-stake.tsx` | OGUN, LPToken, LPStaking |
| `CreateModal.tsx` | NFT Editions (via useBlockchainV2) |
| `useMetaMask.ts` | OGUN (balance only) |
| `UnifiedWalletContext.tsx` | OGUN (balance only) |
| `usePolygonNFTs.ts` | NFT (enumeration) |

---

## Verification Checklist

- [x] POL Transfer → Direct `web3.eth.sendTransaction`
- [x] OGUN Transfer → Direct `contract.methods.transfer`
- [x] NFT Transfer → Direct `contract.methods.transferFrom`
- [x] NFT Mint → Direct `nftContractEditions.methods.createEdition` + `safeMintToEditionQuantity`
- [x] NFT Sweep → Direct batch `contract.methods.transferFrom`
- [x] Marketplace List → Direct `marketplace.methods.listItem`
- [x] Marketplace Buy → Direct `marketplace.methods.buyItem`
- [x] Auction Create → Direct `auction.methods.createAuction`
- [x] Auction Bid → Direct `auction.methods.placeBid`
- [x] OGUN Stake → Direct `staking.methods.stake`
- [x] OGUN Unstake → Direct `staking.methods.withdrawStake`
- [x] DEX Swap → Direct `router.methods.swapExact*`
- [x] Profile Tips → Direct `contract.methods.transfer`

**NO MAGIC SDK BLOCKCHAIN DEPENDENCIES** - All operations use standard Web3.js contract calls!
