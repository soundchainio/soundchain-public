export interface GenerateResult {
  image: string
  model: string
  prompt: string
  seed: number
  time_seconds?: number
  width?: number
  height?: number
  steps?: number
}

export interface FaceBankEntry {
  id: string
  label: string
  dataUrl: string
  fileName: string
}

export interface StoryboardFrame {
  id: string
  order: number
  prompt: string
  negativePrompt: string
  preset: string | null
  assignedFaces: string[]
  model: string
  width: number
  height: number
  steps: number
  cfg: number
  seed: number
  ipScale: number
  duration: number
  caption: string
  status: 'empty' | 'pending' | 'generating' | 'done' | 'error'
  result: GenerateResult | null
  error: string | null
}

export type ComicLayout = 'strip' | '2x2' | '2x3' | '3x2'

export type StoryboardMode = 'single' | 'storyboard' | 'animate'

export type StoryboardAction =
  | { type: 'ADD_FACE'; face: FaceBankEntry }
  | { type: 'REMOVE_FACE'; id: string }
  | { type: 'UPDATE_FACE_LABEL'; id: string; label: string }
  | { type: 'ADD_FRAME' }
  | { type: 'REMOVE_FRAME'; id: string }
  | { type: 'UPDATE_FRAME'; id: string; changes: Partial<StoryboardFrame> }
  | { type: 'REORDER_FRAMES'; fromIndex: number; toIndex: number }
  | { type: 'SET_SELECTED_FRAME'; id: string | null }
  | { type: 'FRAME_GENERATING'; id: string }
  | { type: 'FRAME_DONE'; id: string; result: GenerateResult }
  | { type: 'FRAME_ERROR'; id: string; error: string }
  | { type: 'RESET_FRAME'; id: string }
  | { type: 'LOAD_STATE'; state: StoryboardState }

export interface StoryboardState {
  faceBank: FaceBankEntry[]
  frames: StoryboardFrame[]
  selectedFrameId: string | null
}
