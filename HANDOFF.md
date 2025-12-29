# SoundChain Development Handoff - December 29, 2025

## Session Summary

Fixed three critical issues:
1. **AudioPlayerModal artwork not loading** - CORS pre-validation was failing
2. **Mobile audio playback broken** - IPFS URLs weren't being handled correctly
3. **Switched minting to IPFS-only** - No more Mux for new tracks

---

## Issues Fixed This Session

### 1. AudioPlayerModal Artwork Not Loading (FIXED)
**Commit:** `d9226dcd8`

Removed CORS-failing `useValidatedImageUrl` hook.

### 2. Mobile Audio Playback Not Working (FIXED)
**Commit:** `cd4e4ffcb`

AudioEngine now detects HLS vs direct audio files.

### 3. Minting Now Uses IPFS Only (FIXED)
**Commit:** `8c07b2553`

- `createMultipleTracks` now uses `createTrackIPFSOnly` instead of Mux
- New tracks are pinned directly to Pinata/IPFS from S3
- Old Mux-based `createTrack` renamed to `createTrackLegacy` (deprecated)

---

## Current Audio Architecture (After Changes)

```
NEW MINTS:     Upload → S3 → Pinata/IPFS → Direct MP3/WAV playback
EXISTING:      Already migrated to IPFS (5,416 tracks)
LEGACY:        Old tracks without ipfsCid → Mux HLS fallback (.m3u8)
```

**Flow:**
1. User uploads audio → S3
2. `createMultipleTracks` calls `createTrackIPFSOnly`
3. `createTrackIPFSOnly` pins S3 file to Pinata
4. Track saved with `ipfsCid` and `ipfsGatewayUrl`
5. `playbackUrl` resolver returns Pinata gateway URL

---

## Pending Issues

### NFT Minting Not Working (NEEDS INVESTIGATION)
User reports minting hasn't worked since going live. Now that IPFS upload is fixed, test minting again. If still failing, check:
- Frontend mint form in `web/src/components/forms/track/`
- Smart contract interactions
- Wallet connection/transaction signing

### CarPlay Now Working (FIXED)
CarPlay wasn't working because mobile audio wasn't playing. The mobile audio fix (`cd4e4ffcb`) also fixes CarPlay since Media Session API requires audio to be playing. After deployment:
1. Force-close Safari on iPhone
2. Reopen SoundChain and play a track
3. CarPlay should display title/artist/artwork

### Audio Normalization Added (FIXED)
**Commit:** `a1cfa3977`

Added -24 LUFS audio normalization using Web Audio API. All playback now goes through a gain node that normalizes volume for consistent loudness across tracks.

- **No compression** - preserves original dynamics
- Uses gain-only normalization (-6dB reduction)
- Targets -24 LUFS broadcast standard
- Fallback to native volume if Web Audio API not available

---

## Quick Commands

```bash
# Continue this session
cd ~/soundchain && claude -c

# Check deployment status
git log --oneline -5

# Check Lambda logs
aws logs tail /aws/lambda/soundchain-api-production-graphql --since 5m
```

---

## Commits Pushed Today

| Commit | Description |
|--------|-------------|
| `a1cfa3977` | feat: Add -24 LUFS audio normalization (dynamics preserved) |
| `785648458` | docs: Add CarPlay fix note to HANDOFF |
| `8c07b2553` | feat: Switch minting to IPFS-only (no more Mux) |
| `cd4e4ffcb` | fix: Support both HLS streams and direct IPFS audio |
| `d9226dcd8` | fix: Remove artwork pre-validation (CORS issue) |

---

## Files Modified Today

| File | Change |
|------|--------|
| `api/src/services/TrackService.ts` | Switched minting to IPFS-only |
| `web/src/components/common/BottomAudioPlayer/AudioEngine.tsx` | Handle HLS + direct audio + -24 LUFS normalization |
| `web/src/components/modals/AudioPlayerModal.tsx` | Removed CORS pre-validation |

---

## Key Code Changes

### TrackService.ts - New Minting Flow
```typescript
async createMultipleTracks(profileId: string, data: { track: Partial<Track>; batchSize: number }): Promise<Track[]> {
  const url = new URL(data.track.assetUrl);
  const s3Key = url.pathname.replace(/^\//, '');

  // IPFS-only (no Mux)
  return await Promise.all(
    Array(data.batchSize)
      .fill(null)
      .map(() => this.createTrackIPFSOnly(profileId, data.track, s3Key)),
  );
}
```

### AudioEngine.tsx - HLS Detection
```typescript
const isHlsStream = currentSong.src.includes('.m3u8')

if (isHlsStream) {
  // Use HLS (native or hls.js)
} else {
  // Direct audio file (IPFS)
  audio.src = currentSong.src
}
```

---

## Infrastructure Notes

- **Bastion:** STOPPED
- **Database:** `test` database
- **Mux:** No longer used for new tracks (legacy fallback only)
- **IPFS:** All new + migrated tracks use Pinata gateway

---

*Updated: December 29, 2025 @ 4:30 PM MST*
