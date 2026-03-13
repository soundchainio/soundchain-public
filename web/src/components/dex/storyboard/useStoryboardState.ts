import { useReducer, useEffect, useRef, useCallback } from 'react'
import type { StoryboardState, StoryboardAction, StoryboardFrame } from './storyboardTypes'
import { MODELS, LOCALSTORAGE_KEY } from './storyboardConstants'

function createEmptyFrame(order: number): StoryboardFrame {
  const model = MODELS[0]
  return {
    id: crypto.randomUUID(),
    order,
    prompt: '',
    negativePrompt: '',
    preset: null,
    assignedFaces: [],
    model: model.id,
    width: model.defaultWidth,
    height: model.defaultHeight,
    steps: model.defaultSteps,
    cfg: model.defaultCfg,
    seed: -1,
    ipScale: 0.6,
    duration: 3,
    caption: '',
    status: 'empty',
    result: null,
    error: null,
  }
}

const initialState: StoryboardState = {
  faceBank: [],
  frames: [createEmptyFrame(0)],
  selectedFrameId: null,
}

function storyboardReducer(state: StoryboardState, action: StoryboardAction): StoryboardState {
  switch (action.type) {
    case 'ADD_FACE':
      return { ...state, faceBank: [...state.faceBank, action.face] }

    case 'REMOVE_FACE':
      return {
        ...state,
        faceBank: state.faceBank.filter((f) => f.id !== action.id),
        frames: state.frames.map((frame) => ({
          ...frame,
          assignedFaces: frame.assignedFaces.filter((fid) => fid !== action.id),
        })),
      }

    case 'UPDATE_FACE_LABEL':
      return {
        ...state,
        faceBank: state.faceBank.map((f) =>
          f.id === action.id ? { ...f, label: action.label } : f
        ),
      }

    case 'ADD_FRAME': {
      const newOrder = state.frames.length
      if (newOrder >= 12) return state
      const newFrame = createEmptyFrame(newOrder)
      return {
        ...state,
        frames: [...state.frames, newFrame],
        selectedFrameId: newFrame.id,
      }
    }

    case 'REMOVE_FRAME': {
      if (state.frames.length <= 1) return state
      const filtered = state.frames.filter((f) => f.id !== action.id)
      const reordered = filtered.map((f, i) => ({ ...f, order: i }))
      return {
        ...state,
        frames: reordered,
        selectedFrameId:
          state.selectedFrameId === action.id
            ? reordered[0]?.id ?? null
            : state.selectedFrameId,
      }
    }

    case 'UPDATE_FRAME':
      return {
        ...state,
        frames: state.frames.map((f) =>
          f.id === action.id ? { ...f, ...action.changes } : f
        ),
      }

    case 'REORDER_FRAMES': {
      const arr = [...state.frames]
      const [moved] = arr.splice(action.fromIndex, 1)
      arr.splice(action.toIndex, 0, moved)
      return { ...state, frames: arr.map((f, i) => ({ ...f, order: i })) }
    }

    case 'SET_SELECTED_FRAME':
      return { ...state, selectedFrameId: action.id }

    case 'FRAME_GENERATING':
      return {
        ...state,
        frames: state.frames.map((f) =>
          f.id === action.id ? { ...f, status: 'generating', error: null } : f
        ),
      }

    case 'FRAME_DONE':
      return {
        ...state,
        frames: state.frames.map((f) =>
          f.id === action.id ? { ...f, status: 'done', result: action.result, error: null } : f
        ),
      }

    case 'FRAME_ERROR':
      return {
        ...state,
        frames: state.frames.map((f) =>
          f.id === action.id ? { ...f, status: 'error', error: action.error } : f
        ),
      }

    case 'RESET_FRAME':
      return {
        ...state,
        frames: state.frames.map((f) =>
          f.id === action.id ? { ...f, status: 'empty', result: null, error: null } : f
        ),
      }

    case 'LOAD_STATE':
      return action.state

    default:
      return state
  }
}

function serializeForStorage(state: StoryboardState) {
  return {
    faceBank: state.faceBank,
    frames: state.frames.map((f) => ({
      ...f,
      // Don't persist generated images (too large for localStorage)
      result: null,
      status: f.status === 'done' ? 'empty' as const : f.status,
      error: null,
    })),
    selectedFrameId: state.selectedFrameId,
  }
}

export function useStoryboardState() {
  const [state, dispatch] = useReducer(storyboardReducer, initialState, (init) => {
    if (typeof window === 'undefined') return init
    try {
      const saved = localStorage.getItem(LOCALSTORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as StoryboardState
        if (parsed.frames?.length && parsed.faceBank) {
          return {
            ...parsed,
            // Reset any stale generating states
            frames: parsed.frames.map((f) => ({
              ...f,
              status: 'empty' as const,
              result: null,
              error: null,
            })),
          }
        }
      }
    } catch {}
    return init
  })

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced localStorage persistence
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(serializeForStorage(state)))
      } catch {}
    }, 500)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [state])

  const selectedFrame = state.frames.find((f) => f.id === state.selectedFrameId) ?? state.frames[0] ?? null

  const completedFrames = state.frames.filter((f) => f.status === 'done' && f.result)

  const clearAll = useCallback(() => {
    try { localStorage.removeItem(LOCALSTORAGE_KEY) } catch {}
    dispatch({ type: 'LOAD_STATE', state: initialState })
  }, [])

  return { state, dispatch, selectedFrame, completedFrames, clearAll }
}
