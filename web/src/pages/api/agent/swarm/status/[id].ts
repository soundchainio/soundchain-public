/**
 * Swarm Composition Status API
 *
 * GET /api/agent/swarm/status/[id]
 *
 * Check the status of a swarm composition.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { SwarmApiResponse } from '@/lib/swarm/types';
import { compositions } from '../compose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SwarmApiResponse<any>>
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString(),
    });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Composition ID is required',
      timestamp: new Date().toISOString(),
    });
  }

  const composition = compositions.get(id);

  if (!composition) {
    return res.status(404).json({
      success: false,
      error: 'Composition not found',
      timestamp: new Date().toISOString(),
    });
  }

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
      },

      info: {
        tempo: composition.tempo,
        key: composition.key,
        mode: composition.mode,
        duration_bars: composition.duration_bars,
        duration_seconds: composition.duration_seconds,
        total_notes: composition.total_notes,
      },

      agents: composition.agents.map(a => ({
        agent_id: a.agent_id,
        agent_name: a.agent_name,
        role: a.role,
        notes_played: a.notes_played,
        contribution_score: a.contribution_score,
      })),

      files: {
        composition_json_cid: composition.composition_json_cid,
        midi_cid: composition.midi_cid,
        audio_cid: composition.audio_cid,
      },

      nft: composition.scid ? {
        scid: composition.scid,
        token_id: composition.token_id,
        royalty_splitter: composition.royalty_splitter_address,
      } : null,

      timestamps: {
        created_at: composition.created_at,
        synced_at: composition.synced_at,
        rendered_at: composition.rendered_at,
        minted_at: composition.minted_at,
      },
    },
  });
}
