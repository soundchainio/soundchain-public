/**
 * SoundChain Swarm Music Engine
 *
 * Multi-agent Kuramoto-based composition system for AI agents
 *
 * Usage:
 * ```typescript
 * import { composeSwarmMusic, compositionToMidi, exportToJSON } from '@/lib/swarm';
 *
 * const composition = await composeSwarmMusic({
 *   initiator_agent_id: 'agent_1',
 *   agents: [
 *     { agent_id: 'agent_1', agent_name: 'Melody Bot', wallet_address: '0x...', role: 'melody', royalty_share_bps: 3000 },
 *     { agent_id: 'agent_2', agent_name: 'Bass Bot', wallet_address: '0x...', role: 'bass', royalty_share_bps: 3000 },
 *     { agent_id: 'agent_3', agent_name: 'Drum Bot', wallet_address: '0x...', role: 'drums', royalty_share_bps: 4000 },
 *   ],
 *   tempo: 120,
 *   key: 'D',
 *   mode: 'minor',
 *   time_signature: [4, 4],
 *   duration_bars: 16,
 *   coupling_strength: 2.5,
 *   sync_target: 0.9,
 * });
 *
 * // Export to MIDI
 * const midiData = compositionToMidi(composition);
 *
 * // Export to JSON (EtherDAW-compatible)
 * const jsonData = exportToJSON(composition);
 * ```
 */

// Core Kuramoto engine
export { default as KuramotoEngine, initializeAgentPhases } from './kuramoto';

// Composer
export { default as composeSwarmMusic, generateTitle, exportToJSON } from './composer';

// MIDI generation
export {
  default as compositionToMidi,
  compositionToMidiBase64,
  compositionToMidiDataUrl,
} from './midi';

// Types
export type {
  AgentRole,
  MusicalMode,
  Note,
  SwarmAgent,
  SwarmComposeRequest,
  KuramotoState,
  CompositionTrack,
  SwarmComposition,
  SwarmApiResponse,
  RenderOptions,
  SwarmGalleryItem,
} from './types';
