import classNames from 'classnames';
import { useVantaEffect } from 'hooks/useVantaEffect';
import React from 'react';

interface VantaEffectContainerProps {
  effectName: string;
}

export const VantaEffectContainer = ({ effectName }: VantaEffectContainerProps) => {
  const ref = useVantaEffect(effectName);

  return (
    <div className={classNames('flex w-full h-[130px]')}>
      <div ref={ref} className="flex w-full h-full"></div>
    </div>
  );
};
