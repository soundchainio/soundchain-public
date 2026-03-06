# 🔧 Smart Contracts

<figure><img src="../.gitbook/assets/contracts-banner.png" alt="Smart Contracts"><figcaption><p>Verified & Audited Contracts on Polygon</p></figcaption></figure>

## Contract Addresses

All SoundChain smart contracts are deployed on **Polygon Mainnet** and verified on Polygonscan.

---

## 🪙 Core Contracts

### OGUN Token
| Property | Value |
|----------|-------|
| **Contract** | SoundchainOGUN20 |
| **Address** | `0x45f1af89486aeec2da0b06340cd9cd3bd741a15c` |
| **Network** | Polygon Mainnet |
| **Standard** | ERC-20 |
| **Total Supply** | 1,000,000,000 OGUN |

```
Polygonscan: https://polygonscan.com/token/0x45f1af89486aeec2da0b06340cd9cd3bd741a15c
```

---

### Streaming Rewards Distributor
| Property | Value |
|----------|-------|
| **Contract** | StreamingRewardsDistributor |
| **Address** | `0xcf9416c49D525f7a50299c71f33606A158F28546` |
| **Network** | Polygon Mainnet |
| **Treasury** | 5,000,000 OGUN funded |

**Functions:**
- `claimRewards()` - Claim accumulated streaming rewards
- `getUnclaimedRewards(address)` - Check pending rewards
- `batchClaim(scids[])` - Claim multiple tracks at once (max 100)

```
Polygonscan: https://polygonscan.com/address/0xcf9416c49D525f7a50299c71f33606A158F28546
```

---

### Staking Rewards
| Property | Value |
|----------|-------|
| **Contract** | StakingRewards |
| **Network** | Polygon Mainnet |
| **Features** | Stake OGUN, Earn APY |

**Functions:**
- `stake(amount)` - Stake OGUN tokens
- `withdrawStake(amount)` - Unstake OGUN
- `getReward(address)` - Check earned rewards
- `getBalanceOf(address)` - Check staked balance

---

## 🛒 Marketplace Contracts

### MultiTokenMarketplace (V3 - Current)
| Property | Value |
|----------|-------|
| **Contract** | MultiTokenMarketplace |
| **Type** | UUPS Upgradeable Proxy |
| **Supported Tokens** | 32 |
| **Fee** | 0.05% Treasury + Platform Fee |

**Supported Payment Tokens:**
```
POL, OGUN, PENGU, ETH, USDC, USDT, SOL, BNB, DOGE, BONK,
MEATEOR, PEPE, BASE, XTZ, AVAX, SHIB, XRP, SUI, HBAR, LINK,
LTC, ZETA, BTC, YZY, ADA, DOT, ATOM, FTM, NEAR, OP, ARB, ONDO
```

**Key Functions:**
```solidity
// Create listing
function createListing(
    address nftContract,
    uint256 tokenId,
    uint256 price,
    address priceToken,
    address[] acceptedTokens
) external;

// Buy NFT
function buy(bytes32 listingId, address paymentToken) external payable;

// Cancel listing
function cancelListing(bytes32 listingId) external;
```

---

### MarketplaceEditions (V2)
| Property | Value |
|----------|-------|
| **Contract** | SoundchainMarketplaceEditions |
| **Supported Tokens** | 7 (POL, OGUN, BTC, DOGE, PENGU, BONK, MEATEOR) |
| **Features** | Edition minting, Batch airdrops |

**Payment Type Enum:**
```solidity
enum PaymentType { POL, OGUN, BTC, DOGE, PENGU, BONK, MEATEOR }
```

---

## 🎵 NFT Contracts

### SoundChain NFT (ERC-721)
| Property | Value |
|----------|-------|
| **Standard** | ERC-721 |
| **Royalties** | ERC-2981 (up to 10%) |
| **Features** | Metadata, Collaborator splits |

---

## 🌐 Cross-Chain (ZetaChain)

### Omnichain Contract
| Property | Value |
|----------|-------|
| **Network** | ZetaChain |
| **Purpose** | Cross-chain NFT purchases |
| **Supported** | BTC, ETH, BNB native chains |

---

## 🔒 Security

### Audits
- OpenZeppelin standard libraries
- ReentrancyGuard on all payment functions
- Ownable access control
- Pausable emergency stop

### Best Practices
- ✅ Non-custodial design
- ✅ Pull payment pattern
- ✅ SafeERC20 for token transfers
- ✅ Integer overflow protection (Solidity 0.8+)

---

## 📊 Fee Structure

```
┌────────────────────────────────────────────────────────────┐
│                   TRANSACTION FEES                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Sale Price: 100 OGUN                                      │
│  ─────────────────────────────────────                     │
│  Treasury Fee (0.05%):     0.05 OGUN  → Streaming Rewards  │
│  Platform Fee (2.5%):      2.50 OGUN  → Operations         │
│  Creator Royalty (5%):     5.00 OGUN  → Original Creator   │
│  ─────────────────────────────────────                     │
│  Seller Receives:         92.45 OGUN                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 🔗 Quick Links

| Contract | Polygonscan |
|----------|-------------|
| OGUN Token | [View](https://polygonscan.com/token/0x45f1af89486aeec2da0b06340cd9cd3bd741a15c) |
| Streaming Rewards | [View](https://polygonscan.com/address/0xcf9416c49D525f7a50299c71f33606A158F28546) |

---

## 📁 Source Code

All contracts are open source:
- **GitHub:** [soundchain-contracts](https://github.com/agencyenterprise/soundchain-contracts)

---

<div align="center">

**Verified. Audited. Open Source.**

[**View on Polygonscan →**](https://polygonscan.com/token/0x45f1af89486aeec2da0b06340cd9cd3bd741a15c)

</div>
