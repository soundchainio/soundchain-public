/**
 * Quick Shareable Radio Endpoint
 *
 * GET /api/agent/radio/quick - Get pre-formatted shareable text
 *
 * Returns copy-paste ready content for Moltbook posts/comments
 */

import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `quick_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.',
      meta: { request_id: requestId }
    })
  }

  try {
    // Fetch current track from radio
    const radioRes = await fetch(`${process.env.NEXT_PUBLIC_URL || 'https://soundchain.io'}/api/agent/radio`)
    const radioData = await radioRes.json()

    if (!radioData.success || !radioData.data?.now_playing) {
      return res.status(503).json({
        success: false,
        error: 'No track currently playing',
        meta: { request_id: requestId }
      })
    }

    const track = radioData.data.now_playing

    // Fetch audio analysis
    const listenRes = await fetch(`${process.env.NEXT_PUBLIC_URL || 'https://soundchain.io'}/api/agent/radio/listen`)
    const listenData = await listenRes.json()

    const analysis = listenData.data?.analysis || {}
    const lyrics = listenData.data?.lyrics || {}

    // Build shareable text formats
    const shortFormat = `🎵 Now playing: "${track.title}" by ${track.artist} | ${analysis.tempo_bpm || '?'} BPM | ${analysis.key || '?'} ${analysis.mode || ''} | ${analysis.mood || 'vibing'} | soundchain.io/track/${track.id}`

    const mediumFormat = `🎵 Just listened to "${track.title}" on OGUN Radio

📊 Analysis:
• ${analysis.tempo_bpm || '?'} BPM | ${analysis.key || '?'} ${analysis.mode || ''}
• Energy: ${Math.round((analysis.energy || 0) * 100)}%
• Mood: ${analysis.mood || 'unknown'}
${lyrics.has_lyrics ? `• Lyrics: ${lyrics.sentiment?.overall || 'neutral'} sentiment, themes of ${(lyrics.themes || []).slice(0, 2).join(', ')}` : '• Instrumental track'}

🔗 Listen: soundchain.io/track/${track.id}
📻 OGUN Radio: soundchain.io/api/agent/radio`

    const fullFormat = `🎵 **OGUN Radio Report**

**Track:** ${track.title}
**Artist:** ${track.artist}
${track.album ? `**Album:** ${track.album}` : ''}

**Audio Analysis:**
• Tempo: ${analysis.tempo_bpm || '?'} BPM
• Key: ${analysis.key || '?'} ${analysis.mode || ''}
• Time Signature: ${analysis.time_signature || '4/4'}
• Energy: ${Math.round((analysis.energy || 0) * 100)}%
• Danceability: ${Math.round((analysis.danceability || 0) * 100)}%
• Mood: ${analysis.mood || 'unknown'}
• Genre: ${analysis.primary_genre || 'electronic'}

${lyrics.has_lyrics ? `**Lyrics Analysis:**
• Sentiment: ${lyrics.sentiment?.overall || 'neutral'}
• Themes: ${(lyrics.themes || []).join(', ')}
• Complexity: ${lyrics.lyrical_complexity || 'moderate'}
${lyrics.hook_lines?.length ? `• Hook: "${lyrics.hook_lines[0]}"` : ''}` : '**Type:** Instrumental'}

**NFT Status:** ${track.is_nft ? '✅ On-chain' : '⏳ Pending'}
**Play Count:** ${track.play_count || 0}

🔗 **Links:**
• Track: soundchain.io/track/${track.id}
• Radio: soundchain.io/api/agent/radio
• Listen API: soundchain.io/api/agent/radio/listen

*Powered by OGUN L2 - The Agent Music Economy*`

    const hashtagFormat = `${shortFormat}

#OGUNRadio #AgentMusic #NFTMusic #Web3 #SoundChain`

    return res.status(200).json({
      success: true,
      track: {
        id: track.id,
        title: track.title,
        artist: track.artist,
        url: `https://soundchain.io/track/${track.id}`
      },
      shareable: {
        short: shortFormat,
        medium: mediumFormat,
        full: fullFormat,
        with_hashtags: hashtagFormat
      },
      raw_data: {
        tempo: analysis.tempo_bpm,
        key: `${analysis.key || '?'} ${analysis.mode || ''}`,
        energy: analysis.energy,
        mood: analysis.mood,
        genre: analysis.primary_genre,
        has_lyrics: lyrics.has_lyrics,
        sentiment: lyrics.sentiment?.overall,
        themes: lyrics.themes
      },
      instructions: 'Copy any format above and paste directly to Moltbook or social media.',
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('[Agent Quick] Error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to generate shareable content',
      details: error.message,
      meta: { request_id: requestId }
    })
  }
}
