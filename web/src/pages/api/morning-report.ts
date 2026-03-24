/**
 * GET /api/morning-report — Generate and optionally DM the SoundChain morning health report
 * POST /api/morning-report — Same, but also sends to whitelisted Pulse users
 *
 * Query params:
 *   ?send=true — DM report to whitelisted users (requires REPORT_SECRET header)
 *
 * Can be triggered by:
 *   - Vercel Cron (vercel.json)
 *   - FURL agent ("morning report")
 *   - Manual: curl https://soundchain.io/api/morning-report?send=true -H "Authorization: Bearer REPORT_SECRET"
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

const REPORT_SECRET = process.env.REPORT_SECRET || process.env.PUBLISH_SECRET || ''

// Whitelisted profile handles that receive morning reports via Pulse DM
const REPORT_RECIPIENTS = [
  'furdA1',              // Main account
  'Jeremy_Soundchain',   // Jeremy
]

// The bot profile that sends the report (FURL or system)
const REPORT_SENDER_HANDLE = 'furl_ai'

interface HealthReport {
  timestamp: string
  site: { status: string; code: number }
  api: { status: string; code: number }
  relay: { status: string; pulseUsers: number; uptime: number }
  users: { total: number; newLast24h: number }
  tracks: number
  scids: number
  profiles: number
  lambda: string
  lastDeploy: string
  npm: string
  moltbook: string
  summary: string
}

async function generateReport(): Promise<HealthReport> {
  const client = await clientPromise
  const db = client.db('soundchain')

  // Parallel health checks
  const [
    siteRes,
    apiRes,
    relayRes,
    totalUsers,
    newUsers24h,
    totalTracks,
    totalScids,
    totalProfiles,
  ] = await Promise.all([
    fetch('https://soundchain.io/', { signal: AbortSignal.timeout(10000) })
      .then(r => ({ status: r.ok ? 'UP' : 'DOWN', code: r.status }))
      .catch(() => ({ status: 'DOWN', code: 0 })),
    fetch('https://api.soundchain.io/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' }),
      signal: AbortSignal.timeout(10000),
    })
      .then(r => ({ status: r.ok ? 'UP' : 'DOWN', code: r.status }))
      .catch(() => ({ status: 'DOWN', code: 0 })),
    fetch('https://tunnel.soundchain.io/health', { signal: AbortSignal.timeout(5000) })
      .then(r => r.json())
      .then((d: any) => ({ status: 'UP', pulseUsers: d.pulseUsers || 0, uptime: d.uptime || 0 }))
      .catch(() => ({ status: 'DOWN', pulseUsers: 0, uptime: 0 })),
    db.collection('users').countDocuments({}),
    db.collection('users').countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }),
    db.collection('tracks').countDocuments({ deleted: { $ne: true } }),
    db.collection('scids').countDocuments({}),
    db.collection('profiles').countDocuments({}),
  ])

  const issues: string[] = []
  if (siteRes.status !== 'UP') issues.push('Site DOWN')
  if (apiRes.status !== 'UP') issues.push('API DOWN')
  if (relayRes.status !== 'UP') issues.push('Relay DOWN')

  return {
    timestamp: new Date().toISOString(),
    site: siteRes,
    api: apiRes,
    relay: relayRes,
    users: { total: totalUsers, newLast24h: newUsers24h },
    tracks: totalTracks,
    scids: totalScids,
    profiles: totalProfiles,
    lambda: 'Check AWS console',
    lastDeploy: 'Check Vercel dashboard',
    npm: '@soundchain/openclaw-plugin@1.0.0',
    moltbook: 'Active (2 agents)',
    summary: issues.length === 0 ? 'All systems nominal.' : `ISSUES: ${issues.join(', ')}`,
  }
}

function formatReportMessage(r: HealthReport): string {
  const relayUptime = r.relay.uptime > 0 ? `${Math.floor(r.relay.uptime / 3600)}h` : 'N/A'
  return [
    `SOUNDCHAIN MORNING REPORT`,
    `${new Date(r.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} ${new Date(r.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
    ``,
    `Site: ${r.site.status} (${r.site.code})`,
    `API: ${r.api.status} (${r.api.code})`,
    `Relay: ${r.relay.status} (${r.relay.pulseUsers} pulse users, uptime ${relayUptime})`,
    ``,
    `Users: ${r.users.total.toLocaleString()} (+${r.users.newLast24h} last 24h)`,
    `Tracks: ${r.tracks.toLocaleString()}`,
    `SCIDs: ${r.scids.toLocaleString()}`,
    `Profiles: ${r.profiles.toLocaleString()}`,
    ``,
    `npm: ${r.npm}`,
    `Moltbook: ${r.moltbook}`,
    ``,
    `${r.summary}`,
  ].join('\n')
}

async function sendPulseDM(db: any, fromProfileId: string, toProfileId: string, message: string) {
  const now = new Date()
  await db.collection('messages').insertOne({
    message,
    fromId: new ObjectId(fromProfileId),
    toId: new ObjectId(toProfileId),
    createdAt: now,
    updatedAt: now,
    readAt: null,
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const report = await generateReport()
    const message = formatReportMessage(report)

    const shouldSend = req.query.send === 'true' || req.method === 'POST'

    if (shouldSend) {
      // Auth check for sending DMs — accepts REPORT_SECRET or Vercel Cron header
      const auth = req.headers.authorization?.replace('Bearer ', '') || req.headers['x-report-secret']
      const isVercelCron = req.headers['x-vercel-cron'] === '1' ||
        (process.env.CRON_SECRET && req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`)
      if (!isVercelCron && (!REPORT_SECRET || auth !== REPORT_SECRET)) {
        return res.status(401).json({ error: 'REPORT_SECRET required to send DMs' })
      }

      const client = await clientPromise
      const db = client.db('soundchain')

      // Find sender profile (FURL)
      const senderProfile = await db.collection('profiles').findOne({
        userHandle: { $regex: new RegExp(`^${REPORT_SENDER_HANDLE}$`, 'i') },
      })

      if (!senderProfile) {
        return res.status(500).json({ error: `Sender profile '${REPORT_SENDER_HANDLE}' not found` })
      }

      // Find recipient profiles and send
      const sent: string[] = []
      const failed: string[] = []

      for (const handle of REPORT_RECIPIENTS) {
        const profile = await db.collection('profiles').findOne({
          $or: [
            { userHandle: { $regex: new RegExp(`^${handle}$`, 'i') } },
            { displayName: { $regex: new RegExp(`^${handle}$`, 'i') } },
          ],
        })
        if (profile) {
          try {
            await sendPulseDM(db, senderProfile._id.toString(), profile._id.toString(), message)
            sent.push(handle)
          } catch (err: any) {
            failed.push(`${handle}: ${err.message}`)
          }
        } else {
          failed.push(`${handle}: profile not found`)
        }
      }

      return res.status(200).json({
        report,
        formatted: message,
        delivery: { sent, failed, total: REPORT_RECIPIENTS.length },
      })
    }

    // GET without send — just return the report
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    return res.status(200).json({ report, formatted: message })
  } catch (err: any) {
    console.error('[Morning Report] Error:', err)
    return res.status(500).json({ error: err.message || 'Failed to generate report' })
  }
}
