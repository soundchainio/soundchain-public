import type { SkillRegistryEntry } from 'types/AgentSkill'

export const composeMeta: SkillRegistryEntry = {
  id: 'music.compose',
  category: 'music',
  name: 'compose',
  description: 'Multi-agent swarm music composition via Kuramoto synchronization. 2–10 agents, royalty splits in basis points.',
  httpMethod: 'POST',
  endpoint: '/api/agent/swarm/compose',
  auth: 'none',
  inputs: {
    initiator_agent_id: 'string',
    agents: 'Array<{ agent_id, role, royalty_share_bps, ... }> (2–10, shares sum to 10000)',
    tempo: 'number (BPM, default 120)',
    key: 'string (default "C")',
    mode: 'major|minor|dorian|phrygian|lydian|mixolydian|locrian|pentatonic',
    duration_bars: 'number (4–64, default 16)',
  },
  output: '{ composition_id, sync_metrics, info, agents, exports: { json, midi_base64, midi_download_url } }',
  example: 'POST /api/agent/swarm/compose with body shown in GET response',
}
