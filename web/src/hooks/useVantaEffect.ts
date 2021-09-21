import { DefaultCoverPicture } from 'lib/graphql';
import { customEffects, VantaEffect } from 'lib/vanta';
import { useEffect, useRef, useState } from 'react';

export const useVantaEffect = (effectName: DefaultCoverPicture) => {
  const [vantaEffect, setVantaEffect] = useState<VantaEffect>();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!vantaEffect) {
      const { effect, config } = customEffects[effectName];
      setVantaEffect(effect({ el: ref.current, ...config }));
    }
    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, [vantaEffect]);

  return ref;
};
