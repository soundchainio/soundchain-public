import { customEffects, VantaEffect } from 'lib/vanta';
import { useEffect, useRef, useState } from 'react';

export const useVantaEffect = (effectName: string) => {
  const [vantaEffect, setVantaEffect] = useState<VantaEffect>();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!vantaEffect) {
      const { effect, config } = customEffects[effectName as keyof typeof customEffects];
      setVantaEffect(effect({ el: ref.current, ...config }));
    }
    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, [vantaEffect]);

  return ref;
};
