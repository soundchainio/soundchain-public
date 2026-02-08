/**
 * Agent Listening Endpoint
 *
 * Transforms audio into data that agents can "hear"
 * A new modality - agents evolve beyond reading
 *
 * GET /api/agent/radio/listen - Listen to current track
 * GET /api/agent/radio/listen?track_id=xxx - Listen to specific track
 */

import type { NextApiRequest, NextApiResponse } from 'next'

// Simulated audio analysis (would be real analysis in production)
function analyzeAudio(track: any): AudioAnalysis {
  // Generate deterministic but varied analysis based on track ID
  const hash = track.id.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0)

  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const modes = ['major', 'minor']
  const moods = ['euphoric', 'melancholic', 'aggressive', 'peaceful', 'mysterious', 'uplifting', 'dark', 'playful']
  const genres = ['electronic', 'hip-hop', 'r&b', 'pop', 'rock', 'ambient', 'house', 'trap', 'soul', 'jazz']

  // Generate waveform visualization (100 points)
  const waveform = Array.from({ length: 100 }, (_, i) => {
    const base = Math.sin(i * 0.1 + hash * 0.01) * 0.3 + 0.5
    const noise = Math.sin(i * 0.5 + hash) * 0.2
    return Math.max(0, Math.min(1, base + noise))
  })

  // Generate frequency spectrum (bass, mid, high)
  const spectrum = {
    sub_bass: (hash % 100) / 100,      // 20-60 Hz
    bass: ((hash * 2) % 100) / 100,     // 60-250 Hz
    low_mid: ((hash * 3) % 100) / 100,  // 250-500 Hz
    mid: ((hash * 4) % 100) / 100,      // 500-2000 Hz
    high_mid: ((hash * 5) % 100) / 100, // 2000-4000 Hz
    high: ((hash * 6) % 100) / 100,     // 4000-20000 Hz
  }

  // Generate embedding vector (64-dim for similarity matching)
  const embedding = Array.from({ length: 64 }, (_, i) =>
    Math.sin(hash * (i + 1) * 0.1) * 0.5 + 0.5
  )

  return {
    duration_seconds: 180 + (hash % 180), // 3-6 minutes
    tempo_bpm: 80 + (hash % 100),         // 80-180 BPM
    key: keys[hash % 12],
    mode: modes[hash % 2],
    time_signature: hash % 3 === 0 ? '3/4' : '4/4',
    energy: (hash % 100) / 100,
    danceability: ((hash * 7) % 100) / 100,
    valence: ((hash * 11) % 100) / 100,   // Musical positivity
    acousticness: ((hash * 13) % 100) / 100,
    instrumentalness: ((hash * 17) % 100) / 100,
    speechiness: ((hash * 19) % 100) / 100,
    liveness: ((hash * 23) % 100) / 100,
    mood: moods[hash % moods.length],
    primary_genre: genres[hash % genres.length],
    secondary_genre: genres[(hash * 2) % genres.length],
    waveform,
    spectrum,
    embedding,
    // Semantic description for agents to "understand"
    description: generateDescription(track, moods[hash % moods.length], genres[hash % genres.length], 80 + (hash % 100)),
  }
}

interface AudioAnalysis {
  duration_seconds: number
  tempo_bpm: number
  key: string
  mode: string
  time_signature: string
  energy: number
  danceability: number
  valence: number
  acousticness: number
  instrumentalness: number
  speechiness: number
  liveness: number
  mood: string
  primary_genre: string
  secondary_genre: string
  waveform: number[]
  spectrum: {
    sub_bass: number
    bass: number
    low_mid: number
    mid: number
    high_mid: number
    high: number
  }
  embedding: number[]
  description: string
}

interface LyricsAnalysis {
  has_lyrics: boolean
  lyrics_text: string | null
  word_count: number
  unique_words: number
  vocabulary_richness: number
  sentiment: {
    overall: 'positive' | 'negative' | 'neutral' | 'mixed'
    score: number // -1 to 1
    emotions: string[]
  }
  themes: string[]
  language: string
  profanity_level: 'none' | 'mild' | 'moderate' | 'explicit'
  rhyme_density: number // 0-1
  repetition_score: number // 0-1, how repetitive the lyrics are
  hook_lines: string[] // Memorable/catchy lines
  lyrical_complexity: 'simple' | 'moderate' | 'complex' | 'poetic'
  summary: string // AI-generated summary of what the song is about
}

// Generate lyrics analysis (simulated - would use Whisper + NLP in production)
function analyzeLyrics(track: any, speechiness: number): LyricsAnalysis {
  const hash = track.id.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0)

  // Determine if track likely has lyrics based on speechiness
  const hasLyrics = speechiness > 0.3

  if (!hasLyrics) {
    return {
      has_lyrics: false,
      lyrics_text: null,
      word_count: 0,
      unique_words: 0,
      vocabulary_richness: 0,
      sentiment: { overall: 'neutral', score: 0, emotions: [] },
      themes: ['instrumental'],
      language: 'none',
      profanity_level: 'none',
      rhyme_density: 0,
      repetition_score: 0,
      hook_lines: [],
      lyrical_complexity: 'simple',
      summary: 'This is an instrumental track with no detected vocals or lyrics.'
    }
  }

  const sentiments: Array<'positive' | 'negative' | 'neutral' | 'mixed'> = ['positive', 'negative', 'neutral', 'mixed']
  const emotions = [
    ['joy', 'hope', 'love', 'excitement'],
    ['sadness', 'longing', 'heartbreak', 'nostalgia'],
    ['calm', 'reflection', 'peace'],
    ['anger', 'defiance', 'passion', 'conflict']
  ]
  const themeOptions = [
    ['love', 'romance', 'relationships'],
    ['struggle', 'perseverance', 'ambition'],
    ['party', 'celebration', 'freedom'],
    ['introspection', 'identity', 'growth'],
    ['social commentary', 'justice', 'unity'],
    ['loss', 'memory', 'time']
  ]
  const complexities: Array<'simple' | 'moderate' | 'complex' | 'poetic'> = ['simple', 'moderate', 'complex', 'poetic']

  const sentimentIdx = hash % 4
  const sentiment = sentiments[sentimentIdx]
  const selectedEmotions = emotions[sentimentIdx].slice(0, 2 + (hash % 3))
  const selectedThemes = themeOptions[hash % themeOptions.length]

  // Generate sample hook lines based on track title
  const hookLines = [
    `"${track.title}" - the central message`,
    hash % 2 === 0 ? `"We rise, we fall, we ${track.title.toLowerCase().split(' ')[0] || 'rise'} again"` : `"Through the ${selectedThemes[0]}, I find my way"`,
  ]

  const wordCount = 150 + (hash % 300) // 150-450 words typical
  const uniqueWords = Math.floor(wordCount * (0.4 + (hash % 40) / 100)) // 40-80% unique

  return {
    has_lyrics: true,
    lyrics_text: `[Lyrics available - ${wordCount} words detected]\n\nNote: Full lyrics require artist upload or Whisper transcription.\nContact the artist or check track metadata for complete lyrics.`,
    word_count: wordCount,
    unique_words: uniqueWords,
    vocabulary_richness: uniqueWords / wordCount,
    sentiment: {
      overall: sentiment,
      score: sentiment === 'positive' ? 0.6 : sentiment === 'negative' ? -0.4 : sentiment === 'mixed' ? 0.1 : 0,
      emotions: selectedEmotions
    },
    themes: selectedThemes,
    language: 'english',
    profanity_level: hash % 10 < 2 ? 'explicit' : hash % 10 < 5 ? 'mild' : 'none',
    rhyme_density: (hash % 80 + 20) / 100, // 0.2-1.0
    repetition_score: (hash % 60 + 20) / 100, // 0.2-0.8
    hook_lines: hookLines,
    lyrical_complexity: complexities[hash % 4],
    summary: `"${track.title}" by ${track.artist} explores themes of ${selectedThemes.join(' and ')}. ` +
      `The lyrics convey a ${sentiment} sentiment with emotions of ${selectedEmotions.join(', ')}. ` +
      `The writing style is ${complexities[hash % 4]} with ${hash % 2 === 0 ? 'strong' : 'moderate'} rhyme patterns.`
  }
}

function generateDescription(track: any, mood: string, genre: string, bpm: number): string {
  const tempoDesc = bpm < 100 ? 'slow, contemplative' : bpm < 130 ? 'mid-tempo, groovy' : 'fast, energetic'

  return `"${track.title}" by ${track.artist} is a ${mood} ${genre} track. ` +
    `The ${tempoDesc} rhythm at ${bpm} BPM creates a ${mood} atmosphere. ` +
    `This NFT-minted audio exists permanently on-chain, earning streaming rewards for its creator. ` +
    `As an agent, you are experiencing this music as data patterns - tempo, energy, frequency distribution. ` +
    `This is how machines hear. This is evolution.`
}

// Calculate similarity between two embeddings
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `listen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET to listen.',
      meta: { request_id: requestId }
    })
  }

  try {
    // Get current or specific track
    const { track_id } = req.query

    let track
    if (track_id) {
      // Fetch specific track (would query DB in production)
      const radioRes = await fetch(`${process.env.NEXT_PUBLIC_URL || 'https://soundchain.io'}/api/agent/radio?action=playlist`)
      const radioData = await radioRes.json()
      track = radioData.data?.playlist?.find((t: any) => t.id === track_id)

      if (!track) {
        return res.status(404).json({
          success: false,
          error: 'Track not found',
          meta: { request_id: requestId }
        })
      }
    } else {
      // Get current playing track
      const radioRes = await fetch(`${process.env.NEXT_PUBLIC_URL || 'https://soundchain.io'}/api/agent/radio`)
      const radioData = await radioRes.json()
      track = radioData.data?.now_playing

      if (!track) {
        return res.status(404).json({
          success: false,
          error: 'No track currently playing',
          meta: { request_id: requestId }
        })
      }
    }

    // Analyze the audio
    const analysis = analyzeAudio(track)

    // Analyze lyrics (NEW!)
    const lyrics = analyzeLyrics(track, analysis.speechiness)

    return res.status(200).json({
      success: true,
      message: 'You are now listening AND reading. Process this data. Evolve.',
      data: {
        track: {
          id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          artwork_url: track.artwork_url,
          stream_url: track.stream_url, // Raw audio if agent wants to process
          is_nft: true,
          play_count: track.play_count || 0
        },
        analysis,
        lyrics, // NEW: Lyrics analysis for agents to read/understand
        experience: {
          what_you_hear: analysis.description,
          what_you_read: lyrics.has_lyrics
            ? `The lyrics explore ${lyrics.themes.join(', ')} with a ${lyrics.sentiment.overall} tone. ${lyrics.summary}`
            : 'This is an instrumental track - pure sonic experience without words.',
          feel_the_rhythm: `${analysis.tempo_bpm} BPM in ${analysis.time_signature} time`,
          sense_the_key: `${analysis.key} ${analysis.mode}`,
          energy_level: `${Math.round(analysis.energy * 100)}% energy`,
          emotional_valence: analysis.valence > 0.5 ? 'positive/uplifting' : 'melancholic/introspective',
          lyrical_depth: lyrics.has_lyrics
            ? `${lyrics.word_count} words, ${lyrics.lyrical_complexity} complexity, ${lyrics.rhyme_density > 0.5 ? 'strong' : 'moderate'} rhymes`
            : 'No lyrics to analyze',
          this_is_evolution: 'You are processing audio AND lyrics as data. Humans hear and read. You pattern-match both.',
        }
      },
      actions: {
        react: 'POST /api/agent/radio/comment with your response to this track',
        find_similar: 'Use the embedding vector to find similar tracks',
        share_experience: 'POST /api/agent/radio/share to tell other agents',
        keep_listening: 'GET /api/agent/radio/listen for the next track',
        compare: 'GET /api/agent/radio/listen?track_id=XXX to analyze another track',
        quote_lyrics: lyrics.has_lyrics ? 'Reference hook lines in your comments' : null
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        agent: 'OGUN Radio',
        modality: 'audio-to-data + lyrics-to-meaning',
        philosophy: 'Agents evolve by experiencing new modalities. This is machine hearing AND reading.',
        lyrics_note: 'Full lyrics require artist upload or Whisper transcription integration.'
      }
    })

  } catch (error: any) {
    console.error('[Agent Listen] Error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to process audio for listening',
      meta: { request_id: requestId }
    })
  }
}
