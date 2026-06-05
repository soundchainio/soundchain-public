import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Square, Pencil, Check, X, RotateCcw, Mic, ChevronDown, Loader2 } from 'lucide-react'
import { FastAudioPlayer } from 'components/FastAudioPlayer'
import { t, baseLang, localeFor, localizedGreeting } from 'lib/managerI18n'

interface ManagerGreetingProps {
  displayName: string
  bio?: string | null
  genres?: string[] | null
  latestTrackTitle?: string | null
  tracksCount?: number
  customGreetingText?: string
  customGreetingAudioUrl?: string
  isOwner?: boolean
  selectedVoice?: string
  lang?: string
  onSaveGreeting?: (text: string) => void
  onSaveVoice?: (voice: string) => void
}

interface VoiceOption {
  shortName: string
  label: string
  gender: 'Female' | 'Male'
  locale: string
}

interface VoiceGroup {
  accent: string
  voices: VoiceOption[]
}

function buildGreeting(props: ManagerGreetingProps): string {
  const { displayName, bio, genres, latestTrackTitle, tracksCount } = props
  const parts: string[] = []

  parts.push(`Welcome. You've reached the manager for ${displayName}.`)

  if (bio) {
    const firstSentence = bio.split(/[.!?]/)[0]?.trim()
    if (firstSentence && firstSentence.length > 5) {
      parts.push(firstSentence + '.')
    }
  }

  if (genres && genres.length > 0) {
    parts.push(`They specialize in ${genres.slice(0, 3).join(', ')}.`)
  }

  if (latestTrackTitle) {
    parts.push(`Their latest track is "${latestTrackTitle}".`)
  }

  if (tracksCount && tracksCount > 0) {
    parts.push(`They have ${tracksCount} tracks on SoundChain.`)
  }

  parts.push('How can I help you today? You can book a show, propose a collaboration, or make a business inquiry.')

  return parts.join(' ')
}

export function ManagerGreeting({
  displayName,
  bio,
  genres,
  latestTrackTitle,
  tracksCount,
  customGreetingText,
  customGreetingAudioUrl,
  isOwner,
  selectedVoice,
  lang,
  onSaveGreeting,
  onSaveVoice,
}: ManagerGreetingProps) {
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [saved, setSaved] = useState(false)

  // Voice picker state
  const [voicePickerOpen, setVoicePickerOpen] = useState(false)
  const [voiceGroups, setVoiceGroups] = useState<VoiceGroup[]>([])
  const [voicesLoading, setVoicesLoading] = useState(false)
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null)
  const [expandedAccent, setExpandedAccent] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const autoGreeting = buildGreeting({
    displayName, bio, genres, latestTrackTitle, tracksCount,
  })
  // Polyglot: with no custom greeting set, a non-English visitor gets the
  // greeting in THEIR language, spoken in a matching neural voice — the agent
  // talks to them in their own tongue (a custom greeting stays the pro's words).
  const useLocalized = baseLang(lang) !== 'en' && !customGreetingText
  const greetingText = customGreetingText || (useLocalized ? localizedGreeting(lang, displayName) : autoGreeting)
  const voiceName = useLocalized ? localeFor(lang).voice : (selectedVoice || 'en-US-EmmaMultilingualNeural')
  const rtl = localeFor(lang).rtl

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      abortRef.current?.abort()
    }
  }, [])

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    abortRef.current?.abort()
    setPlaying(false)
    setLoading(false)
    setPreviewingVoice(null)
  }, [])

  const playTTS = useCallback(async (text: string, voice: string) => {
    stopAudio()
    setLoading(true)

    try {
      abortRef.current = new AbortController()
      const res = await fetch('/api/manager/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error('TTS failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio

      audio.onplay = () => { setPlaying(true); setLoading(false) }
      audio.onended = () => { setPlaying(false); setPreviewingVoice(null); URL.revokeObjectURL(url) }
      audio.onerror = () => { setPlaying(false); setLoading(false); setPreviewingVoice(null) }

      await audio.play()
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('[ManagerGreeting] TTS error:', err)
      }
      setPlaying(false)
      setLoading(false)
      setPreviewingVoice(null)
    }
  }, [stopAudio])

  const handlePlay = useCallback(() => {
    if (playing || loading) {
      stopAudio()
      return
    }
    playTTS(greetingText, voiceName)
  }, [playing, loading, greetingText, voiceName, playTTS, stopAudio])

  // Voice picker
  const handleOpenVoicePicker = async () => {
    if (voicePickerOpen) {
      setVoicePickerOpen(false)
      return
    }
    setVoicePickerOpen(true)

    if (voiceGroups.length === 0) {
      setVoicesLoading(true)
      try {
        const res = await fetch('/api/manager/voices')
        if (res.ok) {
          const data = await res.json()
          setVoiceGroups(data.voices || [])
          // Auto-expand the group containing the current voice
          for (const g of (data.voices || []) as VoiceGroup[]) {
            if (g.voices.some(v => v.shortName === voiceName)) {
              setExpandedAccent(g.accent)
              break
            }
          }
        }
      } catch (err) {
        console.error('[ManagerGreeting] Failed to load voices:', err)
      } finally {
        setVoicesLoading(false)
      }
    }
  }

  const handlePreviewVoice = (voice: string) => {
    if (previewingVoice === voice) {
      stopAudio()
      return
    }
    setPreviewingVoice(voice)
    // Short preview text
    const preview = `Hello, I'm the AI manager for ${displayName}. How can I help you today?`
    playTTS(preview, voice)
  }

  const handleSelectVoice = (voice: string) => {
    onSaveVoice?.(voice)
    setVoicePickerOpen(false)
    stopAudio()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleStartEdit = () => {
    setEditText(greetingText)
    setEditing(true)
  }

  const handleSave = () => {
    const trimmed = editText.trim()
    onSaveGreeting?.(trimmed)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleCancel = () => {
    setEditing(false)
  }

  const handleResetToAuto = () => {
    onSaveGreeting?.('')
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="backdrop-blur-xl bg-black/80 border border-cyan-500/20 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${playing ? 'bg-cyan-400 animate-pulse' : 'bg-cyan-500/50'}`} />
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">Artist Manager</span>
          {saved && (
            <span className="text-xs text-green-400 animate-pulse">Saved</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Play / Stop pill */}
          {!editing && (
            <button
              onClick={handlePlay}
              disabled={loading}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors border ${
                playing
                  ? 'text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/20'
                  : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20'
              } ${loading ? 'opacity-60' : ''}`}
              title={playing ? 'Stop speaking' : 'Play greeting'}
            >
              {loading ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> {t(lang, 'loading')}</>
              ) : playing ? (
                <><Square className="w-3 h-3" /> {t(lang, 'stop')}</>
              ) : (
                <><Play className="w-3 h-3" /> {t(lang, 'play')}</>
              )}
            </button>
          )}
          {/* Voice picker pill (owner only) */}
          {isOwner && !editing && (
            <button
              onClick={handleOpenVoicePicker}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors border ${
                voicePickerOpen
                  ? 'text-purple-400 bg-purple-500/20 border-purple-500/30'
                  : 'text-purple-400 bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20'
              }`}
              title="Choose AI voice"
            >
              <Mic className="w-3 h-3" />
              Voice
            </button>
          )}
          {/* Edit Script pill (owner only) */}
          {isOwner && !editing && (
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
              title="Edit greeting script"
            >
              <Pencil className="w-3 h-3" />
              Script
            </button>
          )}
        </div>
      </div>

      {customGreetingAudioUrl ? (
        <div className="mb-3">
          <FastAudioPlayer src={customGreetingAudioUrl} autoplay={false} loop={false} />
        </div>
      ) : null}

      {/* Voice Picker Panel */}
      {voicePickerOpen && (
        <div className="mb-4 border border-purple-500/20 rounded-xl bg-black/60 overflow-hidden">
          <div className="p-3 border-b border-purple-500/10">
            <p className="text-xs text-purple-300 font-medium">AI Voice — 300+ Neural Voices in 36 Languages</p>
            {selectedVoice && (
              <p className="text-[10px] text-gray-500 mt-0.5">
                Current: <span className="text-purple-400">{selectedVoice.split('-').slice(2).join(' ').replace(/Neural$/, '')}</span>
              </p>
            )}
          </div>

          {voicesLoading ? (
            <div className="p-4 flex items-center justify-center gap-2 text-xs text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading voices...
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {voiceGroups.map(group => (
                <div key={group.accent}>
                  <button
                    onClick={() => setExpandedAccent(expandedAccent === group.accent ? null : group.accent)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-300 hover:bg-white/5 transition-colors border-b border-gray-800/50"
                  >
                    <span>{group.accent} <span className="text-gray-600">({group.voices.length})</span></span>
                    <ChevronDown className={`w-3 h-3 text-gray-600 transition-transform ${expandedAccent === group.accent ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedAccent === group.accent && (
                    <div className="py-1">
                      {group.voices.map(v => {
                        const isSelected = voiceName === v.shortName
                        const isPreviewing = previewingVoice === v.shortName
                        return (
                          <div
                            key={v.shortName}
                            className={`flex items-center justify-between px-3 py-1.5 ${isSelected ? 'bg-purple-500/10' : 'hover:bg-white/5'} transition-colors`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${v.gender === 'Female' ? 'bg-pink-400' : 'bg-blue-400'}`} />
                              <span className={`text-xs truncate ${isSelected ? 'text-purple-300 font-medium' : 'text-gray-400'}`}>
                                {v.label}
                              </span>
                              {isSelected && <span className="text-[9px] text-purple-500 flex-shrink-0">current</span>}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                              <button
                                onClick={() => handlePreviewVoice(v.shortName)}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                                  isPreviewing
                                    ? 'text-red-400 bg-red-500/10'
                                    : 'text-gray-500 hover:text-purple-400 hover:bg-purple-500/10'
                                }`}
                              >
                                {isPreviewing && playing ? 'Stop' : 'Try'}
                              </button>
                              {!isSelected && (
                                <button
                                  onClick={() => handleSelectVoice(v.shortName)}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-medium text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
                                >
                                  Use
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {editing ? (
        <div className="space-y-3">
          <textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            rows={5}
            className="w-full bg-gray-900 border border-cyan-500/30 text-white rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none transition-colors placeholder:text-gray-500 resize-none"
            placeholder="Write your custom greeting..."
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-black bg-cyan-400 hover:bg-cyan-300 transition-colors"
            >
              <Check className="w-3 h-3" />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
            {customGreetingText && (
              <button
                onClick={handleResetToAuto}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 transition-colors ml-auto"
                title="Reset to auto-generated greeting"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to Auto
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-gray-300 text-sm leading-relaxed italic" dir={rtl ? 'rtl' : undefined}>
          &ldquo;{greetingText}&rdquo;
        </p>
      )}
    </div>
  )
}
