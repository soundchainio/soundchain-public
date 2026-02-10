/**
 * Swarm Composition Download API
 *
 * GET /api/agent/swarm/download/[id]?format=midi|json
 *
 * Download composition as MIDI or JSON file.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { compositionToMidi, exportToJSON } from 'lib/swarm';
import { compositions } from '../compose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, format = 'midi' } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Composition ID is required' });
  }

  const composition = compositions.get(id);

  if (!composition) {
    return res.status(404).json({ error: 'Composition not found' });
  }

  const filename = `swarm-${composition.key}-${composition.mode}-${composition.composition_id.slice(0, 8)}`;

  if (format === 'json') {
    const jsonData = exportToJSON(composition);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
    return res.status(200).json(jsonData);
  }

  // Default: MIDI
  const midiData = compositionToMidi(composition);
  res.setHeader('Content-Type', 'audio/midi');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.mid"`);
  return res.status(200).send(Buffer.from(midiData));
}
