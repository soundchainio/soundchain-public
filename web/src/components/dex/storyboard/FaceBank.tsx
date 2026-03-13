import React, { useRef, useCallback } from 'react'
import { UserCircle, Plus, X, Pencil } from 'lucide-react'
import type { FaceBankEntry, StoryboardAction } from './storyboardTypes'
import { MAX_FACES } from './storyboardConstants'

interface FaceBankProps {
  faces: FaceBankEntry[]
  dispatch: React.Dispatch<StoryboardAction>
}

export function FaceBank({ faces, dispatch }: FaceBankProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resizeToDataUrl = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        let { width: w, height: h } = img
        const maxDim = 768
        if (w > maxDim || h > maxDim) {
          const scale = maxDim / Math.max(w, h)
          w = Math.round(w * scale)
          h = Math.round(h * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
        URL.revokeObjectURL(img.src)
      }
      img.src = URL.createObjectURL(file)
    })
  }, [])

  const handleFiles = useCallback(
    (files: File[]) => {
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue
        if (file.size > 10 * 1024 * 1024) continue
        if (faces.length >= MAX_FACES) break

        resizeToDataUrl(file).then((dataUrl) => {
          const label = `Face ${faces.length + 1}`
          dispatch({
            type: 'ADD_FACE',
            face: {
              id: crypto.randomUUID(),
              label,
              dataUrl,
              fileName: file.name,
            },
          })
        })
      }
    },
    [faces.length, dispatch, resizeToDataUrl],
  )

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || [])
          if (files.length) handleFiles(files)
          if (fileInputRef.current) fileInputRef.current.value = ''
        }}
      />

      <div className="flex items-center gap-2">
        <UserCircle className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Face Bank</span>
        <span className="text-[10px] text-gray-600">{faces.length}/{MAX_FACES}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {faces.map((face) => (
          <div key={face.id} className="relative flex-shrink-0 group">
            <div className="w-14 h-14 rounded-lg overflow-hidden border border-violet-500/30 bg-black">
              <img src={face.dataUrl} alt={face.label} className="w-full h-full object-cover" />
            </div>
            {/* Label */}
            <div className="absolute -bottom-1 left-0 right-0 flex justify-center">
              <input
                type="text"
                value={face.label}
                onChange={(e) =>
                  dispatch({ type: 'UPDATE_FACE_LABEL', id: face.id, label: e.target.value })
                }
                className="text-[9px] text-center bg-black/80 text-violet-300 border border-violet-500/20 rounded px-1 py-0 w-14 focus:outline-none focus:border-violet-400"
                maxLength={12}
              />
            </div>
            {/* Remove button */}
            <button
              onClick={() => dispatch({ type: 'REMOVE_FACE', id: face.id })}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black/80 text-white hover:bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}

        {faces.length < MAX_FACES && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-14 h-14 flex-shrink-0 rounded-lg border border-dashed border-white/10 hover:border-violet-400/50 hover:bg-violet-500/5 flex flex-col items-center justify-center gap-0.5 transition-all"
          >
            <Plus className="w-4 h-4 text-gray-600" />
            <span className="text-[8px] text-gray-600">Add Face</span>
          </button>
        )}
      </div>
    </div>
  )
}
