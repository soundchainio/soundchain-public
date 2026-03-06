import { useCallback, useEffect, useRef, useState } from 'react'
import { Settings, Save, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { useUpload } from 'hooks/useUpload'
import { FastAudioPlayer } from 'components/FastAudioPlayer'

export interface ManagerConfigData {
  customGreetingText: string
  customGreetingAudioUrl: string
  selectedVoice: string
  bookingRate: string
  availability: string
  tagline: string
  sectionsVisible: {
    greeting: boolean
    tracks: boolean
    booking: boolean
    collab: boolean
    business: boolean
    socials: boolean
  }
}

const DEFAULT_CONFIG: ManagerConfigData = {
  customGreetingText: '',
  customGreetingAudioUrl: '',
  selectedVoice: '',
  bookingRate: '',
  availability: '',
  tagline: '',
  sectionsVisible: {
    greeting: true,
    tracks: true,
    booking: true,
    collab: true,
    business: true,
    socials: true,
  },
}

function getStorageKey(profileId: string) {
  return `manager_config_${profileId}`
}

export function loadManagerConfig(profileId: string): ManagerConfigData {
  if (typeof window === 'undefined') return DEFAULT_CONFIG
  try {
    const raw = localStorage.getItem(getStorageKey(profileId))
    if (!raw) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CONFIG
  }
}

interface ManagerConfigProps {
  profileId: string
  config: ManagerConfigData
  onChange: (config: ManagerConfigData) => void
}

export function ManagerConfig({ profileId, config, onChange }: ManagerConfigProps) {
  const [expanded, setExpanded] = useState(false)
  const [saved, setSaved] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const { uploading, upload } = useUpload(config.customGreetingAudioUrl, (url) => {
    updateField('customGreetingAudioUrl', url)
  })

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: upload,
    accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.ogg', '.aac'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const persist = useCallback((data: ManagerConfigData) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(getStorageKey(profileId), JSON.stringify(data))
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch {
        // localStorage full
      }
    }, 500)
  }, [profileId])

  const updateField = useCallback(<K extends keyof ManagerConfigData>(field: K, value: ManagerConfigData[K]) => {
    const next = { ...config, [field]: value }
    onChange(next)
    persist(next)
  }, [config, onChange, persist])

  const toggleSection = useCallback((key: keyof ManagerConfigData['sectionsVisible']) => {
    const next = {
      ...config,
      sectionsVisible: { ...config.sectionsVisible, [key]: !config.sectionsVisible[key] },
    }
    onChange(next)
    persist(next)
  }, [config, onChange, persist])

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const inputCls = 'w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none transition-colors placeholder:text-gray-500'
  const labelCls = 'block text-xs font-medium text-gray-400 mb-1'

  return (
    <div className="border border-cyan-500/20 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 bg-black/60 hover:bg-black/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">Manager Settings</span>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-400 animate-pulse">
              <Save className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="p-5 bg-black/40 space-y-4">
          {/* Custom Greeting */}
          <div>
            <label className={labelCls}>Custom Greeting (overrides auto-generated)</label>
            <textarea
              value={config.customGreetingText}
              onChange={e => updateField('customGreetingText', e.target.value)}
              placeholder="Welcome. You've reached the manager for..."
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Audio Upload */}
          <div>
            <label className={labelCls}>Custom Greeting Audio</label>
            {config.customGreetingAudioUrl ? (
              <div className="space-y-2">
                <FastAudioPlayer src={config.customGreetingAudioUrl} loop={false} />
                <button
                  onClick={() => updateField('customGreetingAudioUrl', '')}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Remove audio
                </button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`border border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <input {...getInputProps()} />
                {uploading ? (
                  <p className="text-cyan-400 text-sm animate-pulse">Uploading...</p>
                ) : (
                  <p className="text-gray-500 text-sm">
                    Drop an audio file here or tap to upload (MP3, WAV, M4A)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tagline */}
          <div>
            <label className={labelCls}>Tagline (shown below name)</label>
            <input
              type="text"
              value={config.tagline}
              onChange={e => updateField('tagline', e.target.value)}
              placeholder="e.g., Award-winning producer & DJ"
              className={inputCls}
            />
          </div>

          {/* Booking Rate + Availability */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Booking Rate</label>
              <input
                type="text"
                value={config.bookingRate}
                onChange={e => updateField('bookingRate', e.target.value)}
                placeholder="e.g., $500-$2,000/show"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Availability</label>
              <input
                type="text"
                value={config.availability}
                onChange={e => updateField('availability', e.target.value)}
                placeholder="e.g., Weekends, booking 2 months out"
                className={inputCls}
              />
            </div>
          </div>

          {/* Section Toggles */}
          <div>
            <label className={labelCls}>Visible Sections</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
              {(Object.keys(config.sectionsVisible) as Array<keyof typeof config.sectionsVisible>).map(key => (
                <button
                  key={key}
                  onClick={() => toggleSection(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    config.sectionsVisible[key]
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-gray-900 text-gray-500 border border-gray-700'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full transition-colors ${
                    config.sectionsVisible[key] ? 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.5)]' : 'bg-gray-600'
                  }`} />
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
