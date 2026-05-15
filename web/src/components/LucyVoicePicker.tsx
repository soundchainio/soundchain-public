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
  const personaId = localStorage.getItem(STORAGE_KEY) || 'lucy-default'
  const persona = VOICE_PERSONAS.find((p) => p.id === personaId) || VOICE_PERSONAS[0]
  const voices = window.speechSynthesis.getVoices()
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

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setSelected(stored)

    const refresh = () => {
      setVoices(window.speechSynthesis.getVoices())
    }
    refresh()
    window.speechSynthesis.onvoiceschanged = refresh
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  function pick(id: string) {
    setSelected(id)
    localStorage.setItem(STORAGE_KEY, id)
    setOpen(false)
    // Preview the voice with a short utterance so user hears it immediately
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

  const selectedPersona = VOICE_PERSONAS.find((p) => p.id === selected) || VOICE_PERSONAS[0]

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
          <div className="absolute right-0 top-full mt-2 w-64 max-h-[60vh] overflow-y-auto rounded-xl bg-black border border-white/15 shadow-2xl z-[95] p-2">
            <div className="text-[10px] uppercase tracking-wide text-gray-500 px-2 py-1">Voice persona</div>
            {VOICE_PERSONAS.map((persona) => {
              const isSel = persona.id === selected
              const hasMatch = !!voices.find(persona.matchVoice)
              return (
                <button
                  key={persona.id}
                  onClick={() => pick(persona.id)}
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
            <div className="text-[10px] text-gray-600 px-2 pt-2 border-t border-white/5 mt-1">
              Currently: {selectedPersona.label}
              <br />
              Phase 10.5: Piper natural voices on anvil
            </div>
          </div>
        </>
      )}
    </div>
  )
}
