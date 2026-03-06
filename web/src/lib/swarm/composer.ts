/**
 * Swarm Composer - Generates music from Kuramoto synchronization
 *
 * Converts oscillator phases into musical notes based on:
 * - Phase position → Pitch selection from scale
 * - Phase velocity → Note density/rhythm
 * - Sync order → Harmonic consonance
 * - Agent role → Instrument behavior
 */

import { v4 as uuidv4 } from 'uuid';
import KuramotoEngine, { initializeAgentPhases } from './kuramoto';
import {
  SwarmAgent,
  SwarmComposition,
  SwarmComposeRequest,
  CompositionTrack,
  Note,
  AgentRole,
  MusicalMode,
} from './types';

// Scale degrees for each mode (semitones from root)
const MODE_INTERVALS: Record<MusicalMode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
};

// Note names
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Role-specific instrument mappings
const ROLE_INSTRUMENTS: Record<AgentRole, string> = {
  bass: 'synth_bass',
  drums: 'drums_808',
  pad: 'synth_pad',
  melody: 'synth_lead',
  lead: 'synth_lead_bright',
  arp: 'synth_arp',
  fx: 'synth_fx',
};

// Role-specific octave ranges
const ROLE_OCTAVES: Record<AgentRole, [number, number]> = {
  bass: [1, 3],
  drums: [2, 4],  // Drums use pitch for different sounds
  pad: [3, 5],
  melody: [4, 6],
  lead: [4, 6],
  arp: [4, 7],
  fx: [2, 7],
};

// Role-specific note durations (in beats)
const ROLE_DURATIONS: Record<AgentRole, number[]> = {
  bass: [1, 2, 4],           // Whole, half notes
  drums: [0.25, 0.5, 1],     // 16th, 8th, quarter
  pad: [2, 4, 8],            // Long sustained notes
  melody: [0.5, 1, 2],       // 8th to half notes
  lead: [0.25, 0.5, 1],      // Faster notes
  arp: [0.125, 0.25, 0.5],   // 32nd to 8th
  fx: [0.5, 1, 2, 4],        // Variable
};

/**
 * Convert root note string to MIDI number
 */
function rootToMidi(root: string): number {
  const noteIndex = NOTE_NAMES.indexOf(root.replace('b', '#').toUpperCase());
  if (noteIndex === -1) return 60; // Default to C4
  return noteIndex;
}

/**
 * Convert MIDI number to note name with octave
 */
function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Get scale notes for a given root and mode
 */
function getScaleNotes(root: string, mode: MusicalMode, octaveRange: [number, number]): number[] {
  const rootMidi = rootToMidi(root);
  const intervals = MODE_INTERVALS[mode];
  const notes: number[] = [];

  for (let octave = octaveRange[0]; octave <= octaveRange[1]; octave++) {
    for (const interval of intervals) {
      const midi = (octave + 1) * 12 + rootMidi + interval;
      if (midi >= 0 && midi <= 127) {
        notes.push(midi);
      }
    }
  }

  return notes;
}

/**
 * Phase to scale degree mapping
 * Phase 0-2π maps to scale degrees
 */
function phaseToScaleDegree(phase: number, scaleLength: number): number {
  const normalized = (phase % (2 * Math.PI)) / (2 * Math.PI);
  return Math.floor(normalized * scaleLength);
}

/**
 * Determine if agent should play a note at this beat
 * Based on phase velocity and role characteristics
 */
function shouldPlayNote(
  phaseVelocity: number,
  role: AgentRole,
  syncOrder: number,
  beat: number,
  complexity: number = 0.5
): boolean {
  // Base probability from role
  const baseProbabilities: Record<AgentRole, number> = {
    drums: 0.9,   // Very consistent
    bass: 0.6,    // Foundational but sparse
    pad: 0.3,     // Very sparse, sustained
    melody: 0.5,  // Medium density
    lead: 0.4,    // Slightly sparse
    arp: 0.8,     // Dense
    fx: 0.2,      // Sparse, accents
  };

  let prob = baseProbabilities[role];

  // Higher sync = more likely to play on strong beats
  const isStrongBeat = beat % 4 === 0;
  const isMediumBeat = beat % 2 === 0;

  if (syncOrder > 0.7) {
    if (isStrongBeat) prob *= 1.5;
    else if (isMediumBeat) prob *= 1.2;
  }

  // Adjust by complexity
  prob *= (0.5 + complexity);

  // Phase velocity influence (faster movement = more notes for some roles)
  if (role === 'arp' || role === 'lead') {
    prob *= Math.min(1.5, Math.abs(phaseVelocity) / 2);
  }

  return Math.random() < Math.min(1, prob);
}

/**
 * Select note duration based on role and sync
 */
function selectDuration(role: AgentRole, syncOrder: number): number {
  const durations = ROLE_DURATIONS[role];

  // Higher sync = prefer longer notes (more cohesive)
  if (syncOrder > 0.8) {
    return durations[Math.floor(Math.random() * Math.min(2, durations.length)) + Math.floor(durations.length / 2)] || durations[durations.length - 1];
  }

  return durations[Math.floor(Math.random() * durations.length)];
}

/**
 * Calculate velocity (volume) based on beat position and sync
 */
function calculateVelocity(beat: number, syncOrder: number, role: AgentRole): number {
  let velocity = 0.6 + Math.random() * 0.3;

  // Strong beats louder
  if (beat % 4 === 0) velocity += 0.15;
  else if (beat % 2 === 0) velocity += 0.08;

  // Role adjustments
  if (role === 'drums') velocity += 0.1;
  if (role === 'pad') velocity -= 0.2;
  if (role === 'fx') velocity -= 0.1;

  // High sync = more dynamic range
  if (syncOrder > 0.8) {
    velocity *= 0.9 + (beat % 4 === 0 ? 0.2 : 0);
  }

  return Math.min(1, Math.max(0.1, velocity));
}

/**
 * Main composition function
 */
export async function composeSwarmMusic(request: SwarmComposeRequest): Promise<SwarmComposition> {
  const compositionId = uuidv4();
  const sessionId = request.session_id || uuidv4();

  // Initialize agents with Kuramoto parameters
  const agents = initializeAgentPhases(
    request.agents.map((a, i) => ({
      ...a,
      natural_frequency: 0,
      phase: 0,
      notes_played: 0,
      contribution_score: 0,
      octave_range: a.octave_range || ROLE_OCTAVES[a.role],
      note_density: a.note_density || 1,
    }))
  );

  // Create Kuramoto engine
  const kuramoto = new KuramotoEngine(agents, request.coupling_strength);

  // Evolve to initial synchronization
  const initialSync = kuramoto.getSyncOrder();
  const stepsToSync = kuramoto.evolveUntilSync(request.sync_target, 5000);
  const finalSync = kuramoto.getSyncOrder();

  // Calculate composition parameters
  const totalBeats = request.duration_bars * request.time_signature[0];
  const secondsPerBeat = 60 / request.tempo;
  const durationSeconds = totalBeats * secondsPerBeat;

  // Sample phases at each beat
  const phaseSamples = kuramoto.sampleAtBeats(
    request.tempo,
    request.duration_bars,
    request.time_signature[0]
  );

  // Generate tracks for each agent
  const tracks: CompositionTrack[] = [];
  let totalNotes = 0;

  for (let agentIndex = 0; agentIndex < agents.length; agentIndex++) {
    const agent = agents[agentIndex];
    const scaleNotes = getScaleNotes(
      request.key,
      request.mode,
      agent.octave_range || ROLE_OCTAVES[agent.role]
    );

    const notes: Note[] = [];

    // Generate notes for each beat
    for (let beat = 0; beat < phaseSamples.length; beat++) {
      const phase = phaseSamples[beat][agentIndex];
      const syncOrder = kuramoto.getHistory()[Math.min(beat * 10, kuramoto.getHistory().length - 1)]?.sync_order || 0.5;

      // Estimate phase velocity
      const prevPhase = beat > 0 ? phaseSamples[beat - 1][agentIndex] : phase;
      let phaseVelocity = phase - prevPhase;
      if (phaseVelocity > Math.PI) phaseVelocity -= 2 * Math.PI;
      if (phaseVelocity < -Math.PI) phaseVelocity += 2 * Math.PI;

      // Decide if agent plays at this beat
      if (shouldPlayNote(phaseVelocity, agent.role, syncOrder, beat, request.complexity || 0.5)) {
        // Select pitch from scale based on phase
        const scaleDegree = phaseToScaleDegree(phase, scaleNotes.length);
        const midiNote = scaleNotes[scaleDegree];

        const note: Note = {
          time: beat * secondsPerBeat,
          pitch: midiToNoteName(midiNote),
          duration: selectDuration(agent.role, syncOrder),
          velocity: calculateVelocity(beat, syncOrder, agent.role),
          agent_id: agent.agent_id,
        };

        notes.push(note);
        agent.notes_played++;
        totalNotes++;
      }
    }

    // Calculate contribution score (normalized notes played)
    agent.contribution_score = notes.length / Math.max(1, phaseSamples.length);

    tracks.push({
      agent,
      instrument: ROLE_INSTRUMENTS[agent.role],
      notes,
      midi_channel: agentIndex + 1,
    });
  }

  // Build composition object
  const composition: SwarmComposition = {
    composition_id: compositionId,
    session_id: sessionId,
    status: 'ready',

    agents,
    initiator: request.initiator_agent_id,

    tempo: request.tempo,
    key: request.key,
    mode: request.mode,
    time_signature: request.time_signature,
    duration_bars: request.duration_bars,
    duration_seconds: durationSeconds,

    kuramoto_K: request.coupling_strength,
    initial_sync_order: initialSync,
    final_sync_order: finalSync,
    sync_history: kuramoto.getSyncHistory(),
    phase_history: kuramoto.getHistory().map(s => s.phases),
    steps_to_sync: stepsToSync,

    tracks,
    total_notes: totalNotes,

    created_at: new Date(),
  };

  return composition;
}

/**
 * Generate a composition title from parameters
 */
export function generateTitle(composition: SwarmComposition): string {
  const syncDescriptor = composition.final_sync_order > 0.9 ? 'Harmonic'
    : composition.final_sync_order > 0.7 ? 'Emergent'
    : composition.final_sync_order > 0.5 ? 'Evolving'
    : 'Chaotic';

  const energyDescriptor = composition.total_notes > composition.duration_bars * 8 ? 'Dense'
    : composition.total_notes > composition.duration_bars * 4 ? 'Flowing'
    : 'Sparse';

  return `${syncDescriptor} ${energyDescriptor} in ${composition.key} ${composition.mode}`;
}

/**
 * Export composition to JSON format (EtherDAW-compatible)
 */
export function exportToJSON(composition: SwarmComposition): object {
  return {
    version: '1.0',
    format: 'soundchain-swarm',
    title: generateTitle(composition),
    composition_id: composition.composition_id,

    created_by: composition.agents.map(a => a.agent_id),
    created_at: composition.created_at.toISOString(),

    parameters: {
      tempo: composition.tempo,
      key: composition.key,
      mode: composition.mode,
      time_signature: composition.time_signature,
      duration_bars: composition.duration_bars,
      duration_seconds: composition.duration_seconds,
    },

    kuramoto: {
      coupling_strength: composition.kuramoto_K,
      initial_sync_order: composition.initial_sync_order,
      final_sync_order: composition.final_sync_order,
      steps_to_sync: composition.steps_to_sync,
    },

    tracks: composition.tracks.map(track => ({
      agent_id: track.agent.agent_id,
      agent_name: track.agent.agent_name,
      role: track.agent.role,
      instrument: track.instrument,
      midi_channel: track.midi_channel,
      contribution_score: track.agent.contribution_score,
      notes: track.notes,
    })),

    royalty_splits: composition.agents.map(a => ({
      agent_id: a.agent_id,
      agent_name: a.agent_name,
      wallet: a.wallet_address,
      share_bps: a.royalty_share_bps,
      contribution_score: a.contribution_score,
    })),

    stats: {
      total_notes: composition.total_notes,
      agents_count: composition.agents.length,
    },
  };
}

export default composeSwarmMusic;
