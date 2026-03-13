import React from 'react'
import { Plus, Loader2, Check, AlertCircle, ImageIcon, Trash2 } from 'lucide-react'
import type { StoryboardFrame, StoryboardAction } from './storyboardTypes'
import { MAX_FRAMES } from './storyboardConstants'

interface FrameStripProps {
  frames: StoryboardFrame[]
  selectedFrameId: string | null
  dispatch: React.Dispatch<StoryboardAction>
  generating: boolean
}

const statusIcon = (status: StoryboardFrame['status']) => {
  switch (status) {
    case 'generating':
      return <Loader2 className="w-3 h-3 text-violet-400 animate-spin" />
    case 'done':
      return <Check className="w-3 h-3 text-green-400" />
    case 'error':
      return <AlertCircle className="w-3 h-3 text-red-400" />
    default:
      return null
  }
}

export function FrameStrip({ frames, selectedFrameId, dispatch, generating }: FrameStripProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Frames</span>
        <span className="text-[10px] text-gray-600">{frames.length}/{MAX_FRAMES}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {frames.map((frame, i) => {
          const isSelected = frame.id === selectedFrameId
          return (
            <div key={frame.id} className="relative flex-shrink-0 group">
              <button
                onClick={() => dispatch({ type: 'SET_SELECTED_FRAME', id: frame.id })}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  isSelected
                    ? 'border-violet-400 ring-1 ring-violet-400/30'
                    : 'border-white/10 hover:border-white/30'
                } bg-neutral-900 flex items-center justify-center`}
              >
                {frame.result?.image ? (
                  <img
                    src={frame.result.image}
                    alt={`Frame ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] text-gray-600">F{i + 1}</span>
                )}
              </button>

              {/* Status badge */}
              <div className="absolute -top-1 -left-1">
                {statusIcon(frame.status)}
              </div>

              {/* Frame number */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                <span className="text-[8px] bg-black/80 text-gray-400 px-1 rounded">
                  {i + 1}
                </span>
              </div>

              {/* Remove button */}
              {frames.length > 1 && !generating && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    dispatch({ type: 'REMOVE_FRAME', id: frame.id })
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black/80 text-white hover:bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          )
        })}

        {/* Add frame button */}
        {frames.length < MAX_FRAMES && !generating && (
          <button
            onClick={() => dispatch({ type: 'ADD_FRAME' })}
            className="w-16 h-16 flex-shrink-0 rounded-lg border border-dashed border-white/10 hover:border-violet-400/50 hover:bg-violet-500/5 flex flex-col items-center justify-center gap-0.5 transition-all"
          >
            <Plus className="w-4 h-4 text-gray-600" />
            <span className="text-[8px] text-gray-600">Add</span>
          </button>
        )}
      </div>
    </div>
  )
}
