import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Sparkles, Download, Share2, ChevronDown, ChevronUp, Loader2, AlertCircle, Cpu, X, Zap, Clock, Check, Upload, ImageIcon, Trash2, ScanFace, Sliders, RefreshCw, Focus, Sun, Palette, LayoutGrid, Contrast, Ban } from 'lucide-react'
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
    label: 'Realistic',
    prefix: 'photorealistic, photograph, 8k uhd, sharp focus, detailed skin texture, natural lighting, DSLR, ',
    negative: 'cartoon, anime, drawing, painting, illustration, cgi, 3d render, disfigured, bad anatomy, deformed face, ugly, blurry, watermark, text, extra fingers, mutated hands, poorly drawn face, mutation, long neck',
    width: 512,
    height: 512,
    color: 'green',
  },
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
    prefix: 'photorealistic portrait, studio lighting, softbox, sharp focus, detailed skin, DSLR, ',
    negative: 'cartoon, anime, drawing, deformed face, ugly, blurry, bad anatomy, disfigured, extra fingers, mutated hands, poorly drawn face, watermark, text',
    width: 512,
    height: 768,
    color: 'pink',
  },
  {
    label: 'Cinematic',
    prefix: 'cinematic still, film grain, dramatic lighting, shallow depth of field, anamorphic lens, ',
    negative: 'cartoon, anime, drawing, low quality, blurry',
    width: 768,
    height: 512,
    color: 'amber',
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

const REFINEMENT_CATEGORIES = [
  {
    id: 'face',
    label: 'Face Consistency',
    icon: ScanFace,
    color: 'pink',
    promptBoost: '',
    negativeBoost: 'distorted face, wrong face, face morphing',
    paramChanges: { ipScaleDelta: 0.15, faceMode: true },
  },
  {
    id: 'quality',
    label: 'Visual Quality',
    icon: Sparkles,
    color: 'purple',
    promptBoost: 'masterpiece, best quality, ultra detailed',
    negativeBoost: 'low quality, jpeg artifacts, noise, grain',
    paramChanges: { stepsDelta: 4 },
  },
  {
    id: 'detail',
    label: 'Detail & Sharpness',
    icon: Focus,
    color: 'cyan',
    promptBoost: 'sharp focus, intricate details, 8k uhd',
    negativeBoost: 'blurry, soft, out of focus, bokeh',
    paramChanges: { stepsDelta: 2 },
  },
  {
    id: 'lighting',
    label: 'Lighting',
    icon: Sun,
    color: 'amber',
    promptBoost: 'professional studio lighting, rim light, soft shadows',
    negativeBoost: 'flat lighting, overexposed, underexposed, harsh shadows',
    paramChanges: {},
  },
  {
    id: 'style',
    label: 'Style Match',
    icon: Palette,
    color: 'green',
    promptBoost: '',
    negativeBoost: '',
    paramChanges: { cfgDelta: 2.0, applyPreset: true },
  },
  {
    id: 'composition',
    label: 'Composition',
    icon: LayoutGrid,
    color: 'purple',
    promptBoost: 'centered, rule of thirds, balanced composition',
    negativeBoost: 'cropped, cut off, awkward framing',
    paramChanges: {},
  },
  {
    id: 'color',
    label: 'Color & Contrast',
    icon: Contrast,
    color: 'pink',
    promptBoost: 'vibrant colors, high contrast, color graded',
    negativeBoost: 'washed out, desaturated, dull colors, low contrast',
    paramChanges: {},
  },
  {
    id: 'artifacts',
    label: 'Artifacts & Text',
    icon: Ban,
    color: 'amber',
    promptBoost: '',
    negativeBoost: 'text, watermark, logo, signature, artifacts, glitch, border',
    paramChanges: {},
  },
] as const

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

  // img2img + IP-Adapter state
  const [refImages, setRefImages] = useState<{data: string, name: string}[]>([])
  const [strength, setStrength] = useState(0.7)
  const [faceMode, setFaceMode] = useState(false)
  const [ipScale, setIpScale] = useState(0.6)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [refinements, setRefinements] = useState<string[]>([])

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

  const handleImageFiles = useCallback((files: File[]) => {
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`)
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} must be under 10MB`)
        continue
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        setRefImages((prev) => {
          if (prev.length >= 4) {
            toast.error('Max 4 reference images')
            return prev
          }
          return [...prev, { data: e.target?.result as string, name: file.name }]
        })
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) handleImageFiles(files)
  }, [handleImageFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const removeRefImage = useCallback((index: number) => {
    setRefImages((prev) => prev.filter((_, i) => i !== index))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const clearAllRefImages = useCallback(() => {
    setRefImages([])
    setFaceMode(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const deleteHistoryItem = useCallback((timestamp: number) => {
    setHistory((prev) => {
      const next = prev.filter((item) => item.timestamp !== timestamp)
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

    // Determine mode: if 1 image without face mode, use standard img2img (faster)
    // If 2+ images OR face mode, use IP-Adapter path
    const useIpAdapter = refImages.length >= 2 || (refImages.length >= 1 && faceMode)
    const useSingleImg2Img = refImages.length === 1 && !faceMode

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
          ...(useSingleImg2Img ? { image: refImages[0].data, strength } : {}),
          ...(useIpAdapter ? {
            referenceImages: refImages.map(r => r.data),
            faceMode,
            ipScale,
          } : {}),
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
  }, [prompt, negativePrompt, selectedModel, width, height, steps, seed, cfg, activePreset, saveHistory, refImages, faceMode, ipScale, strength])

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

  const [pendingRefineGenerate, setPendingRefineGenerate] = useState(false)

  const toggleRefinement = useCallback((id: string) => {
    setRefinements((prev) => {
      if (prev.includes(id)) return prev.filter((r) => r !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }, [])

  const handleRefineAndGenerate = useCallback(() => {
    if (refinements.length === 0) return

    const promptBoosts: string[] = []
    const negativeBoosts: string[] = []
    let stepsDelta = 0
    let cfgDelta = 0
    let ipScaleDelta = 0
    let shouldSetFaceMode = false
    let shouldApplyPreset = false

    for (const catId of refinements) {
      const cat = REFINEMENT_CATEGORIES.find((c) => c.id === catId)
      if (!cat) continue

      if (cat.promptBoost) {
        cat.promptBoost.split(', ').forEach((term) => {
          if (!prompt.toLowerCase().includes(term.toLowerCase())) promptBoosts.push(term)
        })
      }
      if (cat.negativeBoost) {
        cat.negativeBoost.split(', ').forEach((term) => {
          if (!negativePrompt.toLowerCase().includes(term.toLowerCase())) negativeBoosts.push(term)
        })
      }

      const p = cat.paramChanges
      if ('stepsDelta' in p) stepsDelta += (p as any).stepsDelta
      if ('cfgDelta' in p) cfgDelta += (p as any).cfgDelta
      if ('ipScaleDelta' in p) ipScaleDelta += (p as any).ipScaleDelta
      if ('faceMode' in p) shouldSetFaceMode = true
      if ('applyPreset' in p) shouldApplyPreset = true
    }

    if (promptBoosts.length > 0) {
      setPrompt((prev) => promptBoosts.join(', ') + ', ' + prev)
    }
    if (negativeBoosts.length > 0) {
      setNegativePrompt((prev) => prev + ', ' + negativeBoosts.join(', '))
    }
    if (stepsDelta > 0) setSteps((prev) => Math.min(prev + stepsDelta, 50))
    if (cfgDelta > 0) setCfg((prev) => Math.min(prev + cfgDelta, 20))
    if (ipScaleDelta > 0) setIpScale((prev) => Math.min(prev + ipScaleDelta, 1.0))
    if (shouldSetFaceMode) setFaceMode(true)
    if (shouldApplyPreset && activePreset) {
      const preset = STYLE_PRESETS.find((p) => p.label === activePreset)
      if (preset && !prompt.toLowerCase().includes(preset.prefix.toLowerCase().slice(0, 10))) {
        setPrompt((prev) => preset.prefix + prev)
      }
    }

    setSeed(-1)
    setRefinements([])
    setPendingRefineGenerate(true)
  }, [refinements, prompt, negativePrompt, activePreset])

  // Trigger generation after refine state updates have flushed
  useEffect(() => {
    if (pendingRefineGenerate) {
      setPendingRefineGenerate(false)
      handleGenerate()
    }
  }, [pendingRefineGenerate, handleGenerate])

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

      {/* Reference Images (img2img / IP-Adapter) */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || [])
            if (files.length) handleImageFiles(files)
          }}
        />
        {refImages.length > 0 ? (
          <div className="space-y-2">
            {/* Compact horizontal thumbnail strip + controls */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-shrink-0">
                {refImages.map((img, i) => (
                  <div key={i} className="relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden border border-violet-500/30 bg-black">
                    <img src={img.data} alt={img.name} className="w-full h-full object-cover opacity-80" />
                    <button
                      onClick={() => removeRefImage(i)}
                      className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-black/80 text-white hover:bg-red-500/80 flex items-center justify-center transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                {refImages.length < 4 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-12 h-12 flex-shrink-0 rounded-md border border-dashed border-white/10 hover:border-violet-400/50 hover:bg-violet-500/5 flex items-center justify-center transition-all"
                  >
                    <Upload className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] bg-black/70 text-violet-300 px-1.5 py-0.5 rounded-full border border-violet-500/20 whitespace-nowrap">
                    <ImageIcon className="w-2.5 h-2.5 inline mr-0.5" />
                    {refImages.length === 1 && !faceMode ? 'img2img' : `IP-Adapter (${refImages.length})`}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFaceMode(!faceMode)}
                      className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
                        faceMode ? 'bg-violet-500/30 text-violet-300 border-violet-400/50' : 'text-gray-500 border-white/10 hover:text-gray-300'
                      }`}
                    >
                      <ScanFace className="w-2.5 h-2.5" />
                      Face
                    </button>
                    <button
                      onClick={clearAllRefImages}
                      className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                {/* Strength slider */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-gray-500 whitespace-nowrap">
                    {(refImages.length >= 2 || faceMode) ? 'Ref' : 'Str'}
                  </span>
                  <input
                    type="range"
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    value={(refImages.length >= 2 || faceMode) ? ipScale : strength}
                    onChange={(e) => (refImages.length >= 2 || faceMode) ? setIpScale(Number(e.target.value)) : setStrength(Number(e.target.value))}
                    className="flex-1 h-1 accent-violet-500"
                  />
                  <span className="text-[9px] text-violet-400 w-6 text-right">
                    {((refImages.length >= 2 || faceMode) ? ipScale : strength).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-lg px-3 py-2.5 flex items-center justify-center gap-2 cursor-pointer transition-all ${
              isDragging
                ? 'border-violet-400 bg-violet-500/10 scale-[1.01]'
                : 'border-white/10 hover:border-white/20 hover:bg-white/5'
            }`}
          >
            <Upload className={`w-3.5 h-3.5 ${isDragging ? 'text-violet-400' : 'text-gray-600'}`} />
            <span className={`text-xs ${isDragging ? 'text-violet-300' : 'text-gray-600'}`}>
              {isDragging ? 'Drop images!' : 'Drop or tap to add reference images (up to 4)'}
            </span>
          </div>
        )}
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
            {refImages.length >= 2 || faceMode ? 'Blending references' : refImages.length === 1 ? 'Reimagining' : 'Generating'} with {currentModel?.name}...
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

          {/* Refinement Feedback Panel */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-500">Not satisfied?</span>
              {refinements.length > 0 && (
                <span className="text-[10px] text-violet-400">{refinements.length}/3 selected</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {REFINEMENT_CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const isActive = refinements.includes(cat.id)
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleRefinement(cat.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border transition-all ${
                      isActive
                        ? 'bg-violet-500/30 text-violet-300 border-violet-400/60'
                        : refinements.length >= 3
                        ? 'opacity-40 cursor-not-allowed bg-white/5 text-gray-500 border-white/10'
                        : colorMap[cat.color] || 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                    }`}
                    disabled={!isActive && refinements.length >= 3}
                  >
                    <Icon className="w-3 h-3" />
                    {cat.label}
                  </button>
                )
              })}
            </div>
            {refinements.length > 0 && (
              <Button
                onClick={handleRefineAndGenerate}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold py-2"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-2" />
                Refine & Regenerate
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
              <div key={item.timestamp} className="relative flex-shrink-0 group">
                <button
                  onClick={() => setResult(item)}
                  className={`w-14 h-14 rounded-md overflow-hidden border transition-all ${
                    result?.seed === item.seed && result?.model === item.model ? 'border-violet-400 ring-1 ring-violet-400/30' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <img src={item.image} alt={`Generated ${i + 1}`} className="w-full h-full object-cover" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteHistoryItem(item.timestamp)
                  }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default GeneratePanel
