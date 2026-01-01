# SoundChain ID (SCid) Library

## Overview

SoundChain ID (SCid) is our Web3 replacement for traditional ISRC codes. Each track minted on SoundChain receives a unique SCid that enables:
- Cross-chain royalty tracking
- OGUN streaming rewards distribution
- Decentralized music identification

## SCid Format

```
SC-{CHAIN}-{YEAR}{MONTH}-{SEQUENCE}
```

**Example:** `SC-POL-2501-000001`

| Component | Description |
|-----------|-------------|
| `SC` | SoundChain prefix |
| `CHAIN` | 3-letter chain code (POL, ETH, ZET, ARB, BNB, etc.) |
| `YEAR` | 2-digit year (25 = 2025) |
| `MONTH` | 2-digit month (01-12) |
| `SEQUENCE` | 6-digit sequential number |

## Supported Chains (via ZetaChain)

| Chain Code | Network | Status |
|------------|---------|--------|
| `POL` | Polygon (Primary) | Active |
| `ETH` | Ethereum | Planned |
| `ZET` | ZetaChain | Planned |
| `ARB` | Arbitrum | Planned |
| `BNB` | BNB Chain | Planned |
| `AVA` | Avalanche | Planned |
| `OPT` | Optimism | Planned |

## OGUN Streaming Rewards

### Reward Flow
```
Stream Event (30+ seconds)
    |
    v
+-------------------+
|  Listener earns   | --> 0.05 OGUN
|  0.05 OGUN        |
+-------------------+
    |
    v
+-------------------+
|  Creator earns    | --> 0.05 OGUN
|  0.05 OGUN        |
+-------------------+
    |
    v
StreamingRewardsDistributor Contract
```

### Reward Tiers
| Track Type | Listener Reward | Creator Reward |
|------------|-----------------|----------------|
| NFT Mint | 0.05 OGUN | 0.05 OGUN |
| Standard | 0.05 OGUN | 0.05 OGUN |

## SCid Registry

### Grandfathered Tracks
Run `grandfatherExistingTracks` mutation to assign SCids to all existing NFTs.

```graphql
mutation {
  grandfatherExistingTracks
}
```

### Export to CSV
```graphql
query AllScids {
  scidsByProfile(profileId: "ALL") {
    id
    scid
    trackId
    chainCode
    streamCount
    ogunRewardsEarned
    createdAt
  }
}
```

---

## SCid Records Log

*This section will be populated after running the grandfatherExistingTracks mutation.*

| SCid | Track ID | Chain | Status | Streams | OGUN Earned |
|------|----------|-------|--------|---------|-------------|
| *Pending mutation...* | | | | | |

---

## API Endpoints

### Get SCid by Track
```graphql
query ScidByTrack($trackId: String!) {
  scidByTrack(trackId: $trackId) {
    scid
    chainCode
    status
    streamCount
    ogunRewardsEarned
    createdAt
  }
}
```

### Get SCids by Profile
```graphql
query ScidsByProfile($profileId: String!) {
  scidsByProfile(profileId: $profileId) {
    id
    scid
    streamCount
    ogunRewardsEarned
  }
}
```

### Log Stream (Internal)
```graphql
mutation LogStream($input: LogStreamInput!) {
  logStream(input: $input) {
    id
    scid
    streamCount
    ogunRewardsEarned
  }
}
```

---

## ZetaChain Integration

ZetaChain enables cross-chain OGUN distribution:

1. **Omnichain Messaging** - SCid data synced across chains
2. **Cross-Chain Swaps** - OGUN redeemable on any chain
3. **Unified Liquidity** - Single pool, multi-chain access

### Supported ZetaChain Operations
- `depositAndCall` - Bridge OGUN and execute action
- `crossChainTransfer` - Move OGUN between chains
- `omnichainMessage` - Sync SCid data

---

*Last Updated: 2026-01-01*
*Version: 1.0.0*
