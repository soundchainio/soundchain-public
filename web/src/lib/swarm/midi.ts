/**
 * MIDI Generator for Swarm Compositions
 *
 * Converts SwarmComposition to MIDI format for:
 * - Download as .mid file
 * - Server-side audio rendering via FluidSynth
 * - Import into DAWs
 */

import { SwarmComposition, CompositionTrack, Note } from './types';

// MIDI constants
const TICKS_PER_BEAT = 480;
const MIDI_HEADER = [0x4D, 0x54, 0x68, 0x64]; // "MThd"
const TRACK_HEADER = [0x4D, 0x54, 0x72, 0x6B]; // "MTrk"

// GM Instrument mappings for our instrument types
const INSTRUMENT_PROGRAMS: Record<string, number> = {
  synth_bass: 38,        // Synth Bass 1
  drums_808: 0,          // Channel 10 (drums)
  synth_pad: 89,         // Pad 2 (warm)
  synth_lead: 81,        // Lead 2 (sawtooth)
  synth_lead_bright: 80, // Lead 1 (square)
  synth_arp: 82,         // Lead 3 (calliope)
  synth_fx: 99,          // FX 4 (atmosphere)
};

/**
 * Convert note name (e.g., "C4") to MIDI number
 */
function noteNameToMidi(noteName: string): number {
  const match = noteName.match(/^([A-G]#?)(\d+)$/);
  if (!match) return 60; // Default to C4

  const noteNames: Record<string, number> = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
  };

  const note = match[1];
  const octave = parseInt(match[2]);

  return (octave + 1) * 12 + (noteNames[note] ?? 0);
}

/**
 * Convert number to variable-length quantity (VLQ)
 */
function toVLQ(value: number): number[] {
  if (value === 0) return [0];

  const bytes: number[] = [];
  let v = value;

  while (v > 0) {
    bytes.unshift(v & 0x7F);
    v >>= 7;
  }

  // Set continuation bit on all but last byte
  for (let i = 0; i < bytes.length - 1; i++) {
    bytes[i] |= 0x80;
  }

  return bytes;
}

/**
 * Convert number to big-endian bytes
 */
function toBytes(value: number, byteCount: number): number[] {
  const bytes: number[] = [];
  for (let i = byteCount - 1; i >= 0; i--) {
    bytes.push((value >> (i * 8)) & 0xFF);
  }
  return bytes;
}

/**
 * Create a MIDI track from composition track
 */
function createMidiTrack(
  track: CompositionTrack,
  tempo: number,
  isDrumTrack: boolean = false
): number[] {
  const events: { time: number; data: number[] }[] = [];
  const channel = isDrumTrack ? 9 : (track.midi_channel - 1) % 16;

  // Program change (instrument selection) - not for drums
  if (!isDrumTrack) {
    const program = INSTRUMENT_PROGRAMS[track.instrument] ?? 0;
    events.push({
      time: 0,
      data: [0xC0 | channel, program],
    });
  }

  // Sort notes by time
  const sortedNotes = [...track.notes].sort((a, b) => a.time - b.time);

  // Convert notes to MIDI events
  for (const note of sortedNotes) {
    const midiNote = noteNameToMidi(note.pitch);
    const velocity = Math.round(note.velocity * 127);
    const startTick = Math.round((note.time / 60) * tempo * TICKS_PER_BEAT);
    const durationTicks = Math.round(note.duration * TICKS_PER_BEAT);

    // Note on
    events.push({
      time: startTick,
      data: [0x90 | channel, midiNote, velocity],
    });

    // Note off
    events.push({
      time: startTick + durationTicks,
      data: [0x80 | channel, midiNote, 0],
    });
  }

  // Sort all events by time
  events.sort((a, b) => a.time - b.time);

  // Build track data with delta times
  const trackData: number[] = [];
  let lastTime = 0;

  for (const event of events) {
    const deltaTime = event.time - lastTime;
    trackData.push(...toVLQ(deltaTime), ...event.data);
    lastTime = event.time;
  }

  // End of track
  trackData.push(0x00, 0xFF, 0x2F, 0x00);

  // Track chunk
  return [
    ...TRACK_HEADER,
    ...toBytes(trackData.length, 4),
    ...trackData,
  ];
}

/**
 * Create tempo track (track 0)
 */
function createTempoTrack(tempo: number, timeSignature: [number, number]): number[] {
  const microsPerBeat = Math.round(60000000 / tempo);

  const trackData: number[] = [
    // Time signature
    0x00, 0xFF, 0x58, 0x04,
    timeSignature[0],
    Math.log2(timeSignature[1]),
    0x18, // MIDI clocks per metronome click
    0x08, // 32nd notes per quarter note

    // Tempo
    0x00, 0xFF, 0x51, 0x03,
    (microsPerBeat >> 16) & 0xFF,
    (microsPerBeat >> 8) & 0xFF,
    microsPerBeat & 0xFF,

    // End of track
    0x00, 0xFF, 0x2F, 0x00,
  ];

  return [
    ...TRACK_HEADER,
    ...toBytes(trackData.length, 4),
    ...trackData,
  ];
}

/**
 * Generate complete MIDI file from SwarmComposition
 */
export function compositionToMidi(composition: SwarmComposition): Uint8Array {
  const tracks: number[][] = [];

  // Track 0: Tempo and time signature
  tracks.push(createTempoTrack(composition.tempo, composition.time_signature));

  // Create a track for each agent
  for (const track of composition.tracks) {
    const isDrumTrack = track.agent.role === 'drums';
    tracks.push(createMidiTrack(track, composition.tempo, isDrumTrack));
  }

  // Build header
  const format = 1; // Multiple tracks, synchronous
  const numTracks = tracks.length;

  const header = [
    ...MIDI_HEADER,
    ...toBytes(6, 4),          // Header length
    ...toBytes(format, 2),     // Format type
    ...toBytes(numTracks, 2),  // Number of tracks
    ...toBytes(TICKS_PER_BEAT, 2), // Ticks per beat
  ];

  // Combine all data
  const midiData = [...header];
  for (const track of tracks) {
    midiData.push(...track);
  }

  return new Uint8Array(midiData);
}

/**
 * Generate MIDI file and return as base64
 */
export function compositionToMidiBase64(composition: SwarmComposition): string {
  const midiData = compositionToMidi(composition);
  let binary = '';
  for (let i = 0; i < midiData.length; i++) {
    binary += String.fromCharCode(midiData[i]);
  }
  return btoa(binary);
}

/**
 * Generate a data URL for MIDI download
 */
export function compositionToMidiDataUrl(composition: SwarmComposition): string {
  const base64 = compositionToMidiBase64(composition);
  return `data:audio/midi;base64,${base64}`;
}

export default compositionToMidi;
