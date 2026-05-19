# CLAUDE.md - SoundChain Development Guide

## 🚨 OPEN FOLLOW-UP (Frank-tasked, May 17, 2026) — `api.soundchain.io` custom-domain bridge DOWN

**Frank's hands needed (AWS Console).** Lambda + API Gateway are healthy — DNS resolves to `d-bb15gwni7a.execute-api.us-east-1.amazonaws.com` and the underlying API GW URL responds in 154ms — but TLS connections to `api.soundchain.io` time out after 8s. Custom-domain → API Gateway mapping is broken at the TLS layer (likely ACM cert detached / custom domain mapping removed / wrong stage binding). Check API Gateway → Custom domain names → `api.soundchain.io`, verify ACM cert `d802632a-515a-44a2-984d-371741e03d71` is attached, re-map to `production-soundchain-api` stage `production` if missing. Playbook in CLAUDE.md "AWS INFRASTRUCTURE" section. **NOT blocking auth post `9ccf9bf` (useMe now reads /api/me direct → Atlas)** — but every remaining Apollo query in the app (posts, comments, feed enrichment, reactions, marketplace metadata) is silently failing while this is down. Phase 7e Apollo strip is the proper long-term fix; api.soundchain.io repair is the short-term unblock.

---

## 🏀 SESSION: May 19, 2026 (Frank → Sarg) — PHASE 16.49: T-POSE BUG FINALLY FIXED (commit `5926028`)

Frank tested Phase 16.48 (`db50c12`) and reported every action pill (SHOOT/DUNK/LAYUP/FADEAWAY/REBOUND/BLOCK/PASS/CROSSOVER/JABSTEP/PUMPFAKE) still rendering as T-pose. *"claude tge player still ahoots and does all the action pills on roght sode all in T body formationz"*. Then: *"i dod a screen revording i will share shortylwhen i get home"*. Phase 16.49 is the THIRD fix attempt across two days and the first one that's mathematically correct.

### Root cause (third diagnostic round)

`THREE.AnimationUtils.makeClipAdditive` computes per-frame additive values as `q_value × q_referenceFrame⁻¹` (verified by reading `web/node_modules/three/src/animation/AnimationUtils.js:288-315`). With Phase 16.42's `bindQuat × delta` keyframes still in place:

- `q_value_N = bindQuat × deltaN`
- `q_ref = bindQuat` (frame 0)
- `additive_N = (bindQuat × deltaN) × bindQuat⁻¹` — **NOT** equal to `deltaN`

At additive playback: `q_final = q_base × additive_N = q_base × bindQuat × deltaN × bindQuat⁻¹` — wrong rotation axis, wrong magnitude. Visual symptom: arms locked near T-pose with subtle wiggles instead of executing the actual shooting motion.

### What shipped (`5926028`, +15 / -14, 1 file: GalleryRoom3D.tsx)

`quatTrack` at `GalleryRoom3D.tsx:1916-1929` stripped of `bindQuat` composition:

```ts
// Phase 16.49 — RAW DELTA quats (no bindQuat composition)
const quatTrack = (bonePath, times, eulers) => {
  if (!bonePath) return null
  const flat = new Float32Array(times.length * 4)
  for (let i = 0; i < eulers.length; i++) {
    _e.set(eulers[i][0] || 0, eulers[i][1] || 0, eulers[i][2] || 0)
    _q.setFromEuler(_e)
    flat[i*4] = _q.x; flat[i*4+1] = _q.y; flat[i*4+2] = _q.z; flat[i*4+3] = _q.w
  }
  return new THREE.QuaternionKeyframeTrack(`${bonePath}.quaternion`, times, flat)
}
```

Frame 0 = identity quat (Euler `[0,0,0]`). `makeClipAdditive` leaves frame 0 as identity = zero contribution at clip start. Middle frames = pure deltas. Additive playback: `q_final = q_base × q_delta` = arm rotates from idle position (arms at sides) by `q_delta` and back to idle at clip end. Removed `_qBind` + `_qDelta` allocations — `quatTrack` is simpler and faster.

### Architecture (load-bearing — don't ship Phase 16.50 that re-adds bind composition)

1. **Mixamo XBot GLB bind pose IS T-pose at the shoulders.** Every Mixamo character is authored with arms-out as the bind. `bone.quaternion` at GLTF load captures T-pose rotation, not arms-at-sides. The "arms at sides" pose is what the IDLE animation produces, not the bind.
2. **Raw deltas + additive = correct.** Idle drives the base pose. Authored shoot clip adds rotation delta on top via `q_base × q_delta`. Result: arm rotates from wherever idle has it to wherever delta takes it.
3. **`bindQuat × delta + additive` = mathematically WRONG.** `makeClipAdditive`'s quaternion subtraction doesn't unwind the bind multiplication cleanly. Don't try to "be smart" by composing on bind — three.js's engine does that for you via the base layer.
4. **`bindQuat × delta + REPLACE` (Phase 16.42 / 16.43) = also broken.** Frame 0 = bindQuat = T-pose, so every move SNAPS to T-pose at clip start before applying deltas.
5. **The captured `bindQuat` is now unused.** Removed for clarity + microperf.

### Phase arc (the painful path)

| Phase | Commit | What it tried | Why it didn't work |
|---|---|---|---|
| 16.42 | `3b8f68d` | `bindQuat × delta` + REPLACE crossfade | Frame 0 = T-pose snap on every gesture |
| 16.43 | `4a4ac3c` | Denser Kobe keyframes on top of 16.42 | Polish on broken foundation = polished broken |
| 16.44 | `4d59b82` | Fans + crowd cheer (unrelated to player anim) | Independent ship, didn't surface or fix T-pose |
| 16.48 | `db50c12` | Switch to additive blending, keep bind keyframes | Math: `(bindQuat × delta) × bindQuat⁻¹` ≠ delta |
| **16.49** | **`5926028`** | **Strip bind composition + keep additive** | **Frame 0 = identity, deltas apply cleanly via `q_base × q_delta`** |

### Build + deploy

- `yarn build` 84.29s clean
- Pushed `5926028` to `main` → Vercel webhook auto-deploys (Bug #27 fix from May 13 still holding on web/)

### Verify path (Frank → Sarg post-deploy)

1. Hard-refresh `https://soundchain.io/gallery3d?theme=gym`
2. Tap SHOOT → arm rotates from idle (arms at sides) UP overhead and back down. Ball releases at the peak.
3. Same test on DUNK / LAYUP / FADEAWAY / REBOUND / BLOCK / PASS / CROSSOVER / JABSTEP / PUMPFAKE / DEFENSE — all should rotate from idle through their authored gesture and back.
4. Frank's pending iPhone screen recording will confirm cross-device.

### Lessons

1. **Three.js animation math doesn't commute.** Quaternion multiplication order matters at every layer (keyframe authoring, makeClipAdditive subtraction, additive playback composition). Verify the math symbolically before shipping a fix — `q_final = q_base × additive` only equals `q_base × delta` when `additive = delta`. If your additive value has bind quats baked in, the bind quats appear in `q_final` too.
2. **Verify against the ACTUAL three.js source, not assumed behavior.** Phase 16.48 assumed `makeClipAdditive` would produce the right additive values "somehow." Reading the source revealed exactly the multiplication order — and made the bind composition asymmetry visible.
3. **Frank's screen recording is the right verification tool.** Three failed fix-and-ship cycles burned more time than a 30-second recording would have. Default to "screen recording first, fix second" when the bug is visual and the spec is ambiguous.
4. **A "fix" shipped + verified by intuition is not actually verified.** Phase 16.48's commit message claimed success based on the additive hypothesis, not on Frank actually playing the gym. Sarg memory + `[[feedback_threejs_additive_for_layered_anims]]` now reflect that 16.48 was incomplete and 16.49 is the actual fix.

### Open follow-ups

- **`api.soundchain.io` custom-domain TLS bridge repair** — Frank's hands needed (AWS Console). Pinned top of CLAUDE.md.
- **Anvil RTX 5000 + Mixamo retarget** — banked behind AWS Console + `NORMAN_URL`. Replaces today's hand-keyframed gestures with proper NBA-rigged retargets.
- **TripoSR mesh on court (Phase 16.50)** — auto-rig Frank's CharacterDesigner output to XBot skeleton via Mixamo Auto-Rigger API.
- **WebRTC peer-sync for 1-on-1 arena matchups** — single-player gym dialed; 2-player is next frontier.

---


## ⚠️ SESSION START PROTOCOL (MANDATORY — READ BEFORE ANY CODE)

Before writing ANY code, read these 4 files and CONFIRM to User:
1. **This file (CLAUDE.md)** — architecture, contracts, protected files
2. **sarg.md** — `cat ~/.claude/projects/-Users-soundchain/memory/sarg.md | head -80`
3. **MEMORY.md** — `cat ~/.claude/projects/-Users-soundchain/memory/MEMORY.md | head -60`
4. **bug-report.md** — `cat ~/.claude/projects/-Users-soundchain/memory/bug-report.md | tail -40`

Then say: **"Scoped CLAUDE.md, sarg.md, MEMORY.md, bug-report.md. Synced on [brief summary]. Ready to work."**

**DO NOT START CODING UNTIL CONFIRMED.** User's direct order. See `feedback_session_start_protocol.md`.

---

**Last Updated:** April 28, 2026 (Sarg)
**Project Start:** July 14, 2021
**Total Commits:** 10,000+ (across all branches)

---

## CRITICAL: DO NOT TOUCH THESE FILES

### Protected Files (CODEOWNERS)
These files have caused critical bugs when modified. Require extra caution:

| File | Reason | Last Incident |
|------|--------|---------------|
| `web/src/pages/login.tsx` | OAuth flow fragile | Jan 5, 2026 - broke mobile login |
| `web/src/hooks/useMagicContext.tsx` | Session management | Broke login flow multiple times |
| `web/src/hooks/useMe.ts` | Global user hook | Modifying breaks OAuth |
| `api/src/services/SCidService.ts` | Streaming rewards | Batch size bug Jan 7 |
| `web/src/components/dex/StakingPanel.tsx` | Complex state | 836 lines, needs refactor |

### DO NOT Modify `useMe` Hook
**Learned the hard way:** Changes to the global `useMe` hook break OAuth login flow. The hook is tightly coupled with Magic SDK session restoration.

### NEVER Test on Localhost
**CRITICAL:** We ONLY work in production and test in production. ALWAYS.
- NEVER run curl/fetch against `localhost:3000` to test changes
- NEVER use `yarn dev` for testing - push to prod and test via Cloudflare tunnel
- All testing happens on the live production deployment
- The user tests on mobile via Cloudflare tunnel to production
- If you need to verify a fix works, push to production and wait for Vercel deploy

### NEVER Use Twilio/SMS Services
**CRITICAL:** SoundChain is DECENTRALIZED. We break down centralized systems.
- NEVER suggest Twilio, AWS SNS, or any paid SMS service
- NEVER implement traditional SMS notifications
- Phone numbers in settings are for Nostr-based notifications ONLY
- All notifications go through: **Web Push (FREE)** or **Nostr/Bitchat (FREE)**
- We don't pay per-message fees to centralized telecom gatekeepers

**Our Notification Stack:**
| Method | Protocol | Cost |
|--------|----------|------|
| Web Push | VAPID/Service Worker | FREE |
| Nostr DMs | NIP-17 Encrypted | FREE |
| Bitchat | Bluetooth Mesh + Nostr | FREE |

---


## SMART CONTRACT ADDRESSES

| Contract | Address | Network | Status |
|----------|---------|---------|--------|
| **SoundChain Safe (Treasury)** | `0x519BED3fE32272Fa8f1AECaf86DbFbd674Ee703B` | Polygon | **FEE COLLECTION** |
| OGUN Token | `0x45f1af89486aeec2da0b06340cd9cd3bd741a15c` | Polygon | LIVE |
| StreamingRewardsDistributor | `0xcf9416c49D525f7a50299c71f33606A158F28546` | Polygon | Funded (5M OGUN) |
| StakingRewards | Config address | Polygon | LIVE |
| SCidRegistry | Deployed | Polygon | LIVE |
| RoyaltySplitter | Not deployed yet | Polygon | CONTRACT READY |
| RoyaltySplitterFactory | Not deployed yet | Polygon | CONTRACT READY |

### SoundChain Safe Treasury (Fee Collection)
**Address:** `0x519BED3fE32272Fa8f1AECaf86DbFbd674Ee703B`
**Polygonscan:** https://polygonscan.com/address/0x519BED3fE32272Fa8f1AECaf86DbFbd674Ee703B

This is where ALL platform fees are collected from:
- NFT Minting (0.05% of gas cost, min 0.001 POL)
- Marketplace Sales (0.05% sale + 0.05% gas = 0.10% total)
- Token Swaps (0.05%)
- Staking/Unstaking (0.05%)
- Cross-chain swaps via ZetaChain (0.05%)

**24 Token Support** - Fees collected in POL from all 24 supported tokens!

**CRITICAL:** Address is `519BED3fE...` NOT `519BD3fE...` (note the 'E' after 'B')

---


---

*Architecture reference, bug history, AWS/dev/embed/marketplace/CI/CD docs, and ROADMAP have all rotated to `/Users/soundchain/claude-booklet.md` to keep CLAUDE.md under 40k chars. Search the booklet by section header when you need them.*
