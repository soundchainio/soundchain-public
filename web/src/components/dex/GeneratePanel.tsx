import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Sparkles, Download, ImageIcon, Share2, ChevronDown, ChevronUp, Loader2, AlertCircle, Server, X } from 'lucide-react'
import { Button } from 'components/ui/button'
import { toast } from 'react-toastify'

const SERVERS = [
  { id: 'fleet', name: 'Fleet Commander', desc: 'M1 Max, 64GB', color: 'cyan' },
  { id: 'rog', name: 'ROG', desc: 'GTX 1050 Ti, 4GB', color: 'orange' },
]

const STYLE_PRESETS = [
  {
    label: 'Album Art',
    prefix: 'album cover art, ',
    negative: 'text, watermark, logo, words, letters',
    width: 768,
    height: 768,
    color: 'purple',
  },
  {
    label: 'Portrait',
    prefix: 'portrait photo, ',
    negative: 'deformed face, ugly, blurry',
    width: 512,
    height: 768,
    color: 'pink',
  },
  {
    label: 'Scene',
    prefix: 'cinematic scene, ',
    negative: 'cartoon, anime, drawing',
    width: 768,
    height: 512,
    color: 'amber',
  },
  {
    label: 'Abstract',
    prefix: 'abstract art, ',
    negative: 'realistic, photo, face',
    width: 768,
    height: 768,
    color: 'green',
  },
  {
    label: 'Cyberpunk',
    prefix: 'cyberpunk style, neon lights, futuristic, ',
    negative: 'nature, daylight, medieval',
    width: 768,
    height: 512,
    color: 'cyan',
  },
]

const DEFAULT_NEGATIVE = 'ugly, blurry, low quality, deformed, disfigured, watermark, text, bad anatomy'

interface GenerateResult {
  image: string
  filename: string
  server: string
  prompt: string
  seed: number
}

interface HistoryItem extends GenerateResult {
  timestamp: number
}

export function GeneratePanel({ onShareToStory }: { onShareToStory?: (imageDataUrl: string) => void }) {
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState(DEFAULT_NEGATIVE)
  const [server, setServer] = useState('fleet')
  const [width, setWidth] = useState(768)
  const [height, setHeight] = useState(768)
  const [steps, setSteps] = useState(20)
  const [seed, setSeed] = useState(-1)
  const [cfg, setCfg] = useState(7)

  const [showNegative, setShowNegative] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])

  const abortRef = useRef<AbortController | null>(null)

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sc_generate_history')
      if (saved) setHistory(JSON.parse(saved))
    } catch {}
  }, [])

  const saveHistory = useCallback((item: GenerateResult) => {
    setHistory((prev) => {
      const next = [{ ...item, timestamp: Date.now() }, ...prev].slice(0, 10)
      try { localStorage.setItem('sc_generate_history', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const applyPreset = useCallback((preset: typeof STYLE_PRESETS[0]) => {
    setActivePreset(preset.label)
    setWidth(preset.width)
    setHeight(preset.height)
    setNegativePrompt(preset.negative + ', ' + DEFAULT_NEGATIVE)
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Enter a prompt first')
      return
    }

    setGenerating(true)
    setError(null)
    abortRef.current = new AbortController()

    const preset = STYLE_PRESETS.find((p) => p.label === activePreset)
    const fullPrompt = preset ? preset.prefix + prompt : prompt

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          negativePrompt,
          server,
          width,
          height,
          steps,
          seed,
          cfg,
        }),
        signal: abortRef.current.signal,
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Generation failed')
        return
      }

      setResult(data)
      saveHistory(data)
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Network error')
      }
    } finally {
      setGenerating(false)
    }
  }, [prompt, negativePrompt, server, width, height, steps, seed, cfg, activePreset, saveHistory])

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
    setGenerating(false)
  }, [])

  const handleSaveToDevice = useCallback(() => {
    if (!result?.image) return
    const link = document.createElement('a')
    link.href = result.image
    link.download = result.filename || 'soundchain-ai.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Image saved!')
  }, [result])

  const handleShareToStory = useCallback(() => {
    if (!result?.image || !onShareToStory) return
    onShareToStory(result.image)
  }, [result, onShareToStory])

  const colorMap: Record<string, string> = {
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30',
    pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30 hover:bg-pink-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30',
  }

  const activeColorMap: Record<string, string> = {
    purple: 'bg-purple-500/40 text-purple-300 border-purple-400',
    pink: 'bg-pink-500/40 text-pink-300 border-pink-400',
    amber: 'bg-amber-500/40 text-amber-300 border-amber-400',
    green: 'bg-green-500/40 text-green-300 border-green-400',
    cyan: 'bg-cyan-500/40 text-cyan-300 border-cyan-400',
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-violet-400" />
        <h3 className="text-white font-semibold">AI Image Generate</h3>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 border border-violet-500/30">BETA</span>
      </div>

      {/* Prompt */}
      <div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your image... e.g. a cyberpunk album cover with neon lights"
          className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
          rows={3}
          disabled={generating}
        />
      </div>

      {/* Negative Prompt (collapsible) */}
      <button
        onClick={() => setShowNegative(!showNegative)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        {showNegative ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Negative prompt
      </button>
      {showNegative && (
        <textarea
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder-gray-500 resize-none focus:outline-none focus:border-violet-500/50"
          rows={2}
          disabled={generating}
        />
      )}

      {/* Server Picker */}
      <div className="flex items-center gap-2">
        <Server className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs text-gray-500">Server:</span>
        {SERVERS.map((s) => (
          <button
            key={s.id}
            onClick={() => setServer(s.id)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
              server === s.id
                ? s.color === 'cyan'
                  ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400'
                  : 'bg-orange-500/30 text-orange-300 border-orange-400'
                : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
            }`}
            disabled={generating}
          >
            {s.name}
            <span className="ml-1 opacity-60 text-[10px]">{s.desc}</span>
          </button>
        ))}
      </div>

      {/* Style Presets */}
      <div className="flex flex-wrap gap-1.5">
        {STYLE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => {
              if (activePreset === preset.label) {
                setActivePreset(null)
              } else {
                applyPreset(preset)
              }
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              activePreset === preset.label
                ? activeColorMap[preset.color]
                : colorMap[preset.color]
            }`}
            disabled={generating}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Settings Accordion */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Settings
      </button>
      {showSettings && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Width</label>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              min={256}
              max={1024}
              step={64}
              className="w-full mt-1 bg-neutral-900 border border-white/10 rounded px-2 py-1 text-white text-xs"
              disabled={generating}
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Height</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              min={256}
              max={1024}
              step={64}
              className="w-full mt-1 bg-neutral-900 border border-white/10 rounded px-2 py-1 text-white text-xs"
              disabled={generating}
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Steps</label>
            <input
              type="number"
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value))}
              min={1}
              max={50}
              className="w-full mt-1 bg-neutral-900 border border-white/10 rounded px-2 py-1 text-white text-xs"
              disabled={generating}
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Seed</label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              className="w-full mt-1 bg-neutral-900 border border-white/10 rounded px-2 py-1 text-white text-xs"
              disabled={generating}
            />
            <span className="text-[9px] text-gray-600">-1 = random</span>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">CFG Scale</label>
            <input
              type="number"
              value={cfg}
              onChange={(e) => setCfg(Number(e.target.value))}
              min={1}
              max={20}
              step={0.5}
              className="w-full mt-1 bg-neutral-900 border border-white/10 rounded px-2 py-1 text-white text-xs"
              disabled={generating}
            />
          </div>
        </div>
      )}

      {/* Generate / Cancel Button */}
      {generating ? (
        <Button
          onClick={handleCancel}
          className="w-full bg-red-600/80 hover:bg-red-600 text-white font-bold py-2.5"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      ) : (
        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim()}
          className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold py-2.5 disabled:opacity-40"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate
        </Button>
      )}

      {/* Progress */}
      {generating && (
        <div className="flex items-center justify-center gap-2 py-6">
          <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
          <span className="text-sm text-gray-400">Generating on {SERVERS.find((s) => s.id === server)?.name}...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && !generating && (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black">
            <img
              src={result.image}
              alt={result.prompt}
              className="w-full h-auto"
            />
            <div className="absolute top-2 right-2 flex gap-1.5">
              <span className="text-[9px] bg-black/70 backdrop-blur-sm text-gray-300 px-1.5 py-0.5 rounded">
                seed: {result.seed}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveToDevice}
              className="border-white/10 text-white hover:bg-white/10"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Save to Device
            </Button>
            {onShareToStory && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareToStory}
                className="border-white/10 text-white hover:bg-white/10"
              >
                <Share2 className="w-3.5 h-3.5 mr-1.5" />
                Share to Story
              </Button>
            )}
          </div>
        </div>
      )}

      {/* History Strip */}
      {history.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Recent ({history.length})</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {history.map((item, i) => (
              <button
                key={item.timestamp}
                onClick={() => setResult(item)}
                className={`flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border transition-all ${
                  result?.filename === item.filename ? 'border-violet-400 ring-1 ring-violet-400/30' : 'border-white/10 hover:border-white/30'
                }`}
              >
                <img src={item.image} alt={`Generated ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default GeneratePanel
