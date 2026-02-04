import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Type, Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  Palette, Sparkles, Trash2, Copy, Layers, Plus, GripVertical,
  Hash, ChevronDown
} from 'lucide-react'

// Text effect presets - Cyberpunk/SoundChain style
const TEXT_EFFECTS = [
  { id: 'none', name: 'Clean', className: '' },
  { id: 'neon-cyan', name: 'Neon Cyan', className: 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)] drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]' },
  { id: 'neon-purple', name: 'Neon Purple', className: 'text-purple-400 drop-shadow-[0_0_10px_rgba(192,132,252,0.8)] drop-shadow-[0_0_20px_rgba(192,132,252,0.5)]' },
  { id: 'neon-pink', name: 'Neon Pink', className: 'text-pink-400 drop-shadow-[0_0_10px_rgba(244,114,182,0.8)] drop-shadow-[0_0_20px_rgba(244,114,182,0.5)]' },
  { id: 'neon-green', name: 'Neon Green', className: 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)] drop-shadow-[0_0_20px_rgba(74,222,128,0.5)]' },
  { id: 'gold', name: 'Gold', className: 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' },
  { id: 'fire', name: 'Fire', className: 'text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.8)] animate-pulse' },
  { id: 'ice', name: 'Ice', className: 'text-blue-300 drop-shadow-[0_0_10px_rgba(147,197,253,0.8)]' },
  { id: 'glitch', name: 'Glitch', className: 'text-red-500 animate-pulse [text-shadow:2px_0_cyan,-2px_0_magenta]' },
  { id: 'outline', name: 'Outline', className: 'text-transparent [-webkit-text-stroke:2px_white]' },
  { id: 'shadow', name: 'Shadow', className: 'text-white [text-shadow:4px_4px_0_rgba(0,0,0,0.8)]' },
]

// Font options
const FONTS = [
  { id: 'sans', name: 'Sans', className: 'font-sans' },
  { id: 'mono', name: 'Mono', className: 'font-mono' },
  { id: 'serif', name: 'Serif', className: 'font-serif' },
  { id: 'bold', name: 'Bold', className: 'font-sans font-black' },
  { id: 'condensed', name: 'Condensed', className: 'font-sans tracking-tighter font-bold' },
  { id: 'wide', name: 'Wide', className: 'font-sans tracking-widest uppercase' },
]

// Color palette
const COLORS = [
  '#FFFFFF', '#000000', '#22D3EE', '#A855F7', '#EC4899',
  '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6',
  '#F472B6', '#34D399', '#FBBF24', '#FB7185', '#60A5FA',
]

// Background options for text
const BACKGROUNDS = [
  { id: 'none', name: 'None', className: '' },
  { id: 'solid-black', name: 'Black', className: 'bg-black/80 px-3 py-1 rounded-lg' },
  { id: 'solid-white', name: 'White', className: 'bg-white/90 px-3 py-1 rounded-lg' },
  { id: 'blur', name: 'Blur', className: 'bg-black/40 backdrop-blur-sm px-3 py-1 rounded-lg' },
  { id: 'gradient-cyan', name: 'Cyan Grad', className: 'bg-gradient-to-r from-cyan-500/80 to-purple-500/80 px-3 py-1 rounded-lg' },
  { id: 'gradient-fire', name: 'Fire Grad', className: 'bg-gradient-to-r from-orange-500/80 to-red-500/80 px-3 py-1 rounded-lg' },
]

export interface TextLayer {
  id: string
  text: string
  x: number // percentage 0-100
  y: number // percentage 0-100
  fontSize: number // px
  fontId: string
  color: string
  effectId: string
  backgroundId: string
  align: 'left' | 'center' | 'right'
  isBold: boolean
  isItalic: boolean
  rotation: number // degrees
}

interface StoryTextOverlayProps {
  layers: TextLayer[]
  onLayersChange: (layers: TextLayer[]) => void
  containerRef: React.RefObject<HTMLDivElement>
  isEditing: boolean
  onEditingChange: (editing: boolean) => void
}

// Parse hashtags from text and style them
const renderTextWithHashtags = (text: string, baseColor: string) => {
  const parts = text.split(/(#\w+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return (
        <span key={i} className="text-cyan-400 font-semibold hover:text-cyan-300 cursor-pointer">
          {part}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

// Single draggable text layer
const DraggableText = ({
  layer,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  containerRef,
}: {
  layer: TextLayer
  isSelected: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<TextLayer>) => void
  onDelete: () => void
  containerRef: React.RefObject<HTMLDivElement>
}) => {
  const textRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, layerX: 0, layerY: 0 })

  const font = FONTS.find(f => f.id === layer.fontId) || FONTS[0]
  const effect = TEXT_EFFECTS.find(e => e.id === layer.effectId) || TEXT_EFFECTS[0]
  const background = BACKGROUNDS.find(b => b.id === layer.backgroundId) || BACKGROUNDS[0]

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return
    e.preventDefault()
    e.stopPropagation()
    onSelect()
    setIsDragging(true)

    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      layerX: layer.x,
      layerY: layer.y,
    }
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return

    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const deltaX = ((e.clientX - dragStart.current.x) / rect.width) * 100
    const deltaY = ((e.clientY - dragStart.current.y) / rect.height) * 100

    const newX = Math.max(0, Math.min(100, dragStart.current.layerX + deltaX))
    const newY = Math.max(0, Math.min(100, dragStart.current.layerY + deltaY))

    onUpdate({ x: newX, y: newY })
  }, [isDragging, containerRef, onUpdate])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Touch support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isEditing) return
    e.stopPropagation()
    onSelect()
    setIsDragging(true)

    const touch = e.touches[0]
    const container = containerRef.current
    if (!container) return

    dragStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      layerX: layer.x,
      layerY: layer.y,
    }
  }

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return

    const touch = e.touches[0]
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const deltaX = ((touch.clientX - dragStart.current.x) / rect.width) * 100
    const deltaY = ((touch.clientY - dragStart.current.y) / rect.height) * 100

    const newX = Math.max(0, Math.min(100, dragStart.current.layerX + deltaX))
    const newY = Math.max(0, Math.min(100, dragStart.current.layerY + deltaY))

    onUpdate({ x: newX, y: newY })
  }, [isDragging, containerRef, onUpdate])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('touchmove', handleTouchMove)
      window.addEventListener('touchend', handleTouchEnd)
      return () => {
        window.removeEventListener('touchmove', handleTouchMove)
        window.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, handleTouchMove, handleTouchEnd])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ text: e.target.value })
  }

  const handleTextBlur = () => {
    setIsEditing(false)
    if (!layer.text.trim()) {
      onDelete()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      setIsEditing(false)
    }
    if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  return (
    <div
      ref={textRef}
      className={`absolute cursor-move select-none transition-transform ${isDragging ? 'scale-105' : ''}`}
      style={{
        left: `${layer.x}%`,
        top: `${layer.y}%`,
        transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
        fontSize: `${layer.fontSize}px`,
        color: layer.color,
        textAlign: layer.align,
        zIndex: isSelected ? 50 : 10,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {/* Selection border */}
      {isSelected && !isEditing && (
        <div className="absolute -inset-2 border-2 border-cyan-500 border-dashed rounded-lg pointer-events-none">
          {/* Delete button - MUST stop all pointer/mouse events to prevent drag */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            onMouseDown={(e) => { e.stopPropagation(); }}
            onPointerDown={(e) => { e.stopPropagation(); }}
            onTouchStart={(e) => { e.stopPropagation(); }}
            className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors pointer-events-auto z-50"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          {/* Drag handle */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-cyan-500 rounded text-[10px] text-white font-medium">
            Drag to move
          </div>
        </div>
      )}

      {/* Text content */}
      <div className={`${font.className} ${effect.className} ${background.className} ${layer.isBold ? 'font-bold' : ''} ${layer.isItalic ? 'italic' : ''} whitespace-pre-wrap`}>
        {isEditing ? (
          <textarea
            value={layer.text}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className="bg-transparent border-none outline-none resize-none min-w-[100px] text-center"
            style={{
              color: 'inherit',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              fontWeight: 'inherit',
              fontStyle: 'inherit',
            }}
            rows={layer.text.split('\n').length || 1}
          />
        ) : (
          renderTextWithHashtags(layer.text || 'Double-tap to edit', layer.color)
        )}
      </div>
    </div>
  )
}

// Text style toolbar
const TextStyleToolbar = ({
  layer,
  onUpdate,
}: {
  layer: TextLayer
  onUpdate: (updates: Partial<TextLayer>) => void
}) => {
  const [showEffects, setShowEffects] = useState(false)
  const [showFonts, setShowFonts] = useState(false)
  const [showColors, setShowColors] = useState(false)
  const [showBackgrounds, setShowBackgrounds] = useState(false)

  const currentEffect = TEXT_EFFECTS.find(e => e.id === layer.effectId) || TEXT_EFFECTS[0]
  const currentFont = FONTS.find(f => f.id === layer.fontId) || FONTS[0]
  const currentBg = BACKGROUNDS.find(b => b.id === layer.backgroundId) || BACKGROUNDS[0]

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-black/80 backdrop-blur-sm rounded-xl border border-white/10">
      {/* Font size */}
      <div className="flex items-center gap-1 px-2">
        <button
          onClick={() => onUpdate({ fontSize: Math.max(12, layer.fontSize - 4) })}
          className="w-6 h-6 rounded bg-white/10 text-white/70 hover:bg-white/20 text-xs font-bold"
        >
          A-
        </button>
        <span className="text-white/50 text-xs w-8 text-center">{layer.fontSize}</span>
        <button
          onClick={() => onUpdate({ fontSize: Math.min(72, layer.fontSize + 4) })}
          className="w-6 h-6 rounded bg-white/10 text-white/70 hover:bg-white/20 text-sm font-bold"
        >
          A+
        </button>
      </div>

      <div className="w-px h-6 bg-white/20" />

      {/* Bold/Italic */}
      <button
        onClick={() => onUpdate({ isBold: !layer.isBold })}
        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
          layer.isBold ? 'bg-cyan-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
        }`}
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => onUpdate({ isItalic: !layer.isItalic })}
        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
          layer.isItalic ? 'bg-cyan-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
        }`}
      >
        <Italic className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-white/20" />

      {/* Alignment */}
      <button
        onClick={() => onUpdate({ align: 'left' })}
        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
          layer.align === 'left' ? 'bg-cyan-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
        }`}
      >
        <AlignLeft className="w-4 h-4" />
      </button>
      <button
        onClick={() => onUpdate({ align: 'center' })}
        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
          layer.align === 'center' ? 'bg-cyan-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
        }`}
      >
        <AlignCenter className="w-4 h-4" />
      </button>
      <button
        onClick={() => onUpdate({ align: 'right' })}
        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
          layer.align === 'right' ? 'bg-cyan-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
        }`}
      >
        <AlignRight className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-white/20" />

      {/* Color picker */}
      <div className="relative">
        <button
          onClick={() => { setShowColors(!showColors); setShowEffects(false); setShowFonts(false); setShowBackgrounds(false); }}
          className="w-8 h-8 rounded flex items-center justify-center bg-white/10 text-white/70 hover:bg-white/20"
          style={{ color: layer.color }}
        >
          <Palette className="w-4 h-4" />
        </button>
        {showColors && (
          <div className="absolute bottom-full left-0 mb-2 p-2 bg-black/90 backdrop-blur-sm rounded-lg border border-white/10 grid grid-cols-5 gap-1 z-50">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => { onUpdate({ color }); setShowColors(false); }}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  layer.color === color ? 'border-cyan-400 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Font picker */}
      <div className="relative">
        <button
          onClick={() => { setShowFonts(!showFonts); setShowEffects(false); setShowColors(false); setShowBackgrounds(false); }}
          className="h-8 px-2 rounded flex items-center gap-1 bg-white/10 text-white/70 hover:bg-white/20 text-xs"
        >
          <Type className="w-3 h-3" />
          <span className={currentFont.className}>{currentFont.name}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        {showFonts && (
          <div className="absolute bottom-full left-0 mb-2 p-1 bg-black/90 backdrop-blur-sm rounded-lg border border-white/10 z-50 min-w-[120px]">
            {FONTS.map(font => (
              <button
                key={font.id}
                onClick={() => { onUpdate({ fontId: font.id }); setShowFonts(false); }}
                className={`w-full px-3 py-1.5 text-left text-sm rounded transition-colors ${font.className} ${
                  layer.fontId === font.id ? 'bg-cyan-500 text-white' : 'text-white/70 hover:bg-white/10'
                }`}
              >
                {font.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Effects picker */}
      <div className="relative">
        <button
          onClick={() => { setShowEffects(!showEffects); setShowFonts(false); setShowColors(false); setShowBackgrounds(false); }}
          className="h-8 px-2 rounded flex items-center gap-1 bg-white/10 text-white/70 hover:bg-white/20 text-xs"
        >
          <Sparkles className="w-3 h-3" />
          <span>{currentEffect.name}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        {showEffects && (
          <div className="absolute bottom-full left-0 mb-2 p-1 bg-black/90 backdrop-blur-sm rounded-lg border border-white/10 z-50 min-w-[140px]">
            {TEXT_EFFECTS.map(effect => (
              <button
                key={effect.id}
                onClick={() => { onUpdate({ effectId: effect.id }); setShowEffects(false); }}
                className={`w-full px-3 py-1.5 text-left text-sm rounded transition-colors ${
                  layer.effectId === effect.id ? 'bg-cyan-500 text-white' : 'text-white/70 hover:bg-white/10'
                }`}
              >
                <span className={effect.className}>{effect.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Background picker */}
      <div className="relative">
        <button
          onClick={() => { setShowBackgrounds(!showBackgrounds); setShowEffects(false); setShowFonts(false); setShowColors(false); }}
          className="h-8 px-2 rounded flex items-center gap-1 bg-white/10 text-white/70 hover:bg-white/20 text-xs"
        >
          <Layers className="w-3 h-3" />
          <span>{currentBg.name}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        {showBackgrounds && (
          <div className="absolute bottom-full left-0 mb-2 p-1 bg-black/90 backdrop-blur-sm rounded-lg border border-white/10 z-50 min-w-[120px]">
            {BACKGROUNDS.map(bg => (
              <button
                key={bg.id}
                onClick={() => { onUpdate({ backgroundId: bg.id }); setShowBackgrounds(false); }}
                className={`w-full px-3 py-1.5 text-left text-sm rounded transition-colors ${
                  layer.backgroundId === bg.id ? 'bg-cyan-500 text-white' : 'text-white/70 hover:bg-white/10'
                }`}
              >
                {bg.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Main component
export const StoryTextOverlay = ({
  layers,
  onLayersChange,
  containerRef,
  isEditing,
  onEditingChange,
}: StoryTextOverlayProps) => {
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)

  const selectedLayer = layers.find(l => l.id === selectedLayerId)

  const createNewLayer = () => {
    const newLayer: TextLayer = {
      id: `text-${Date.now()}`,
      text: '',
      x: 50,
      y: 50,
      fontSize: 24,
      fontId: 'sans',
      color: '#FFFFFF',
      effectId: 'none',
      backgroundId: 'none',
      align: 'center',
      isBold: false,
      isItalic: false,
      rotation: 0,
    }
    onLayersChange([...layers, newLayer])
    setSelectedLayerId(newLayer.id)
    onEditingChange(true)
  }

  const updateLayer = (id: string, updates: Partial<TextLayer>) => {
    onLayersChange(layers.map(l => l.id === id ? { ...l, ...updates } : l))
  }

  const deleteLayer = (id: string) => {
    onLayersChange(layers.filter(l => l.id !== id))
    if (selectedLayerId === id) {
      setSelectedLayerId(null)
    }
  }

  const handleContainerClick = () => {
    setSelectedLayerId(null)
  }

  return (
    <>
      {/* Text layers */}
      {layers.map(layer => (
        <DraggableText
          key={layer.id}
          layer={layer}
          isSelected={selectedLayerId === layer.id}
          onSelect={() => setSelectedLayerId(layer.id)}
          onUpdate={(updates) => updateLayer(layer.id, updates)}
          onDelete={() => deleteLayer(layer.id)}
          containerRef={containerRef}
        />
      ))}

      {/* Add text button - shows when not editing and no text selected */}
      {!selectedLayer && (
        <button
          onClick={createNewLayer}
          className="absolute top-4 left-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 text-white text-sm hover:bg-black/80 hover:border-cyan-500/50 transition-all"
        >
          <Plus className="w-4 h-4" />
          <Type className="w-4 h-4" />
          Add Text
        </button>
      )}

      {/* Style toolbar - shows when text is selected */}
      {selectedLayer && (
        <div className="absolute bottom-20 left-2 right-2 z-40">
          <TextStyleToolbar
            layer={selectedLayer}
            onUpdate={(updates) => updateLayer(selectedLayer.id, updates)}
          />
        </div>
      )}

      {/* Layer count indicator */}
      {layers.length > 0 && (
        <div className="absolute top-4 right-16 z-40 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white/70 text-xs">
          <Layers className="w-3 h-3" />
          {layers.length} text{layers.length !== 1 ? 's' : ''}
        </div>
      )}
    </>
  )
}

export default StoryTextOverlay
