/**
 * SoundChain Swarm Music Types
 * Multi-agent Kuramoto-based composition system
 */

// Musical roles for agents in the swarm
export type AgentRole = 'melody' | 'bass' | 'drums' | 'pad' | 'lead' | 'fx' | 'arp';

// Musical scales/modes
export type MusicalMode = 'major' | 'minor' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'locrian' | 'pentatonic';

// Note representation
export interface Note {
  time: number;           // Time in seconds or beats
  pitch: string;          // e.g., "C4", "D#5"
  duration: number;       // Duration in beats (0.25 = 16th, 0.5 = 8th, 1 = quarter)
  velocity: number;       // 0-1 intensity
  agent_id: string;       // Which agent played this
}

// Agent participation in swarm
export interface SwarmAgent {
  agent_id: string;
  agent_name: string;
  wallet_address: string;
  role: AgentRole;
  royalty_share_bps: number;  // Basis points (2500 = 25%)

  // Kuramoto parameters
  natural_frequency: number;  // Agent's natural oscillation
  phase: number;              // Current phase (0 to 2π)
  coupling_weight: number;    // How strongly this agent couples

  // Musical parameters
  octave_range: [number, number];  // e.g., [3, 5] for C3-C5
  note_density: number;            // Notes per beat (0.5 = half notes, 4 = 16ths)

  // Contribution tracking
  notes_played: number;
  contribution_score: number;
}

// Swarm composition request
export interface SwarmComposeRequest {
  session_id?: string;        // Join existing session
  initiator_agent_id: string;
  agents: Omit<SwarmAgent, 'phase' | 'natural_frequency' | 'notes_played' | 'contribution_score'>[];

  // Musical parameters
  tempo: number;              // BPM
  key: string;                // e.g., "C", "D#", "Bb"
  mode: MusicalMode;
  time_signature: [number, number];  // e.g., [4, 4]
  duration_bars: number;      // Length in bars

  // Kuramoto parameters
  coupling_strength: number;  // K parameter (higher = faster sync)
  sync_target: number;        // Target sync order (0.9 = 90% synchronized)

  // Style hints
  style?: string;             // e.g., "ambient", "techno", "jazz"
  energy?: number;            // 0-1 energy level
  complexity?: number;        // 0-1 complexity level
}

// Kuramoto state snapshot
export interface KuramotoState {
  step: number;
  phases: number[];
  sync_order: number;         // r value (0-1)
  mean_phase: number;         // φ (average phase)
  phase_velocities: number[];
}

// Track in composition
export interface CompositionTrack {
  agent: SwarmAgent;
  instrument: string;
  notes: Note[];
  midi_channel: number;
}

// Full composition output
export interface SwarmComposition {
  composition_id: string;
  session_id: string;
  status: 'composing' | 'syncing' | 'rendering' | 'ready' | 'minted' | 'failed';

  // Participants
  agents: SwarmAgent[];
  initiator: string;

  // Musical parameters
  tempo: number;
  key: string;
  mode: MusicalMode;
  time_signature: [number, number];
  duration_bars: number;
  duration_seconds: number;

  // Kuramoto metrics
  kuramoto_K: number;
  initial_sync_order: number;
  final_sync_order: number;
  sync_history: number[];     // r values over time
  phase_history: number[][];  // All phases over time
  steps_to_sync: number;

  // Output
  tracks: CompositionTrack[];
  total_notes: number;

  // Files (after rendering)
  composition_json_cid?: string;
  midi_cid?: string;
  audio_cid?: string;

  // NFT (after minting)
  scid?: string;
  token_id?: number;
  edition_id?: number;
  royalty_splitter_address?: string;

  // Timestamps
  created_at: Date;
  synced_at?: Date;
  rendered_at?: Date;
  minted_at?: Date;

  // Error handling
  error?: string;
}

// API response wrapper
export interface SwarmApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Render options
export interface RenderOptions {
  format: 'midi' | 'wav' | 'mp3';
  sample_rate?: number;
  soundfont?: string;
  normalize?: boolean;
}

// Gallery item
export interface SwarmGalleryItem {
  composition_id: string;
  title: string;
  agents: { name: string; role: AgentRole }[];
  tempo: number;
  key: string;
  mode: MusicalMode;
  duration_seconds: number;
  final_sync_order: number;
  total_notes: number;
  audio_cid?: string;
  scid?: string;
  plays: number;
  created_at: Date;
}
