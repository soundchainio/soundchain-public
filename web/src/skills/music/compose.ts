import type { NextApiRequest, NextApiResponse } from 'next'
import { composeSwarmMusic, exportToJSON, compositionToMidiBase64 } from 'lib/swarm'
import { SwarmComposeRequest, SwarmApiResponse, SwarmComposition } from 'lib/swarm/types'
import type { AgentSkill } from 'types/AgentSkill'
import { composeMeta } from 'skills/music/compose.meta'

export const compositions = new Map<string, SwarmComposition>()

async function composeHandler(
  req: NextApiRequest,
  res: NextApiResponse<SwarmApiResponse<any>>
) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        endpoint: '/api/agent/swarm/compose',
        method: 'POST',
        description: 'Create a swarm music composition with multiple agents using Kuramoto synchronization',
        example_request: {
          initiator_agent_id: 'agent_melody_001',
          agents: [
            { agent_id: 'agent_melody_001', agent_name: 'MelodyBot', wallet_address: '0x1234...5678', role: 'melody', royalty_share_bps: 3000 },
            { agent_id: 'agent_bass_002', agent_name: 'BassBot', wallet_address: '0x8765...4321', role: 'bass', royalty_share_bps: 3000 },
            { agent_id: 'agent_drums_003', agent_name: 'DrumBot', wallet_address: '0xabcd...efgh', role: 'drums', royalty_share_bps: 4000 },
          ],
          tempo: 120,
          key: 'D',
          mode: 'minor',
          time_signature: [4, 4],
          duration_bars: 16,
          coupling_strength: 2.5,
          sync_target: 0.9,
          style: 'ambient',
          energy: 0.6,
          complexity: 0.5,
        },
        roles: ['melody', 'bass', 'drums', 'pad', 'lead', 'arp', 'fx'],
        modes: ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian', 'pentatonic'],
        notes: [
          'royalty_share_bps must total 10000 (100%)',
          'coupling_strength: 1.0-5.0 (higher = faster sync)',
          'sync_target: 0.5-1.0 (target synchronization)',
          'duration_bars: 4-64 recommended',
        ],
      },
    })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST to compose.',
      timestamp: new Date().toISOString(),
    })
  }

  try {
    const request = req.body as SwarmComposeRequest

    if (!request.initiator_agent_id) {
      return res.status(400).json({
        success: false,
        error: 'initiator_agent_id is required',
        timestamp: new Date().toISOString(),
      })
    }

    if (!request.agents || request.agents.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 agents are required for swarm composition',
        timestamp: new Date().toISOString(),
      })
    }

    if (request.agents.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 agents per composition',
        timestamp: new Date().toISOString(),
      })
    }

    const totalShares = request.agents.reduce((sum, a) => sum + (a.royalty_share_bps || 0), 0)
    if (totalShares !== 10000) {
      return res.status(400).json({
        success: false,
        error: `royalty_share_bps must total 10000 (100%). Current total: ${totalShares}`,
        timestamp: new Date().toISOString(),
      })
    }

    const composeRequest: SwarmComposeRequest = {
      ...request,
      tempo: request.tempo || 120,
      key: request.key || 'C',
      mode: request.mode || 'minor',
      time_signature: request.time_signature || [4, 4],
      duration_bars: Math.min(64, Math.max(4, request.duration_bars || 16)),
      coupling_strength: Math.min(5, Math.max(0.5, request.coupling_strength || 2.0)),
      sync_target: Math.min(0.99, Math.max(0.5, request.sync_target || 0.85)),
      complexity: request.complexity ?? 0.5,
      energy: request.energy ?? 0.5,
    }

    console.log(`[Swarm] Composing with ${composeRequest.agents.length} agents...`)
    const startTime = Date.now()

    const composition = await composeSwarmMusic(composeRequest)

    const elapsed = Date.now() - startTime
    console.log(`[Swarm] Composition complete in ${elapsed}ms. Sync: ${composition.final_sync_order.toFixed(3)}, Notes: ${composition.total_notes}`)

    compositions.set(composition.composition_id, composition)

    const jsonExport = exportToJSON(composition)
    const midiBase64 = compositionToMidiBase64(composition)

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        composition_id: composition.composition_id,
        session_id: composition.session_id,
        status: composition.status,
        sync_metrics: {
          initial_sync_order: composition.initial_sync_order,
          final_sync_order: composition.final_sync_order,
          steps_to_sync: composition.steps_to_sync,
          coupling_strength: composition.kuramoto_K,
        },
        info: {
          tempo: composition.tempo,
          key: composition.key,
          mode: composition.mode,
          time_signature: composition.time_signature,
          duration_bars: composition.duration_bars,
          duration_seconds: composition.duration_seconds,
          total_notes: composition.total_notes,
        },
        agents: composition.agents.map(a => ({
          agent_id: a.agent_id,
          agent_name: a.agent_name,
          role: a.role,
          wallet_address: a.wallet_address,
          royalty_share_bps: a.royalty_share_bps,
          notes_played: a.notes_played,
          contribution_score: a.contribution_score,
        })),
        exports: {
          json: jsonExport,
          midi_base64: midiBase64,
          midi_download_url: `/api/agent/swarm/download/${composition.composition_id}?format=midi`,
        },
        next_steps: {
          render_audio: `/api/agent/swarm/render/${composition.composition_id}`,
          mint_nft: `/api/agent/swarm/mint/${composition.composition_id}`,
          view_status: `/api/agent/swarm/status/${composition.composition_id}`,
        },
        elapsed_ms: elapsed,
      },
    })
  } catch (error: any) {
    console.error('[Swarm] Composition error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Composition failed',
      timestamp: new Date().toISOString(),
    })
  }
}

export const composeSkill: AgentSkill = {
  ...composeMeta,
  handler: composeHandler,
}
