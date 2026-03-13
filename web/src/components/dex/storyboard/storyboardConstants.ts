export const MODELS = [
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
] as const

export type ModelId = typeof MODELS[number]['id']

export const STYLE_PRESETS = [
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
  {
    label: 'Anime/Manga',
    prefix: 'anime style, manga illustration, cel shading, vibrant colors, detailed linework, ',
    negative: 'photorealistic, photograph, 3d render, realistic skin, western cartoon',
    width: 512,
    height: 768,
    color: 'pink',
  },
  {
    label: 'Comic Book',
    prefix: 'comic book art, bold ink outlines, halftone dots, dynamic panel, superhero style, ',
    negative: 'photorealistic, photograph, anime, soft shading, watercolor, blurry',
    width: 512,
    height: 512,
    color: 'amber',
  },
  {
    label: 'Music Video',
    prefix: 'music video still, cinematic, dramatic lighting, stylized, high production value, ',
    negative: 'low quality, amateur, ugly, deformed, text, watermark',
    width: 768,
    height: 512,
    color: 'cyan',
  },
] as const

export const DEFAULT_NEGATIVE = 'ugly, blurry, low quality, deformed, disfigured, watermark, text, bad anatomy'

export const colorMap: Record<string, string> = {
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30',
  pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30 hover:bg-pink-500/30',
  amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30',
  green: 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30',
}

export const activeColorMap: Record<string, string> = {
  purple: 'bg-purple-500/40 text-purple-300 border-purple-400',
  pink: 'bg-pink-500/40 text-pink-300 border-pink-400',
  amber: 'bg-amber-500/40 text-amber-300 border-amber-400',
  green: 'bg-green-500/40 text-green-300 border-green-400',
  cyan: 'bg-cyan-500/40 text-cyan-300 border-cyan-400',
}

export const MAX_FACES = 6
export const MAX_FRAMES = 12
export const FRAME_DURATION_MIN = 2
export const FRAME_DURATION_MAX = 5
export const FRAME_DURATION_DEFAULT = 3
export const LOCALSTORAGE_KEY = 'sc_storyboard_state'
