/**
 * Fire-and-forget analytics event tracker for Vercel API routes.
 * Writes directly to MongoDB — no HTTP round-trip to /api/agent/analytics-events.
 */

import clientPromise from 'lib/mongodb'

export async function trackEvent(
  event: string,
  meta?: Record<string, unknown>,
  userId?: string
): Promise<void> {
  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    await db.collection('analytics_events').insertOne({
      event,
      meta: meta || {},
      userId: userId || null,
      createdAt: new Date(),
    })
  } catch {
    // Never block the caller — analytics is best-effort
  }
}

/**
 * Log an activity entry (for the activity feed).
 */
export async function logActivity(
  profileId: any,
  type: string,
  targetId?: any,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    await db.collection('activities').insertOne({
      profileId,
      type,
      targetId: targetId || null,
      metadata: meta || {},
      createdAt: new Date(),
    })
  } catch {}
}
