/**
 * LucyVoicePicker — Phase 10 of the Lucy stack.
 *
 * Header dropdown to switch Lucy's voice persona. Phase 10 v0 surfaces
 * the OS's built-in SpeechSynthesis voices (Samantha, Daniel, Karen,
 * Moira, Tessa, etc.) since browser TTS is what's running now. Each
 * selection saves to localStorage and applies on the next utterance.
 *
 * Phase 10.5 will swap the underlying engine to Piper on anvil (when
 * `lucy-piper-install.md` is run), but the picker UI stays the same:
 * the voice IDs just route to a Piper voice file instead of an OS voice.
 *
 * Curated persona ordering up top — "Lucy default" picks Samantha or
 * the first English female voice; then named personas (Daniel/Karen
 * etc); then a raw list of all available voices for power users.
 */
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'lucy.voice.v1'
// Phase 10.1 — explicit voice-name selection wins over persona matching, so
// user-downloaded Premium/Enhanced voices (Ava, Zoe, Serena etc.) become
// pickable directly instead of being filtered to a curated set.
const VOICE_NAME_KEY = 'lucy.voice.name.v1'

// Personas — name + match criteria for picking a SpeechSynthesisVoice.
// Phase 10.5 will map these IDs to Piper voice files on anvil.
export const VOICE_PERSONAS: Array<{
  id: string
  label: string
  description: string
  matchVoice: (v: SpeechSynthesisVoice) => boolean
  rate?: number
  pitch?: number
}> = [
  {
    id: 'lucy-default',
    label: 'Lucy (default)',
    description: 'Natural US female narrator',
    matchVoice: (v) => /samantha/i.test(v.name) || (/en-?US/i.test(v.lang) && /female/i.test(v.name)),
    rate: 1.05,
    pitch: 1.0,
  },
  {
    id: 'norman',
    label: 'Norman (Professor)',
    description: 'British academic male',
    matchVoice: (v) => /daniel/i.test(v.name) || /en-?GB/i.test(v.lang),
    rate: 1.0,
    pitch: 0.95,
  },
  {
    id: 'jarvis-vibe',
    label: 'Jarvis-vibe',
    description: 'Posh British butler energy',
    matchVoice: (v) => /daniel|oliver/i.test(v.name),
    rate: 0.95,
    pitch: 0.92,
  },
  {
    id: 'caribbean-storyteller',
    label: 'Caribbean storyteller',
    description: 'Warm, lyrical',
    matchVoice: (v) => /trinidad|jamaica/i.test(v.lang) || /trini/i.test(v.name),
    rate: 0.95,
    pitch: 1.05,
  },
  {
    id: 'australian',
    label: 'Karen (AU)',
    description: 'Australian female',
    matchVoice: (v) => /karen/i.test(v.name) || /en-?AU/i.test(v.lang),
    rate: 1.05,
    pitch: 1.0,
  },
  {
    id: 'irish',
    label: 'Moira (IE)',
    description: 'Irish female',
    matchVoice: (v) => /moira/i.test(v.name) || /en-?IE/i.test(v.lang),
    rate: 1.0,
    pitch: 1.0,
  },
  {
    id: 'south-african',
    label: 'Tessa (ZA)',
    description: 'South African female',
    matchVoice: (v) => /tessa/i.test(v.name) || /en-?ZA/i.test(v.lang),
    rate: 1.0,
    pitch: 1.0,
  },
  {
    id: 'indian',
    label: 'Rishi (IN)',
    description: 'Indian English male',
    matchVoice: (v) => /rishi/i.test(v.name) || /en-?IN/i.test(v.lang),
    rate: 1.0,
    pitch: 1.0,
  },
]

export interface VoiceConfig {
  voice: SpeechSynthesisVoice | null
  rate: number
  pitch: number
  personaId: string
}

/** Get the currently-selected voice config from localStorage + available voices. */
export function getVoiceConfig(): VoiceConfig {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return { voice: null, rate: 1.0, pitch: 1.0, personaId: 'lucy-default' }
  }
  const voices = window.speechSynthesis.getVoices()
  // Explicit voice-name selection wins (Premium/Enhanced voices Frank picks
  // directly from the All Voices list).
  const explicitName = localStorage.getItem(VOICE_NAME_KEY) || ''
  if (explicitName) {
    const exactMatch = voices.find((v) => v.name === explicitName)
    if (exactMatch) {
      return { voice: exactMatch, rate: 1.05, pitch: 1.0, personaId: 'custom' }
    }
  }
  // Fall back to persona heuristic match
  const personaId = localStorage.getItem(STORAGE_KEY) || 'lucy-default'
  const persona = VOICE_PERSONAS.find((p) => p.id === personaId) || VOICE_PERSONAS[0]
  const voice = voices.find(persona.matchVoice) || voices.find((v) => /en/i.test(v.lang)) || voices[0] || null
  return {
    voice,
    rate: persona.rate ?? 1.0,
    pitch: persona.pitch ?? 1.0,
    personaId,
  }
}

export default function LucyVoicePicker() {
  const [open, setOpen] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selected, setSelected] = useState<string>('lucy-default')
  const [explicitVoiceName, setExplicitVoiceName] = useState<string>('')

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setSelected(stored)
    const explicitName = localStorage.getItem(VOICE_NAME_KEY) || ''
    setExplicitVoiceName(explicitName)

    const refresh = () => {
      setVoices(window.speechSynthesis.getVoices())
    }
    refresh()
    window.speechSynthesis.onvoiceschanged = refresh
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  function pickPersona(id: string) {
    setSelected(id)
    localStorage.setItem(STORAGE_KEY, id)
    // Selecting a persona clears the explicit-voice override so persona
    // heuristic takes effect next utterance.
    localStorage.removeItem(VOICE_NAME_KEY)
    setExplicitVoiceName('')
    setOpen(false)
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      const persona = VOICE_PERSONAS.find((p) => p.id === id) || VOICE_PERSONAS[0]
      const voice = voices.find(persona.matchVoice) || voices.find((v) => /en/i.test(v.lang)) || null
      const u = new SpeechSynthesisUtterance('Hello Frank.')
      if (voice) u.voice = voice
      u.rate = persona.rate ?? 1.0
      u.pitch = persona.pitch ?? 1.0
      window.speechSynthesis.speak(u)
    }
  }

  function pickExplicitVoice(voice: SpeechSynthesisVoice) {
    localStorage.setItem(VOICE_NAME_KEY, voice.name)
    setExplicitVoiceName(voice.name)
    setOpen(false)
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance('Hello Frank. This is my new voice.')
      u.voice = voice
      u.rate = 1.05
      u.pitch = 1.0
      window.speechSynthesis.speak(u)
    }
  }

  const selectedPersona = VOICE_PERSONAS.find((p) => p.id === selected) || VOICE_PERSONAS[0]

  // Friendly language labels — keeps Frank from accidentally picking Monica
  // (Spanish) and getting Lucy's English text spoken with Spanish phonemes.
  // Flag emojis tag languages instantly at a glance.
  function labelForLang(lang: string): { flag: string; name: string } {
    const code = lang.toLowerCase()
    if (code.startsWith('en-us')) return { flag: '🇺🇸', name: 'English (US)' }
    if (code.startsWith('en-gb')) return { flag: '🇬🇧', name: 'English (UK)' }
    if (code.startsWith('en-au')) return { flag: '🇦🇺', name: 'English (AU)' }
    if (code.startsWith('en-ie')) return { flag: '🇮🇪', name: 'English (IE)' }
    if (code.startsWith('en-za')) return { flag: '🇿🇦', name: 'English (ZA)' }
    if (code.startsWith('en-in')) return { flag: '🇮🇳', name: 'English (IN)' }
    if (code.startsWith('en')) return { flag: '🇬🇧', name: 'English' }
    if (code.startsWith('es')) return { flag: '🇪🇸', name: 'Spanish' }
    if (code.startsWith('fr')) return { flag: '🇫🇷', name: 'French' }
    if (code.startsWith('de')) return { flag: '🇩🇪', name: 'German' }
    if (code.startsWith('it')) return { flag: '🇮🇹', name: 'Italian' }
    if (code.startsWith('pt')) return { flag: '🇵🇹', name: 'Portuguese' }
    if (code.startsWith('ja')) return { flag: '🇯🇵', name: 'Japanese' }
    if (code.startsWith('ko')) return { flag: '🇰🇷', name: 'Korean' }
    if (code.startsWith('zh')) return { flag: '🇨🇳', name: 'Chinese' }
    if (code.startsWith('ru')) return { flag: '🇷🇺', name: 'Russian' }
    if (code.startsWith('ar')) return { flag: '🇸🇦', name: 'Arabic' }
    if (code.startsWith('hi')) return { flag: '🇮🇳', name: 'Hindi' }
    if (code.startsWith('nl')) return { flag: '🇳🇱', name: 'Dutch' }
    if (code.startsWith('sv')) return { flag: '🇸🇪', name: 'Swedish' }
    if (code.startsWith('no')) return { flag: '🇳🇴', name: 'Norwegian' }
    if (code.startsWith('da')) return { flag: '🇩🇰', name: 'Danish' }
    if (code.startsWith('pl')) return { flag: '🇵🇱', name: 'Polish' }
    if (code.startsWith('tr')) return { flag: '🇹🇷', name: 'Turkish' }
    return { flag: '🌐', name: lang.toUpperCase() }
  }

  // Group voices by language. English variants first (Frank's primary use),
  // then everything else alphabetical by language name.
  const grouped = new Map<string, SpeechSynthesisVoice[]>()
  for (const v of voices) {
    const { name } = labelForLang(v.lang)
    if (!grouped.has(name)) grouped.set(name, [])
    grouped.get(name)!.push(v)
  }
  const groupOrder = [...grouped.keys()].sort((a, b) => {
    const aEn = a.startsWith('English') ? 0 : 1
    const bEn = b.startsWith('English') ? 0 : 1
    if (aEn !== bEn) return aEn - bEn
    return a.localeCompare(b)
  })
  // Sort within each group: premium first, then alphabetical by name
  for (const [k, arr] of grouped) {
    arr.sort((a, b) => {
      const aP = /premium|enhanced/i.test(a.name) ? 0 : 1
      const bP = /premium|enhanced/i.test(b.name) ? 0 : 1
      if (aP !== bP) return aP - bP
      return a.name.localeCompare(b.name)
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs px-2 py-1 rounded-lg bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 transition-colors"
        title="Pick Lucy's voice"
        aria-label="voice persona"
      >
        🎭
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-72 max-h-[70vh] overflow-y-auto rounded-xl bg-black border border-white/15 shadow-2xl z-[95] p-2">
            <div className="text-[10px] uppercase tracking-wide text-gray-500 px-2 py-1">Voice persona</div>
            {VOICE_PERSONAS.map((persona) => {
              const isSel = !explicitVoiceName && persona.id === selected
              const hasMatch = !!voices.find(persona.matchVoice)
              return (
                <button
                  key={persona.id}
                  onClick={() => pickPersona(persona.id)}
                  disabled={!hasMatch}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                    isSel
                      ? 'bg-cyan-500/20 border border-cyan-500/40 text-white'
                      : hasMatch
                      ? 'hover:bg-white/5 text-gray-200 border border-transparent'
                      : 'opacity-30 text-gray-400 cursor-not-allowed border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{persona.label}</span>
                    {isSel && <span className="text-[10px] text-cyan-400">●</span>}
                  </div>
                  <div className="text-[11px] text-gray-500">{persona.description}</div>
                  {!hasMatch && (
                    <div className="text-[10px] text-gray-600 italic mt-0.5">
                      not available on this device
                    </div>
                  )}
                </button>
              )
            })}

            {/* All voices on the device, grouped by language. English first
                so Frank doesn't accidentally pick Monica (Spanish) and get
                his English chat spoken with Spanish phonemes. Premium /
                Enhanced voices float to the top of each group. */}
            <div className="text-[10px] uppercase tracking-wide text-gray-500 px-2 pt-3 pb-1 border-t border-white/5 mt-2">
              All voices on this device ({voices.length})
            </div>
            {voices.length === 0 && (
              <div className="text-[11px] text-gray-500 px-2 py-2 italic">
                No voices loaded yet — close + reopen this picker after a moment
              </div>
            )}
            {groupOrder.map((groupName) => {
              const items = grouped.get(groupName) || []
              const sample = items[0]
              const { flag } = sample ? labelForLang(sample.lang) : { flag: '🌐' }
              return (
                <div key={groupName} className="pt-2">
                  <div className="text-[10px] text-gray-500 px-2 py-1 flex items-center gap-1.5 sticky top-0 bg-black/95 backdrop-blur">
                    <span>{flag}</span>
                    <span className="uppercase tracking-wide">{groupName}</span>
                    <span className="text-gray-600 ml-1">{items.length}</span>
                  </div>
                  {items.map((v) => {
                    const isSel = explicitVoiceName === v.name
                    const isPremium = /premium|enhanced/i.test(v.name)
                    return (
                      <button
                        key={v.voiceURI || v.name}
                        onClick={() => pickExplicitVoice(v)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors mb-0.5 ${
                          isSel
                            ? 'bg-cyan-500/20 border border-cyan-500/40 text-white'
                            : 'hover:bg-white/5 text-gray-200 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">
                            {v.name}
                            {isPremium && <span className="ml-1 text-[9px] text-amber-400">★ premium</span>}
                          </span>
                          <span className="text-[10px] text-gray-500 flex-shrink-0">{v.lang}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })}

            <div className="text-[10px] text-gray-500 px-2 pt-3 pb-1 border-t border-white/5 mt-2 uppercase tracking-wide">
              Get more voices
            </div>
            <div className="px-2 pb-2 space-y-2 text-[11px] text-gray-300 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">①</span>
                <div>
                  <div className="font-semibold text-white">iOS Premium voices (free, ~2 min)</div>
                  <div className="text-gray-400">
                    iPhone Settings → Accessibility → Read &amp; Speak → Voices → English (US) → tap any voice → download <span className="text-amber-400">Premium</span> variants. Restart this picker after.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">②</span>
                <div>
                  <div className="font-semibold text-white">Piper on anvil (natural voices, Phase 7)</div>
                  <div className="text-gray-400">
                    50+ neural-network voices, runs on M5000. Install runbook at <span className="font-mono text-purple-300">scripts/lucy-piper-install.md</span>.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-pink-400 mt-0.5">③</span>
                <div>
                  <div className="font-semibold text-white">XTTS voice cloning (Phase 12)</div>
                  <div className="text-gray-400">
                    Clone any voice from a 30-second WAV. Your own voice. A friend's. A hired actor.
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-gray-600 px-2 pt-2 border-t border-white/5 mt-1">
              Currently: {explicitVoiceName || selectedPersona.label}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
