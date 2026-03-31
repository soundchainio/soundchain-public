/**
 * Delete an agent and its associated user/profile records
 * DELETE /api/admin/delete-agent?name=agent_name
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'DELETE only' })

  const name = (req.query.name as string)?.toLowerCase()?.trim()
  if (!name) return res.status(400).json({ error: 'name param required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const agent = await db.collection('agents').findOne({ agent_name: name })
    if (!agent) return res.status(404).json({ error: `Agent "${name}" not found` })

    const results: Record<string, number> = {}

    // Delete from all 3 collections
    const agentDel = await db.collection('agents').deleteOne({ agent_name: name })
    results.agents = agentDel.deletedCount

    if (agent.profile_id) {
      const profileDel = await db.collection('profiles').deleteOne({ _id: agent.profile_id })
      results.profiles = profileDel.deletedCount
    }

    if (agent.user_id) {
      const userDel = await db.collection('users').deleteOne({ _id: agent.user_id })
      results.users = userDel.deletedCount
    }

    return res.status(200).json({
      success: true,
      deleted: name,
      results,
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}
