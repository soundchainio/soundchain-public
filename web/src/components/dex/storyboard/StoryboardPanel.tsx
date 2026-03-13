import React from 'react'
import { Loader2, X, Play, Zap, Film, ImageIcon } from 'lucide-react'
import { Button } from 'components/ui/button'
import { useStoryboardState } from './useStoryboardState'
import { useGenerationQueue } from './useGenerationQueue'
import { FaceBank } from './FaceBank'
import { FrameStrip } from './FrameStrip'
import { FrameEditor } from './FrameEditor'
import { ComicRenderer } from './ComicRenderer'
import { VideoExporter } from './VideoExporter'

interface StoryboardPanelProps {
  onShareToStory?: (imageDataUrl: string) => void
}

export function StoryboardPanel({ onShareToStory }: StoryboardPanelProps) {
  const { state, dispatch, selectedFrame, completedFrames, clearAll } = useStoryboardState()
  const { progress, generateFrame, generateAll, cancel } = useGenerationQueue(
    state.frames,
    state.faceBank,
    dispatch,
  )

  const [showComicExport, setShowComicExport] = React.useState(false)
  const [showVideoExport, setShowVideoExport] = React.useState(false)

  const framesWithPrompt = state.frames.filter((f) => f.prompt.trim())
  const pendingFrames = framesWithPrompt.filter((f) => f.status !== 'done')

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      {/* Tip */}
      <div className="flex items-start gap-2 p-2 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
        <Zap className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-cyan-400/80">
          SDXL Turbo recommended for storyboards (~30-60s/frame). Upload faces in the Face Bank, then assign them per frame.
        </p>
      </div>

      {/* Face Bank */}
      <FaceBank faces={state.faceBank} dispatch={dispatch} />

      {/* Frame Strip */}
      <FrameStrip
        frames={state.frames}
        selectedFrameId={state.selectedFrameId ?? selectedFrame?.id ?? null}
        dispatch={dispatch}
        generating={progress.running}
      />

      {/* Frame Editor */}
      {selectedFrame && (
        <FrameEditor
          frame={selectedFrame}
          faceBank={state.faceBank}
          dispatch={dispatch}
          onGenerate={generateFrame}
          generating={progress.running}
        />
      )}

      {/* Generate All / Cancel */}
      {progress.running ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
              <span className="text-sm text-gray-300">
                Frame {progress.currentIndex + 1}/{progress.totalCount}
              </span>
            </div>
            <span className="text-xs text-gray-500">{formatTime(progress.elapsedSeconds)} elapsed</span>
          </div>
          <Button
            onClick={cancel}
            className="w-full bg-red-600/80 hover:bg-red-600 text-white font-bold py-2"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      ) : (
        framesWithPrompt.length >= 2 && pendingFrames.length > 0 && (
          <Button
            onClick={() => generateAll()}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold py-2.5"
          >
            <Play className="w-4 h-4 mr-2" />
            Generate All ({pendingFrames.length} frame{pendingFrames.length > 1 ? 's' : ''})
          </Button>
        )
      )}

      {/* Export buttons — visible when 2+ frames done */}
      {completedFrames.length >= 2 && !progress.running && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowComicExport(true)}
            className="flex-1 border-white/10 text-white hover:bg-white/10"
          >
            <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
            Comic Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVideoExport(true)}
            className="flex-1 border-white/10 text-white hover:bg-white/10"
          >
            <Film className="w-3.5 h-3.5 mr-1.5" />
            Video Export
          </Button>
        </div>
      )}

      {/* Clear all */}
      {state.frames.length > 1 && !progress.running && (
        <button
          onClick={clearAll}
          className="text-[10px] text-gray-600 hover:text-red-400 transition-colors"
        >
          Clear storyboard
        </button>
      )}

      {/* Comic Export Modal */}
      {showComicExport && (
        <ComicRenderer
          frames={completedFrames}
          onClose={() => setShowComicExport(false)}
          onShareToStory={onShareToStory}
        />
      )}

      {/* Video Export Modal */}
      {showVideoExport && (
        <VideoExporter
          frames={completedFrames}
          onClose={() => setShowVideoExport(false)}
          onShareToStory={onShareToStory}
        />
      )}
    </div>
  )
}

export default StoryboardPanel
