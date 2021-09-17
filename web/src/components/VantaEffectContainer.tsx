import classNames from 'classnames';
import { useVantaEffect } from 'hooks/useVantaEffect';
import { EffectName } from 'lib/vanta';
import React from 'react';

interface VantaEffectContainerProps {
  effect: EffectName;
}

export const VantaEffectContainer = ({ effect }: VantaEffectContainerProps) => {
  const ref = useVantaEffect(effect);

  return (
    <div className={classNames('flex w-full h-[130px]')}>
      <div ref={ref} className="flex w-full h-full"></div>
    </div>
  );
};
