/**
 * GET  /api/profile/character  → current user's saved Nodeverse character (or null)
 * POST /api/profile/character  → save character JSON to user's profile
 *
 * Backend of the cross-device sync for CharacterDesigner / Explore3DScene.
 * Guest users (unauth) keep localStorage-only; logged-in users get Mongo sync
 * (last-write-wins — whichever device saves most recently becomes the truth).
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const client = await clientPromise
  const db = client.db('soundchain')

  if (req.method === 'GET') {
    try {
      const profile = await db.collection('profiles').findOne(
        { _id: auth.profileId },
        { projection: { nodeverseCharacter: 1, nodeverseCharacterUpdatedAt: 1 } },
      )
      return res.status(200).json({
        character: profile?.nodeverseCharacter || null,
        updatedAt: profile?.nodeverseCharacterUpdatedAt || null,
      })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'POST') {
    const { character } = req.body || {}
    if (!character || typeof character !== 'object') {
      return res.status(400).json({ error: 'character object required' })
    }
    // Guardrail — config shouldn't be gigantic. Strip anything over ~20KB.
    const serialized = JSON.stringify(character)
    if (serialized.length > 20000) {
      return res.status(413).json({ error: 'character config too large' })
    }
    try {
      await db.collection('profiles').updateOne(
        { _id: auth.profileId },
        { $set: { nodeverseCharacter: character, nodeverseCharacterUpdatedAt: new Date() } },
      )
      return res.status(200).json({ ok: true })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'GET or POST only' })
}
