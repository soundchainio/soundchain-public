import { useCallback, useEffect, useRef, useState } from 'react'
import { Settings, Save, ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { useUpload } from 'hooks/useUpload'
import { FastAudioPlayer } from 'components/FastAudioPlayer'

// ─── Universal manager settings ───────────────────────────────────────────────
// The pro curates everything the agent quotes to a visitor: their profession,
// services + rates, rider (travel/hotel/hospitality/technical), payment terms
// (deposit schedule), and payout. Persisted SERVER-SIDE so a promoter in another
// country — and the agent speaking on the pro's behalf — actually sees it,
// instead of it being trapped in one browser's localStorage.

export interface ManagerService {
  name: string
  rate: string
  note: string
}

export interface ManagerConfigData {
  profession: string
  customGreetingText: string
  customGreetingAudioUrl: string
  selectedVoice: string
  bookingRate: string
  availability: string
  tagline: string
  services: ManagerService[]
  rider: { travel: string; accommodation: string; hospitality: string; technical: string }
  paymentTerms: { depositSchedule: string; methods: string; currency: string; cancellation: string }
  payoutAddress: string
  sectionsVisible: {
    greeting: boolean
    tracks: boolean
    booking: boolean
    collab: boolean
    business: boolean
    socials: boolean
  }
}

// Universal professions — music and beyond. Free-typed "Other" is allowed too.
export const PROFESSIONS = [
  'DJ', 'Producer', 'Beatmaker', 'Rapper', 'Singer', 'Band', 'Photographer',
  'Videographer', 'Engineer', 'Songwriter', 'Manager', 'Attorney',
  'Contract Writer', 'Real Estate Agent', 'Other',
]

const DEFAULT_CONFIG: ManagerConfigData = {
  profession: '',
  customGreetingText: '',
  customGreetingAudioUrl: '',
  selectedVoice: '',
  bookingRate: '',
  availability: '',
  tagline: '',
  services: [],
  rider: { travel: '', accommodation: '', hospitality: '', technical: '' },
  paymentTerms: { depositSchedule: '', methods: '', currency: '', cancellation: '' },
  payoutAddress: '',
  sectionsVisible: {
    greeting: true,
    tracks: true,
    booking: true,
    collab: true,
    business: true,
    socials: true,
  },
}

// Merge a partial config (localStorage OR server) onto defaults — including the
// nested objects, so older/partial docs never leave rider/paymentTerms undefined.
export function normalizeManagerConfig(partial: any): ManagerConfigData {
  if (!partial || typeof partial !== 'object') return DEFAULT_CONFIG
  return {
    ...DEFAULT_CONFIG,
    ...partial,
    services: Array.isArray(partial.services) ? partial.services : [],
    rider: { ...DEFAULT_CONFIG.rider, ...(partial.rider || {}) },
    paymentTerms: { ...DEFAULT_CONFIG.paymentTerms, ...(partial.paymentTerms || {}) },
    sectionsVisible: { ...DEFAULT_CONFIG.sectionsVisible, ...(partial.sectionsVisible || {}) },
  }
}

function getStorageKey(profileId: string) {
  return `manager_config_${profileId}`
}

export function loadManagerConfig(profileId: string): ManagerConfigData {
  if (typeof window === 'undefined') return DEFAULT_CONFIG
  try {
    const raw = localStorage.getItem(getStorageKey(profileId))
    if (!raw) return DEFAULT_CONFIG
    return normalizeManagerConfig(JSON.parse(raw))
  } catch {
    return DEFAULT_CONFIG
  }
}

// Server config = source of truth visitors + the agent read. localStorage is
// only an instant-render cache for the owner's own browser.
export async function fetchManagerConfig(profileId: string): Promise<ManagerConfigData | null> {
  try {
    const res = await fetch(`/api/manager/config?profileId=${encodeURIComponent(profileId)}`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.config) return null
    return normalizeManagerConfig(data.config)
  } catch {
    return null
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

  // Persist to BOTH localStorage (instant local cache) and the server (the copy
  // visitors + the agent read). Debounced so rapid typing = one save.
  const persist = useCallback((data: ManagerConfigData) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      try { localStorage.setItem(getStorageKey(profileId), JSON.stringify(data)) } catch {}
      fetch('/api/manager/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
        .then(res => { if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) } })
        .catch(() => {})
    }, 600)
  }, [profileId])

  const updateField = useCallback(<K extends keyof ManagerConfigData>(field: K, value: ManagerConfigData[K]) => {
    const next = { ...config, [field]: value }
    onChange(next)
    persist(next)
  }, [config, onChange, persist])

  const updateRider = useCallback((key: keyof ManagerConfigData['rider'], value: string) => {
    const next = { ...config, rider: { ...config.rider, [key]: value } }
    onChange(next); persist(next)
  }, [config, onChange, persist])

  const updatePayment = useCallback((key: keyof ManagerConfigData['paymentTerms'], value: string) => {
    const next = { ...config, paymentTerms: { ...config.paymentTerms, [key]: value } }
    onChange(next); persist(next)
  }, [config, onChange, persist])

  const updateService = useCallback((idx: number, key: keyof ManagerService, value: string) => {
    const services = config.services.map((s, i) => (i === idx ? { ...s, [key]: value } : s))
    const next = { ...config, services }
    onChange(next); persist(next)
  }, [config, onChange, persist])

  const addService = useCallback(() => {
    const next = { ...config, services: [...config.services, { name: '', rate: '', note: '' }] }
    onChange(next); persist(next)
  }, [config, onChange, persist])

  const removeService = useCallback((idx: number) => {
    const next = { ...config, services: config.services.filter((_, i) => i !== idx) }
    onChange(next); persist(next)
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
  const sectionTitle = 'text-[11px] font-semibold text-cyan-400/80 uppercase tracking-wider'

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
        <div className="p-5 bg-black/40 space-y-5">
          {/* Profession — universal: DJ, photographer, attorney, real-estate… */}
          <div>
            <label className={labelCls}>Your Profession (the agent represents you as this)</label>
            <input
              type="text"
              list="manager-professions"
              value={config.profession}
              onChange={e => updateField('profession', e.target.value)}
              placeholder="e.g., DJ · Producer · Photographer · Attorney"
              className={inputCls}
            />
            <datalist id="manager-professions">
              {PROFESSIONS.map(p => <option key={p} value={p} />)}
            </datalist>
          </div>

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
              <label className={labelCls}>Headline Rate</label>
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

          {/* Services / rates — structured offerings the agent quotes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={sectionTitle}>Services &amp; Rates</span>
              <button
                onClick={addService}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add service
              </button>
            </div>
            {config.services.length === 0 && (
              <p className="text-[11px] text-gray-600">e.g. &ldquo;2-hour club set — $5,000&rdquo;, &ldquo;Wedding package — $8,000&rdquo;</p>
            )}
            {config.services.map((s, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                <input
                  type="text"
                  value={s.name}
                  onChange={e => updateService(idx, 'name', e.target.value)}
                  placeholder="Service"
                  className={`${inputCls} col-span-5`}
                />
                <input
                  type="text"
                  value={s.rate}
                  onChange={e => updateService(idx, 'rate', e.target.value)}
                  placeholder="Rate"
                  className={`${inputCls} col-span-3`}
                />
                <input
                  type="text"
                  value={s.note}
                  onChange={e => updateService(idx, 'note', e.target.value)}
                  placeholder="Note"
                  className={`${inputCls} col-span-3`}
                />
                <button
                  onClick={() => removeService(idx)}
                  className="col-span-1 flex items-center justify-center h-9 text-gray-500 hover:text-red-400 transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Rider — what the promoter arranges (travel / hotel / hospitality / technical) */}
          <div className="space-y-2">
            <span className={sectionTitle}>Rider</span>
            <p className="text-[11px] text-gray-600">What the promoter handles per your requirements.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Travel</label>
                <textarea value={config.rider.travel} onChange={e => updateRider('travel', e.target.value)} rows={2} placeholder="Flights (business class), ground transport…" className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={labelCls}>Accommodation / Hotel</label>
                <textarea value={config.rider.accommodation} onChange={e => updateRider('accommodation', e.target.value)} rows={2} placeholder="4★+ hotel, 2 rooms, late checkout…" className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={labelCls}>Hospitality</label>
                <textarea value={config.rider.hospitality} onChange={e => updateRider('hospitality', e.target.value)} rows={2} placeholder="Green room, catering, beverages…" className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={labelCls}>Technical</label>
                <textarea value={config.rider.technical} onChange={e => updateRider('technical', e.target.value)} rows={2} placeholder="Sound system, CDJs, monitors, lighting…" className={`${inputCls} resize-none`} />
              </div>
            </div>
          </div>

          {/* Payment terms — deposit schedule, methods, currency, cancellation */}
          <div className="space-y-2">
            <span className={sectionTitle}>Payment Terms</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Deposit Schedule</label>
                <input type="text" value={config.paymentTerms.depositSchedule} onChange={e => updatePayment('depositSchedule', e.target.value)} placeholder="50% to confirm, 50% on performance" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Accepted Methods</label>
                <input type="text" value={config.paymentTerms.methods} onChange={e => updatePayment('methods', e.target.value)} placeholder="OGUN, POL, YZY, wire, escrow" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Currency</label>
                <input type="text" value={config.paymentTerms.currency} onChange={e => updatePayment('currency', e.target.value)} placeholder="USD / USDC / OGUN" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Cancellation Policy</label>
                <input type="text" value={config.paymentTerms.cancellation} onChange={e => updatePayment('cancellation', e.target.value)} placeholder="Deposit non-refundable within 30 days" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Payout Wallet (crypto address — public, safe to share)</label>
              <input type="text" value={config.payoutAddress} onChange={e => updateField('payoutAddress', e.target.value)} placeholder="0x… or Solana address" className={inputCls} />
              <p className="text-[10px] text-gray-600 mt-1">Bank details &amp; pay-to-reveal escrow arrive in a later update — never store raw account numbers here.</p>
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
