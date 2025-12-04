import { customEffects, VantaEffect } from 'lib/vanta'
import { useEffect, useRef, useState } from 'react'

export const useVantaEffect = (effectName: string) => {
  const [vantaEffect, setVantaEffect] = useState<VantaEffect | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!vantaEffect && typeof window !== 'undefined') {
      const loadEffect = async () => {
        const { effect, config } = customEffects[effectName as keyof typeof customEffects]
        if (effect && ref.current) {
          const loadedEffect = await effect({ el: ref.current, ...config })
          if (loadedEffect) {
            setVantaEffect(loadedEffect)
          }
        }
      }
      loadEffect()
    }
    return () => {
      if (vantaEffect) vantaEffect.destroy()
    }
  }, [vantaEffect, effectName])

  return ref
}
