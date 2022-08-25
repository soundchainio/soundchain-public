import * as THREE from 'three'
import BIRDS from 'vanta/dist/vanta.birds.min'
import CELLS from 'vanta/dist/vanta.cells.min'
import FOG from 'vanta/dist/vanta.fog.min'
import NET from 'vanta/dist/vanta.net.min'
import RINGS from 'vanta/dist/vanta.rings.min'
import WAVES from 'vanta/dist/vanta.waves.min'

export interface VantaEffect {
  destroy: () => void
}

const defaultEffectConfig = {
  mouseControls: true,
  touchControls: true,
  gyroControls: true,
  minHeight: 130.0,
  minWidth: 200.0,
  THREE,
  scale: 1.0,
  scaleMobile: 1.0,
}

export const customEffects = {
  waves: {
    effect: WAVES,
    config: {
      ...defaultEffectConfig,
    },
  },
  rings: {
    effect: RINGS,
    config: {
      ...defaultEffectConfig,
      scaleMobile: 2.0,
    },
  },
  net: {
    effect: NET,
    config: {
      ...defaultEffectConfig,
      scale: 3,
      scaleMobile: 3,
    },
  },
  birds: {
    effect: BIRDS,
    config: {
      ...defaultEffectConfig,
      backgroundColor: 0xffe5b2,
    },
  },
  cells: {
    effect: CELLS,
    config: {
      ...defaultEffectConfig,
      scaleMobile: 2.0,
      color1: 0x8c8c,
      color2: 0xc3b351,
    },
  },
  fog: {
    effect: FOG,
    config: {
      ...defaultEffectConfig,
    },
  },
}
