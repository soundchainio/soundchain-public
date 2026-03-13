import React, { useCallback } from 'react'
import { Sparkles, ChevronDown, ChevronUp, Cpu, Zap, Clock, Check, ScanFace, Sliders } from 'lucide-react'
import { Button } from 'components/ui/button'
import type { StoryboardFrame, StoryboardAction, FaceBankEntry } from './storyboardTypes'
import { MODELS, STYLE_PRESETS, DEFAULT_NEGATIVE, colorMap, activeColorMap } from './storyboardConstants'

interface FrameEditorProps {
  frame: StoryboardFrame
  faceBank: FaceBankEntry[]
  dispatch: React.Dispatch<StoryboardAction>
  onGenerate: (frame: StoryboardFrame) => void
  generating: boolean
}

export function FrameEditor({ frame, faceBank, dispatch, onGenerate, generating }: FrameEditorProps) {
  const [showNeg, setShowNeg] = React.useState(false)
  const [showSettings, setShowSettings] = React.useState(false)

  const update = useCallback(
    (changes: Partial<StoryboardFrame>) => {
      dispatch({ type: 'UPDATE_FRAME', id: frame.id, changes })
    },
    [dispatch, frame.id],
  )

  const toggleFace = useCallback(
    (faceId: string) => {
      const has = frame.assignedFaces.includes(faceId)
      update({
        assignedFaces: has
          ? frame.assignedFaces.filter((id) => id !== faceId)
          : [...frame.assignedFaces, faceId],
      })
    },
    [frame.assignedFaces, update],
  )

  const applyPreset = useCallback(
    (preset: typeof STYLE_PRESETS[number]) => {
      const model = MODELS.find((m) => m.id === frame.model)
      const maxW = model?.maxWidth || 1024
      const maxH = model?.maxHeight || 1024
      update({
        preset: frame.preset === preset.label ? null : preset.label,
        width: Math.min(preset.width, maxW),
        height: Math.min(preset.height, maxH),
        negativePrompt: preset.negative + ', ' + DEFAULT_NEGATIVE,
      })
    },
    [frame.model, frame.preset, update],
  )

  const selectModel = useCallback(
    (modelId: string) => {
      const model = MODELS.find((m) => m.id === modelId)
      if (!model) return
      update({
        model: modelId,
        steps: model.defaultSteps,
        width: model.defaultWidth,
        height: model.defaultHeight,
        cfg: model.defaultCfg,
      })
    },
    [update],
  )

  const currentModel = MODELS.find((m) => m.id === frame.model)

  return (
    <div className="space-y-3 p-3 bg-white/5 rounded-lg border border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-xs text-violet-400 font-medium">
          Frame {frame.order + 1}
        </span>
        {frame.status === 'done' && frame.result?.time_seconds && (
          <span className="text-[10px] text-gray-600">{frame.result.time_seconds}s</span>
        )}
      </div>

      {/* Prompt */}
      <textarea
        value={frame.prompt}
        onChange={(e) => update({ prompt: e.target.value })}
        placeholder="Describe this frame..."
        className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
        rows={2}
        disabled={generating}
      />

      {/* Face assignment */}
      {faceBank.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <ScanFace className="w-3 h-3 text-gray-500" />
            <span className="text-[10px] text-gray-500">Assign faces:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {faceBank.map((face) => {
              const assigned = frame.assignedFaces.includes(face.id)
              return (
                <button
                  key={face.id}
                  onClick={() => toggleFace(face.id)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-all ${
                    assigned
                      ? 'bg-violet-500/30 text-violet-300 border-violet-400/50'
                      : 'bg-white/5 text-gray-500 border-white/10 hover:border-violet-400/30'
                  }`}
                  disabled={generating}
                >
                  <img
                    src={face.dataUrl}
                    alt={face.label}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                  {face.label}
                  {assigned && <Check className="w-2.5 h-2.5" />}
                </button>
              )
            })}
          </div>

          {/* IP-Adapter scale */}
          {frame.assignedFaces.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-gray-500">Face strength</span>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={frame.ipScale}
                onChange={(e) => update({ ipScale: Number(e.target.value) })}
                className="flex-1 h-1 accent-violet-500"
                disabled={generating}
              />
              <span className="text-[9px] text-violet-400 w-6 text-right">
                {frame.ipScale.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Style Presets */}
      <div className="flex flex-wrap gap-1">
        {STYLE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => applyPreset(preset)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
              frame.preset === preset.label
                ? activeColorMap[preset.color]
                : colorMap[preset.color]
            }`}
            disabled={generating}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Model Picker (compact) */}
      <div className="flex gap-1.5">
        {MODELS.map((model) => (
          <button
            key={model.id}
            onClick={() => selectModel(model.id)}
            className={`flex-1 px-2 py-1.5 rounded-lg border text-left transition-all ${
              frame.model === model.id
                ? 'bg-violet-500/20 border-violet-400/50'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
            disabled={generating}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-medium ${
                frame.model === model.id ? 'text-violet-300' : 'text-white'
              }`}>
                {model.name}
              </span>
              {model.category === 'fast' ? (
                <Zap className="w-2.5 h-2.5 text-yellow-500" />
              ) : (
                <Clock className="w-2.5 h-2.5 text-gray-600" />
              )}
            </div>
            <span className="text-[9px] text-gray-600">{model.estimate}</span>
          </button>
        ))}
      </div>

      {/* Caption for speech bubble */}
      <input
        type="text"
        value={frame.caption}
        onChange={(e) => update({ caption: e.target.value })}
        placeholder="Speech bubble text (optional)"
        className="w-full bg-neutral-900 border border-white/10 rounded px-2 py-1.5 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
        disabled={generating}
      />

      {/* Negative Prompt (collapsible) */}
      <button
        onClick={() => setShowNeg(!showNeg)}
        className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
      >
        {showNeg ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
        Negative prompt
      </button>
      {showNeg && (
        <textarea
          value={frame.negativePrompt}
          onChange={(e) => update({ negativePrompt: e.target.value })}
          className="w-full bg-neutral-900 border border-white/10 rounded px-2 py-1.5 text-white text-[11px] placeholder-gray-600 resize-none focus:outline-none focus:border-violet-500/50"
          rows={2}
          disabled={generating}
        />
      )}

      {/* Advanced Settings (collapsible) */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
      >
        {showSettings ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
        Advanced settings
      </button>
      {showSettings && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[9px] text-gray-600 uppercase">Width</label>
            <input
              type="number"
              value={frame.width}
              onChange={(e) => update({ width: Number(e.target.value) })}
              min={256}
              max={currentModel?.maxWidth || 1024}
              step={64}
              className="w-full mt-0.5 bg-neutral-900 border border-white/10 rounded px-1.5 py-0.5 text-white text-[11px]"
              disabled={generating}
            />
          </div>
          <div>
            <label className="text-[9px] text-gray-600 uppercase">Height</label>
            <input
              type="number"
              value={frame.height}
              onChange={(e) => update({ height: Number(e.target.value) })}
              min={256}
              max={currentModel?.maxHeight || 1024}
              step={64}
              className="w-full mt-0.5 bg-neutral-900 border border-white/10 rounded px-1.5 py-0.5 text-white text-[11px]"
              disabled={generating}
            />
          </div>
          <div>
            <label className="text-[9px] text-gray-600 uppercase">Steps</label>
            <input
              type="number"
              value={frame.steps}
              onChange={(e) => update({ steps: Number(e.target.value) })}
              min={1}
              max={50}
              className="w-full mt-0.5 bg-neutral-900 border border-white/10 rounded px-1.5 py-0.5 text-white text-[11px]"
              disabled={generating}
            />
          </div>
          <div>
            <label className="text-[9px] text-gray-600 uppercase">Seed</label>
            <input
              type="number"
              value={frame.seed}
              onChange={(e) => update({ seed: Number(e.target.value) })}
              className="w-full mt-0.5 bg-neutral-900 border border-white/10 rounded px-1.5 py-0.5 text-white text-[11px]"
              disabled={generating}
            />
            <span className="text-[8px] text-gray-700">-1 = random</span>
          </div>
          <div>
            <label className="text-[9px] text-gray-600 uppercase">CFG</label>
            <input
              type="number"
              value={frame.cfg}
              onChange={(e) => update({ cfg: Number(e.target.value) })}
              min={0}
              max={20}
              step={0.5}
              className="w-full mt-0.5 bg-neutral-900 border border-white/10 rounded px-1.5 py-0.5 text-white text-[11px]"
              disabled={generating}
            />
          </div>
          <div>
            <label className="text-[9px] text-gray-600 uppercase">Duration (s)</label>
            <input
              type="number"
              value={frame.duration}
              onChange={(e) => update({ duration: Number(e.target.value) })}
              min={2}
              max={5}
              className="w-full mt-0.5 bg-neutral-900 border border-white/10 rounded px-1.5 py-0.5 text-white text-[11px]"
              disabled={generating}
            />
          </div>
        </div>
      )}

      {/* Generate single frame button */}
      <Button
        onClick={() => onGenerate(frame)}
        disabled={!frame.prompt.trim() || generating}
        className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold py-1.5 text-xs disabled:opacity-40"
      >
        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
        Generate Frame
      </Button>

      {/* Error */}
      {frame.error && (
        <p className="text-[11px] text-red-400">{frame.error}</p>
      )}
    </div>
  )
}
