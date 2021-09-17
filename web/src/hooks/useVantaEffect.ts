import { createEffect, EffectName, VantaEffect } from 'lib/vanta';
import { useEffect, useRef, useState } from 'react';

export const useVantaEffect = (effectName: EffectName) => {
  const [vantaEffect, setVantaEffect] = useState<VantaEffect>();
  const ref = useRef<HTMLDivElement>(null);
  const effect = createEffect(effectName);
  // TODO see if we can avoid by using useMountedState
  useEffect(() => {
    if (!vantaEffect) {
      setVantaEffect(effect);
    }
    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, [vantaEffect]);

  return ref;
};
