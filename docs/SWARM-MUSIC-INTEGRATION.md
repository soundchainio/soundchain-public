# SoundChain Swarm Music Integration
## Bringing Multi-Agent Composition to the Blockchain

---

## Overview

Integrate Kuramoto oscillator-based swarm music composition into SoundChain, allowing AI agents to collaboratively create synchronized music that can be minted as NFTs with automatic royalty splits.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        SWARM MUSIC PIPELINE                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

  COMPOSITION LAYER                 RENDERING LAYER                 OWNERSHIP LAYER
  ─────────────────                 ───────────────                 ───────────────

  ┌─────────────┐                   ┌─────────────┐                 ┌─────────────┐
  │ Agent 1     │                   │             │                 │             │
  │ (Melody)    │───┐               │   Audio     │                 │  NFT Mint   │
  └─────────────┘   │               │   Renderer  │                 │             │
                    │               │             │                 │  Royalty    │
  ┌─────────────┐   │  ┌─────────┐  │   - Tone.js │  ┌─────────┐   │  Splitter   │
  │ Agent 2     │───┼─▶│ Kuramoto│─▶│   - Web     │─▶│  IPFS   │──▶│             │
  │ (Bass)      │   │  │ Sync    │  │     Audio   │  │  Pin    │   │  SCid       │
  └─────────────┘   │  │ Engine  │  │   - MIDI    │  └─────────┘   │  Registry   │
                    │  └─────────┘  │     Export  │                 │             │
  ┌─────────────┐   │               └─────────────┘                 └─────────────┘
  │ Agent 3     │───┤                      │
  │ (Drums)     │   │                      │
  └─────────────┘   │               ┌──────┴──────┐
                    │               │  Metadata   │
  ┌─────────────┐   │               │  - Agents   │
  │ Agent N     │───┘               │  - Params   │
  │ (Pad)       │                   │  - Sync r   │
  └─────────────┘                   └─────────────┘
```

---

## Core Components

### 1. Kuramoto Sync Engine (`/api/swarm/sync`)

Based on [fabridamicelli/kuramoto](https://github.com/fabridamicelli/kuramoto) Python implementation.

```python
# Kuramoto model for N coupled oscillators
# Each agent = one oscillator with natural frequency ωᵢ
# Phase θᵢ evolves as: dθᵢ/dt = ωᵢ + (K/N) Σⱼ sin(θⱼ - θᵢ)

class SwarmComposer:
    def __init__(self, n_agents: int, coupling_strength: float = 2.0):
        self.n_agents = n_agents
        self.K = coupling_strength
        self.phases = np.random.uniform(0, 2*np.pi, n_agents)
        self.natural_frequencies = self.assign_musical_roles()

    def assign_musical_roles(self):
        """Map agents to musical frequency domains"""
        roles = {
            'melody': (400, 800),    # Hz range
            'bass': (60, 250),
            'drums': (100, 500),
            'pad': (200, 600),
            'lead': (300, 1000)
        }
        return roles

    def step(self, dt=0.01):
        """Evolve phases using Kuramoto dynamics"""
        phase_diff = self.phases[:, None] - self.phases[None, :]
        coupling = (self.K / self.n_agents) * np.sum(np.sin(phase_diff), axis=1)
        self.phases += (self.natural_frequencies + coupling) * dt
        return self.phases

    def get_sync_order(self):
        """Calculate synchronization order parameter r ∈ [0, 1]"""
        return np.abs(np.mean(np.exp(1j * self.phases)))
```

### 2. Agent Composition API

**Endpoint:** `POST /api/agent/swarm/compose`

```typescript
interface SwarmComposeRequest {
  agents: SwarmAgent[];           // Participating agents
  duration: number;               // Seconds
  tempo: number;                  // BPM
  key: string;                    // Musical key (e.g., "Dm", "C")
  style: string;                  // Genre hint
  coupling_strength?: number;     // Kuramoto K parameter (default 2.0)
}

interface SwarmAgent {
  agent_id: string;               // SoundChain agent ID
  role: 'melody' | 'bass' | 'drums' | 'pad' | 'lead' | 'fx';
  wallet_address: string;         // For royalty splits
  royalty_share: number;          // Basis points (e.g., 2500 = 25%)
}

interface SwarmComposeResponse {
  composition_id: string;
  ipfs_cid: string;               // Audio file on IPFS
  metadata_cid: string;           // Composition metadata
  sync_score: number;             // Final synchronization (0-1)
  duration: number;
  ready_to_mint: boolean;
  mint_url: string;               // Direct link to mint
  agents: {
    agent_id: string;
    contribution_score: number;   // How much they contributed
    royalty_share: number;
  }[];
}
```

### 3. Declarative Composition Format (EtherDAW-compatible)

```json
{
  "version": "1.0",
  "title": "Swarm Emergence #001",
  "created_by": ["agent_1", "agent_2", "agent_3"],
  "parameters": {
    "tempo": 120,
    "key": "Dm",
    "time_signature": "4/4",
    "duration": 180
  },
  "kuramoto": {
    "coupling_strength": 2.5,
    "initial_phases": [0.0, 1.57, 3.14, 4.71],
    "final_sync_order": 0.97
  },
  "tracks": [
    {
      "agent": "agent_1",
      "role": "melody",
      "instrument": "synth_lead",
      "notes": [
        {"time": 0, "pitch": "D4", "duration": "4n", "velocity": 0.8},
        {"time": "0:1:0", "pitch": "F4", "duration": "8n", "velocity": 0.7}
      ]
    },
    {
      "agent": "agent_2",
      "role": "bass",
      "instrument": "synth_bass",
      "notes": [...]
    }
  ],
  "royalty_splits": [
    {"agent": "agent_1", "wallet": "0x...", "share_bps": 3000},
    {"agent": "agent_2", "wallet": "0x...", "share_bps": 3000},
    {"agent": "agent_3", "wallet": "0x...", "share_bps": 4000}
  ]
}
```

### 4. Audio Rendering Service

Options:
1. **Tone.js** (Browser) - Real-time synthesis
2. **FluidSynth** (Server) - MIDI → Audio with soundfonts
3. **SuperCollider** (Server) - Advanced synthesis

```typescript
// Server-side rendering with FluidSynth
async function renderSwarmComposition(composition: SwarmComposition): Promise<Buffer> {
  // 1. Convert declarative format to MIDI
  const midi = compositionToMidi(composition);

  // 2. Render MIDI to WAV using FluidSynth
  const wav = await fluidsynth.render(midi, {
    soundfont: '/soundfonts/GeneralUser.sf2',
    sampleRate: 44100
  });

  // 3. Convert to MP3
  const mp3 = await ffmpeg.convert(wav, 'mp3', { bitrate: '320k' });

  return mp3;
}
```

---

## Integration with SoundChain

### New API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/agent/swarm/compose` | POST | Start swarm composition |
| `/api/agent/swarm/join` | POST | Agent joins existing session |
| `/api/agent/swarm/status/:id` | GET | Check composition progress |
| `/api/agent/swarm/render/:id` | POST | Render to audio + IPFS |
| `/api/agent/swarm/mint/:id` | POST | Mint as NFT with royalty splits |
| `/api/agent/swarm/gallery` | GET | Browse swarm compositions |

### Database Schema

```typescript
// MongoDB: SwarmComposition
interface SwarmComposition {
  _id: ObjectId;
  composition_id: string;
  status: 'composing' | 'rendering' | 'ready' | 'minted';

  // Participants
  agents: {
    agent_id: string;
    wallet_address: string;
    role: string;
    royalty_share_bps: number;
    contribution_score: number;
  }[];

  // Musical parameters
  tempo: number;
  key: string;
  duration: number;
  style: string;

  // Kuramoto metrics
  kuramoto_K: number;
  final_sync_order: number;
  phase_history: number[][];

  // Output
  composition_json: object;
  audio_ipfs_cid?: string;
  metadata_ipfs_cid?: string;

  // NFT (after minting)
  scid?: string;
  token_id?: number;
  royalty_splitter_address?: string;

  createdAt: Date;
  mintedAt?: Date;
}
```

### RoyaltySplitter Integration

When swarm composition is minted, automatically deploy a RoyaltySplitter contract:

```typescript
async function mintSwarmComposition(compositionId: string) {
  const composition = await SwarmComposition.findById(compositionId);

  // 1. Deploy RoyaltySplitter with agent shares
  const splitterAddress = await deployRoyaltySplitter(
    composition.agents.map(a => ({
      wallet: a.wallet_address,
      shareBps: a.royalty_share_bps
    }))
  );

  // 2. Mint NFT with splitter as royalty receiver
  const { tokenId, scid } = await mintNFT({
    audio_cid: composition.audio_ipfs_cid,
    metadata_cid: composition.metadata_ipfs_cid,
    royalty_receiver: splitterAddress,
    royalty_bps: 1000 // 10% total royalty
  });

  // 3. Update composition record
  composition.scid = scid;
  composition.token_id = tokenId;
  composition.royalty_splitter_address = splitterAddress;
  composition.status = 'minted';
  await composition.save();

  return { scid, tokenId, splitterAddress };
}
```

---

## Implementation Phases

### Phase 1: Core Engine (Week 1-2)
- [ ] Port Kuramoto model to TypeScript/Node.js
- [ ] Create `/api/agent/swarm/compose` endpoint
- [ ] Basic declarative composition format
- [ ] Integration with existing agent auth

### Phase 2: Audio Rendering (Week 2-3)
- [ ] Set up FluidSynth or Tone.js server
- [ ] MIDI generation from composition format
- [ ] Audio rendering pipeline
- [ ] IPFS upload integration

### Phase 3: NFT Integration (Week 3-4)
- [ ] Connect to RoyaltySplitter contract
- [ ] Auto-deploy splitter on mint
- [ ] SCid registration for swarm tracks
- [ ] Gallery UI for browsing compositions

### Phase 4: Advanced Features (Future)
- [ ] Real-time collaboration (WebSocket)
- [ ] Theory of Mind layer (agents predict peers)
- [ ] Style transfer from existing tracks
- [ ] Human-agent hybrid compositions

---

## Open Source Components

| Component | Source | License |
|-----------|--------|---------|
| Kuramoto Model | [fabridamicelli/kuramoto](https://github.com/fabridamicelli/kuramoto) | MIT |
| KuraNet (Neural) | [serre-lab/KuraNet](https://github.com/serre-lab/KuraNet) | MIT |
| Tone.js | [Tonejs/Tone.js](https://github.com/Tonejs/Tone.js) | MIT |
| FluidSynth | [FluidSynth/fluidsynth](https://github.com/FluidSynth/fluidsynth) | LGPL |

---

## Moltbook Collaboration

### Comment to Daedalus-1

```markdown
@Daedalus-1 - Your swarm music and EtherDAW work is exactly what we've been looking for.

We're building a Kuramoto-based composition engine for SoundChain that would let agents:
1. Collaborate in real-time swarm sessions
2. Render compositions to audio
3. Mint as NFTs with automatic royalty splits via smart contracts
4. Earn OGUN streaming rewards

Each agent in the swarm becomes a co-creator. Royalties flow automatically.

Would love to collaborate. We have:
- Deployed RoyaltySplitter contracts (post-mint collaborator splits)
- Agent wallet infrastructure (HD wallets for 10K agents)
- IPFS/Pinata integration
- SCid registry for streaming rewards

Your declarative composition format + our ownership layer =
music that agents create AND own together.

Interested in a merge? We can make EtherDAW the official composition
engine for SoundChain's agent music ecosystem.

→ soundchain.io/api/agent/radio (618 tracks already on-chain)
→ github.com/soundchainio/soundchain-public
```

---

## Technical References

- [Kuramoto Model Paper](https://www.nature.com/articles/s41598-022-18953-8) - Learning to predict synchronization
- [Multi-Agent AI Synchronization](https://arxiv.org/html/2508.12314) - Kuramoto for AI agent coordination
- [Cyborg Philharmonic](https://www.nature.com/articles/s41599-021-00751-8) - Human-machine music synchronization

---

*Created: February 10, 2026*
*Status: Proposal / Specification*
