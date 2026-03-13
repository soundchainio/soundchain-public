import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Sparkles, Download, Share2, ChevronDown, ChevronUp, Loader2, AlertCircle, Cpu, X, Zap, Clock, Check } from 'lucide-react'
import { Button } from 'components/ui/button'
import { toast } from 'react-toastify'

const MODELS = [
  {
    id: 'sdxl-turbo',
    name: 'SDXL Turbo',
    desc: '4-step, fastest',
    estimate: '~30-60s',
    color: 'cyan',
    category: 'fast',
    defaultSteps: 4,
    defaultWidth: 512,
    defaultHeight: 512,
    defaultCfg: 0.0,
    maxWidth: 512,
    maxHeight: 512,
  },
  {
    id: 'sd-1.5',
    name: 'SD 1.5',
    desc: 'Classic, versatile',
    estimate: '~2-3 min',
    color: 'purple',
    category: 'classic',
    defaultSteps: 20,
    defaultWidth: 512,
    defaultHeight: 512,
    defaultCfg: 7.5,
    maxWidth: 768,
    maxHeight: 768,
  },
  // Phase 2 models
  // {
  //   id: 'animagine-xl-4',
  //   name: 'Animagine XL',
  //   desc: 'Anime style',
  //   estimate: '~5-10 min',
  //   color: 'pink',
  //   category: 'anime',
  //   defaultSteps: 28,
  //   defaultWidth: 1024,
  //   defaultHeight: 1024,
  //   defaultCfg: 7.0,
  //   maxWidth: 1024,
  //   maxHeight: 1024,
  // },
  // {
  //   id: 'illustrious-xl',
  //   name: 'Illustrious XL',
  //   desc: 'Illustration',
  //   estimate: '~5-10 min',
  //   color: 'amber',
  //   category: 'illustration',
  //   defaultSteps: 28,
  //   defaultWidth: 1024,
  //   defaultHeight: 1024,
  //   defaultCfg: 7.0,
  //   maxWidth: 1024,
  //   maxHeight: 1024,
  // },
  // {
  //   id: 'kolors',
  //   name: 'Kolors',
  //   desc: 'Photorealistic',
  //   estimate: '~5-10 min',
  //   color: 'green',
  //   category: 'photorealistic',
  //   defaultSteps: 25,
  //   defaultWidth: 1024,
  //   defaultHeight: 1024,
  //   defaultCfg: 5.0,
  //   maxWidth: 1024,
  //   maxHeight: 1024,
  // },
]

const STYLE_PRESETS = [
  {
    label: 'Album Art',
    prefix: 'album cover art, ',
    negative: 'text, watermark, logo, words, letters',
    width: 512,
    height: 512,
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
    width: 512,
    height: 512,
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
  model: string
  prompt: string
  seed: number
  time_seconds?: number
  width?: number
  height?: number
  steps?: number
}

interface HistoryItem extends GenerateResult {
  timestamp: number
}

export function GeneratePanel({ onShareToStory }: { onShareToStory?: (imageDataUrl: string) => void }) {
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState(DEFAULT_NEGATIVE)
  const [selectedModel, setSelectedModel] = useState('sdxl-turbo')
  const [width, setWidth] = useState(512)
  const [height, setHeight] = useState(512)
  const [steps, setSteps] = useState(4)
  const [seed, setSeed] = useState(-1)
  const [cfg, setCfg] = useState(0.0)

  const [showNegative, setShowNegative] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const [generating, setGenerating] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])

  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sc_generate_history')
      if (saved) setHistory(JSON.parse(saved))
    } catch {}
  }, [])

  // Elapsed timer during generation
  useEffect(() => {
    if (generating) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [generating])

  const saveHistory = useCallback((item: GenerateResult) => {
    setHistory((prev) => {
      const next = [{ ...item, timestamp: Date.now() }, ...prev].slice(0, 10)
      try { localStorage.setItem('sc_generate_history', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const selectModel = useCallback((modelId: string) => {
    const model = MODELS.find((m) => m.id === modelId)
    if (!model) return
    setSelectedModel(modelId)
    setSteps(model.defaultSteps)
    setWidth(model.defaultWidth)
    setHeight(model.defaultHeight)
    setCfg(model.defaultCfg)
  }, [])

  const applyPreset = useCallback((preset: typeof STYLE_PRESETS[0]) => {
    setActivePreset(preset.label)
    const model = MODELS.find((m) => m.id === selectedModel)
    const maxW = model?.maxWidth || 1024
    const maxH = model?.maxHeight || 1024
    setWidth(Math.min(preset.width, maxW))
    setHeight(Math.min(preset.height, maxH))
    setNegativePrompt(preset.negative + ', ' + DEFAULT_NEGATIVE)
  }, [selectedModel])

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
          backend: 'imagine',
          model: selectedModel,
          negativePrompt,
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
  }, [prompt, negativePrompt, selectedModel, width, height, steps, seed, cfg, activePreset, saveHistory])

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
    setGenerating(false)
  }, [])

  const handleSaveToDevice = useCallback(() => {
    if (!result?.image) return
    const link = document.createElement('a')
    link.href = result.image
    link.download = `soundchain-${result.model}-${result.seed}.png`
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

  const currentModel = MODELS.find((m) => m.id === selectedModel)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-violet-400" />
        <h3 className="text-white font-semibold">AI Image Generate</h3>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 border border-violet-500/30">IMAGINE</span>
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

      {/* Model Picker */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-xs text-gray-500">Model:</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => selectModel(model.id)}
              className={`relative p-2.5 rounded-lg border text-left transition-all ${
                selectedModel === model.id
                  ? model.color === 'cyan'
                    ? 'bg-cyan-500/20 border-cyan-400/50 ring-1 ring-cyan-400/20'
                    : 'bg-purple-500/20 border-purple-400/50 ring-1 ring-purple-400/20'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
              disabled={generating}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${
                  selectedModel === model.id
                    ? model.color === 'cyan' ? 'text-cyan-300' : 'text-purple-300'
                    : 'text-white'
                }`}>
                  {model.name}
                </span>
                {selectedModel === model.id && (
                  <Check className={`w-3.5 h-3.5 ${model.color === 'cyan' ? 'text-cyan-400' : 'text-purple-400'}`} />
                )}
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">{model.desc}</p>
              <div className="flex items-center gap-1 mt-1">
                {model.category === 'fast' ? (
                  <Zap className="w-3 h-3 text-yellow-500" />
                ) : (
                  <Clock className="w-3 h-3 text-gray-600" />
                )}
                <span className="text-[10px] text-gray-600">{model.estimate}</span>
              </div>
            </button>
          ))}
        </div>
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
              max={currentModel?.maxWidth || 1024}
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
              max={currentModel?.maxHeight || 1024}
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
              min={0}
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
        <div className="flex flex-col items-center justify-center gap-2 py-6">
          <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
          <span className="text-sm text-gray-400">
            Generating with {currentModel?.name}...
          </span>
          <span className="text-xs text-gray-600">
            {elapsed}s elapsed {currentModel && `(est. ${currentModel.estimate})`}
          </span>
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
                {result.model}
              </span>
              <span className="text-[9px] bg-black/70 backdrop-blur-sm text-gray-300 px-1.5 py-0.5 rounded">
                seed: {result.seed}
              </span>
              {result.time_seconds && (
                <span className="text-[9px] bg-black/70 backdrop-blur-sm text-gray-300 px-1.5 py-0.5 rounded">
                  {result.time_seconds}s
                </span>
              )}
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
                  result?.seed === item.seed && result?.model === item.model ? 'border-violet-400 ring-1 ring-violet-400/30' : 'border-white/10 hover:border-white/30'
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
