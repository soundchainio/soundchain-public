import type { NextApiRequest, NextApiResponse } from 'next'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { text, voice } = req.body as {
    text?: string
    voice?: string
  }

  if (!text || text.length < 1) {
    return res.status(400).json({ error: 'Text is required' })
  }

  if (text.length > 5000) {
    return res.status(400).json({ error: 'Text too long (max 5000 chars)' })
  }

  const voiceName = voice || 'en-US-EmmaMultilingualNeural'

  try {
    const tts = new MsEdgeTTS()
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)

    const result = await tts.toStream(text)

    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      result.audioStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })
      result.audioStream.on('end', () => resolve())
      result.audioStream.on('error', (err: Error) => reject(err))
    })

    if (chunks.length === 0) {
      return res.status(500).json({ error: 'No audio generated' })
    }

    const audioBuffer = Buffer.concat(chunks)

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', audioBuffer.length)
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.status(200).send(audioBuffer)
  } catch (err) {
    console.error('[manager/tts] Error:', err)
    res.status(500).json({ error: 'TTS generation failed' })
  }
}

export const config = {
  api: {
    responseLimit: '4mb',
  },
}
