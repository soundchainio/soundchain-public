# SoundChain Development Handoff - December 28, 2025

## Session Summary

Major infrastructure migration: Replacing Mux streaming with Pinata/IPFS for decentralized P2P audio streaming. This lays the foundation for the non-Web3 upload feature with tiered pricing.

---

## Commits

### 1. Pinata/IPFS Streaming Integration
**Commit:** `554738be7`
```
feat: Add Pinata/IPFS streaming integration to replace Mux
```

**Changes:**
- Added `ipfsCid` and `ipfsGatewayUrl` fields to Track model
- Updated `playbackUrl` resolver to prioritize IPFS over Mux
- Enhanced PinningService with audio streaming methods
- Auto-pin new tracks to IPFS on creation
- Added `createTrackIPFSOnly` method for non-Web3 uploads
- Created migration scripts for existing tracks

---

## Files Modified

| File | Purpose |
|------|---------|
| `api/src/models/Track.ts` | Added ipfsCid, ipfsGatewayUrl fields |
| `api/src/resolvers/TrackResolver.ts` | playbackUrl prioritizes IPFS over Mux |
| `api/src/services/PinningService.ts` | Audio streaming methods, gateway URL helper |
| `api/src/services/TrackService.ts` | Auto-pin to IPFS, createTrackIPFSOnly method |
| `api/.env.sample` | PINATA_GATEWAY_URL, PINATA_DEDICATED_GATEWAY |

## New Migration Scripts

| Script | Purpose |
|--------|---------|
| `download-mux-streams.ts` | Download HLS streams → local MP4 via ffmpeg |
| `pin-to-ipfs.ts` | Pin local MP4s to Pinata (no DB required) |
| `apply-ipfs-cids.ts` | Update MongoDB with IPFS CIDs |
| `migrate-to-ipfs.ts` | All-in-one migration (requires DB) |

---

## Migration Progress (In Progress)

### Step 1: Download from Mux ✅ COMPLETE
```
Total: 5,424
Downloaded: 5,411
Failed: 8
Size: 16.2 GB
Duration: 75 minutes
```

### Step 2: Pin to IPFS 🔄 IN PROGRESS
```
Progress: ~1,500 / 5,416 (~28%)
Estimated completion: ~2 hours remaining
Results saved to: mux_exported/ipfs_pins.json
```

### Step 3: Apply CIDs to MongoDB ⏳ PENDING
```bash
npx ts-node src/scripts/apply-ipfs-cids.ts
```

---

## Architecture Changes

### Playback URL Priority
```typescript
// TrackResolver.ts - playbackUrl field resolver
@FieldResolver(() => String)
playbackUrl(@Root() { ipfsCid, ipfsGatewayUrl, muxAsset }: Track): string {
  // Priority 1: IPFS (decentralized)
  if (ipfsCid) {
    return ipfsGatewayUrl || `https://gateway.pinata.cloud/ipfs/${ipfsCid}`;
  }
  // Priority 2: Mux (legacy fallback)
  return muxAsset ? `https://stream.mux.com/${muxAsset.playbackId}.m3u8` : '';
}
```

### New Track Creation with IPFS
```typescript
// TrackService.ts
async createTrack(...) {
  // ... create track
  // Pin to IPFS in background (non-blocking)
  this.pinTrackToIPFS(track._id, data.assetUrl, data.title);
}

// For non-Web3 uploads (IPFS only, no Mux)
async createTrackIPFSOnly(profileId, data, s3Key) {
  // Pin first (blocking), then save
}
```

---

## Environment Variables

```bash
# Pinata Configuration
PINATA_API_KEY=your_key
PINATA_API_SECRET=your_secret
PINATA_GATEWAY_URL=https://gateway.pinata.cloud/ipfs
PINATA_DEDICATED_GATEWAY=https://soundchain.mypinata.cloud/ipfs
```

---

## Cost Comparison

| Service | Cost |
|---------|------|
| **Mux** | ~$0.03/min encoded + streaming |
| **Pinata** | ~$0.15/GB stored (one-time) + gateway |

**Savings:** Significant for a music platform with 5,400+ tracks

---

## Next Steps

1. **Complete IPFS pinning** (~2 hours remaining)
2. **Apply CIDs to MongoDB** when SSH tunnel active
3. **Stripe Integration** for non-Web3 uploads with tiered pricing:
   - 2% fee for non-Web3 (SCID-only)
   - 0.05% fee for Web3 (NFT mints)
4. **Test playback** on web/mobile apps

---

## Local Files

- **Downloaded MP4s:** `mux_exported/{trackId}/audio.mp4`
- **IPFS Pins JSON:** `mux_exported/ipfs_pins.json`
- **Migration Reports:** `mux_exported/download_report_*.json`

---

## Previous Session Work (Dec 26)

- Waveform comments with confetti eruptions
- New Year's 2026 seasonal theme
- GPU acceleration for TV browsers
- Shuffle all NFTs feature
- Sticker/Emote rendering

---

*Generated: December 28, 2025*
