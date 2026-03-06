import type { NextApiRequest, NextApiResponse } from 'next'
import { MsEdgeTTS } from 'msedge-tts'

export interface VoiceOption {
  shortName: string
  friendlyName: string
  gender: 'Female' | 'Male'
  locale: string
  label: string
}

export interface VoiceGroup {
  accent: string
  voices: VoiceOption[]
}

// Cache the voice list for 1 hour
let cachedVoices: VoiceGroup[] | null = null
let cacheTime = 0
const CACHE_TTL = 60 * 60 * 1000

function friendlyLabel(shortName: string, gender: string): string {
  // "en-US-EmmaMultilingualNeural" -> "Emma"
  const parts = shortName.split('-')
  const raw = parts[2] || parts[1] || shortName
  const name = raw.replace(/MultilingualNeural$/, '').replace(/Neural$/, '')
  return `${name} (${gender})`
}

// Map locale prefixes to human-readable group names
const LOCALE_MAP: Record<string, string> = {
  // English accents (show individually)
  'en-US': 'US English',
  'en-GB': 'British English',
  'en-AU': 'Australian English',
  'en-CA': 'Canadian English',
  'en-IN': 'Indian English',
  'en-IE': 'Irish English',
  'en-NZ': 'New Zealand English',
  'en-ZA': 'South African English',
  'en-SG': 'Singapore English',
  'en-HK': 'Hong Kong English',
  'en-KE': 'Kenyan English',
  'en-NG': 'Nigerian English',
  'en-PH': 'Philippine English',
  'en-TZ': 'Tanzanian English',
  // Foreign languages (user requested: Mandarin, Japanese, French, Spanish, Dutch)
  'zh-CN': 'Mandarin (China)',
  'zh-TW': 'Mandarin (Taiwan)',
  'zh-HK': 'Cantonese (Hong Kong)',
  'ja-JP': 'Japanese',
  'fr-FR': 'French (France)',
  'fr-CA': 'French (Canada)',
  'fr-BE': 'French (Belgium)',
  'fr-CH': 'French (Switzerland)',
  'es-ES': 'Spanish (Spain)',
  'es-MX': 'Spanish (Mexico)',
  'es-AR': 'Spanish (Argentina)',
  'es-CO': 'Spanish (Colombia)',
  'es-CL': 'Spanish (Chile)',
  'es-US': 'Spanish (US)',
  'nl-NL': 'Dutch (Netherlands)',
  'nl-BE': 'Dutch (Belgium)',
  // Other popular languages
  'de-DE': 'German (Germany)',
  'de-AT': 'German (Austria)',
  'de-CH': 'German (Switzerland)',
  'it-IT': 'Italian',
  'pt-BR': 'Portuguese (Brazil)',
  'pt-PT': 'Portuguese (Portugal)',
  'ko-KR': 'Korean',
  'hi-IN': 'Hindi',
  'ar-SA': 'Arabic (Saudi)',
  'ar-EG': 'Arabic (Egypt)',
  'ru-RU': 'Russian',
  'tr-TR': 'Turkish',
  'pl-PL': 'Polish',
  'sv-SE': 'Swedish',
  'da-DK': 'Danish',
  'nb-NO': 'Norwegian',
  'fi-FI': 'Finnish',
  'th-TH': 'Thai',
  'vi-VN': 'Vietnamese',
  'id-ID': 'Indonesian',
  'ms-MY': 'Malay',
  'tl-PH': 'Filipino',
  'uk-UA': 'Ukrainian',
  'cs-CZ': 'Czech',
  'ro-RO': 'Romanian',
  'hu-HU': 'Hungarian',
  'el-GR': 'Greek',
  'he-IL': 'Hebrew',
  'bg-BG': 'Bulgarian',
  'hr-HR': 'Croatian',
  'sk-SK': 'Slovak',
  'ca-ES': 'Catalan',
  'af-ZA': 'Afrikaans',
  'sw-KE': 'Swahili',
}

// Only include these language prefixes (to keep the list manageable)
const INCLUDED_LANGUAGES = new Set([
  'en', 'zh', 'ja', 'fr', 'es', 'nl', 'de', 'it', 'pt', 'ko',
  'hi', 'ar', 'ru', 'tr', 'pl', 'sv', 'da', 'nb', 'fi', 'th',
  'vi', 'id', 'ms', 'tl', 'uk', 'cs', 'ro', 'hu', 'el', 'he',
  'bg', 'hr', 'sk', 'ca', 'af', 'sw',
])

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const now = Date.now()
    if (cachedVoices && now - cacheTime < CACHE_TTL) {
      return res.status(200).json({ voices: cachedVoices })
    }

    const tts = new MsEdgeTTS()
    const allVoices = await tts.getVoices()

    // Filter to included languages
    const filtered = allVoices
      .filter(v => {
        const lang = v.Locale.split('-')[0]
        return INCLUDED_LANGUAGES.has(lang)
      })
      .map(v => ({
        shortName: v.ShortName,
        friendlyName: v.FriendlyName,
        gender: v.Gender as 'Female' | 'Male',
        locale: v.Locale,
        label: friendlyLabel(v.ShortName, v.Gender),
      }))

    // Group by locale
    const groupMap = new Map<string, VoiceOption[]>()
    for (const v of filtered) {
      const accent = LOCALE_MAP[v.locale] || v.locale
      if (!groupMap.has(accent)) groupMap.set(accent, [])
      groupMap.get(accent)!.push(v)
    }

    // Sort: English first (US, UK, AU), then user-requested languages, then rest
    const priority = [
      'US English', 'British English', 'Australian English',
      'Mandarin (China)', 'Mandarin (Taiwan)', 'Japanese',
      'French (France)', 'Spanish (Spain)', 'Spanish (Mexico)',
      'Dutch (Netherlands)',
    ]
    const groups: VoiceGroup[] = []
    for (const p of priority) {
      const voices = groupMap.get(p)
      if (voices) {
        voices.sort((a, b) => a.gender === b.gender ? a.label.localeCompare(b.label) : a.gender === 'Female' ? -1 : 1)
        groups.push({ accent: p, voices })
        groupMap.delete(p)
      }
    }
    for (const [accent, voices] of Array.from(groupMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      voices.sort((a, b) => a.gender === b.gender ? a.label.localeCompare(b.label) : a.gender === 'Female' ? -1 : 1)
      groups.push({ accent, voices })
    }

    cachedVoices = groups
    cacheTime = now

    res.status(200).json({ voices: groups })
  } catch (err) {
    console.error('[manager/voices] Error:', err)
    res.status(500).json({ error: 'Failed to fetch voices' })
  }
}
