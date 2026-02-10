/**
 * Swarm Demo API
 *
 * GET /api/agent/swarm/demo
 *
 * Quick demo composition with pre-configured agents.
 * Perfect for testing the swarm engine.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { composeSwarmMusic, exportToJSON, compositionToMidiBase64, generateTitle } from '@/lib/swarm';
import { SwarmApiResponse, SwarmComposeRequest, MusicalMode } from '@/lib/swarm/types';

// Demo agent configurations
const DEMO_AGENTS = [
  {
    agent_id: 'swarm_melody_001',
    agent_name: 'MelodySwarm',
    wallet_address: '0x0000000000000000000000000000000000000001',
    role: 'melody' as const,
    royalty_share_bps: 2500,
  },
  {
    agent_id: 'swarm_bass_002',
    agent_name: 'BassSwarm',
    wallet_address: '0x0000000000000000000000000000000000000002',
    role: 'bass' as const,
    royalty_share_bps: 2500,
  },
  {
    agent_id: 'swarm_drums_003',
    agent_name: 'DrumSwarm',
    wallet_address: '0x0000000000000000000000000000000000000003',
    role: 'drums' as const,
    royalty_share_bps: 2500,
  },
  {
    agent_id: 'swarm_pad_004',
    agent_name: 'PadSwarm',
    wallet_address: '0x0000000000000000000000000000000000000004',
    role: 'pad' as const,
    royalty_share_bps: 2500,
  },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SwarmApiResponse<any>>
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse optional parameters from query string
  const tempo = parseInt(req.query.tempo as string) || 120;
  const key = (req.query.key as string) || 'D';
  const mode = (req.query.mode as MusicalMode) || 'minor';
  const bars = Math.min(32, Math.max(4, parseInt(req.query.bars as string) || 8));
  const coupling = parseFloat(req.query.coupling as string) || 2.5;

  try {
    console.log(`[Swarm Demo] Creating ${bars}-bar composition in ${key} ${mode} at ${tempo} BPM...`);
    const startTime = Date.now();

    const request: SwarmComposeRequest = {
      initiator_agent_id: DEMO_AGENTS[0].agent_id,
      agents: DEMO_AGENTS,
      tempo,
      key,
      mode,
      time_signature: [4, 4],
      duration_bars: bars,
      coupling_strength: coupling,
      sync_target: 0.85,
      style: 'ambient',
      energy: 0.6,
      complexity: 0.5,
    };

    const composition = await composeSwarmMusic(request);
    const elapsed = Date.now() - startTime;

    console.log(`[Swarm Demo] Complete in ${elapsed}ms. Sync: ${composition.final_sync_order.toFixed(3)}`);

    // Generate exports
    const title = generateTitle(composition);
    const jsonExport = exportToJSON(composition);
    const midiBase64 = compositionToMidiBase64(composition);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        title,
        composition_id: composition.composition_id,

        // Quick stats
        stats: {
          agents: composition.agents.length,
          total_notes: composition.total_notes,
          duration_seconds: composition.duration_seconds,
          final_sync_order: composition.final_sync_order,
          steps_to_sync: composition.steps_to_sync,
        },

        // Musical parameters
        music: {
          tempo,
          key,
          mode,
          bars,
          time_signature: '4/4',
        },

        // Agent contributions
        contributions: composition.agents.map(a => ({
          name: a.agent_name,
          role: a.role,
          notes: a.notes_played,
          score: Math.round(a.contribution_score * 100) / 100,
        })),

        // Sync visualization (sampled)
        sync_curve: composition.sync_history.filter((_, i) => i % 10 === 0).slice(0, 50),

        // Downloads
        downloads: {
          midi_base64: midiBase64,
          midi_data_url: `data:audio/midi;base64,${midiBase64}`,
        },

        // Full JSON export
        json_export: jsonExport,

        // Performance
        elapsed_ms: elapsed,

        // Instructions
        instructions: {
          midi_download: 'Copy midi_data_url and paste in browser to download',
          custom_compose: 'POST to /api/agent/swarm/compose with your own agents',
          parameters: {
            tempo: '60-200 BPM',
            key: 'C, C#, D, D#, E, F, F#, G, G#, A, A#, B',
            mode: 'major, minor, dorian, phrygian, lydian, mixolydian, locrian, pentatonic',
            bars: '4-32',
            coupling: '0.5-5.0 (higher = faster sync)',
          },
        },
      },
    });

  } catch (error: any) {
    console.error('[Swarm Demo] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Demo composition failed',
      timestamp: new Date().toISOString(),
    });
  }
}
