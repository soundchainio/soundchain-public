export interface VantaEffect {
  destroy: () => void
}

const defaultEffectConfig = {
  mouseControls: true,
  touchControls: true,
  gyroControls: true,
  minHeight: 130.0,
  minWidth: 200.0,
  scale: 1.0,
  scaleMobile: 1.0,
}

// Dynamic import helper to avoid SSR issues
const loadVantaEffect = async (effectName: string) => {
  if (typeof window === 'undefined') return null

  const THREE = await import('three')

  switch (effectName) {
    case 'waves':
      const WAVES = (await import('vanta/dist/vanta.waves.min')).default
      return WAVES
    case 'rings':
      const RINGS = (await import('vanta/dist/vanta.rings.min')).default
      return RINGS
    case 'net':
      const NET = (await import('vanta/dist/vanta.net.min')).default
      return NET
    case 'birds':
      const BIRDS = (await import('vanta/dist/vanta.birds.min')).default
      return BIRDS
    case 'cells':
      const CELLS = (await import('vanta/dist/vanta.cells.min')).default
      return CELLS
    case 'fog':
      const FOG = (await import('vanta/dist/vanta.fog.min')).default
      return FOG
    default:
      return null
  }
}

export const customEffects = {
  waves: {
    effect: async (options: any) => {
      const WAVES = await loadVantaEffect('waves')
      if (!WAVES) return null
      const THREE = await import('three')
      return WAVES({ ...options, THREE })
    },
    config: {
      ...defaultEffectConfig,
    },
  },
  rings: {
    effect: async (options: any) => {
      const RINGS = await loadVantaEffect('rings')
      if (!RINGS) return null
      const THREE = await import('three')
      return RINGS({ ...options, THREE })
    },
    config: {
      ...defaultEffectConfig,
      scaleMobile: 2.0,
    },
  },
  net: {
    effect: async (options: any) => {
      const NET = await loadVantaEffect('net')
      if (!NET) return null
      const THREE = await import('three')
      return NET({ ...options, THREE })
    },
    config: {
      ...defaultEffectConfig,
      scale: 3,
      scaleMobile: 3,
    },
  },
  birds: {
    effect: async (options: any) => {
      const BIRDS = await loadVantaEffect('birds')
      if (!BIRDS) return null
      const THREE = await import('three')
      return BIRDS({ ...options, THREE })
    },
    config: {
      ...defaultEffectConfig,
      backgroundColor: 0xffe5b2,
    },
  },
  cells: {
    effect: async (options: any) => {
      const CELLS = await loadVantaEffect('cells')
      if (!CELLS) return null
      const THREE = await import('three')
      return CELLS({ ...options, THREE })
    },
    config: {
      ...defaultEffectConfig,
      scaleMobile: 2.0,
      color1: 0x8c8c,
      color2: 0xc3b351,
    },
  },
  fog: {
    effect: async (options: any) => {
      const FOG = await loadVantaEffect('fog')
      if (!FOG) return null
      const THREE = await import('three')
      return FOG({ ...options, THREE })
    },
    config: {
      ...defaultEffectConfig,
    },
  },
}
