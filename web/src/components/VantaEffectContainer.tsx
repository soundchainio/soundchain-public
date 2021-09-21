import classNames from 'classnames';
import { useVantaEffect } from 'hooks/useVantaEffect';
import { DefaultCoverPicture } from 'lib/graphql';
import React from 'react';

interface VantaEffectContainerProps {
  effectName: DefaultCoverPicture;
}

export const VantaEffectContainer = ({ effectName }: VantaEffectContainerProps) => {
  const ref = useVantaEffect(effectName);

  return (
    <div className={classNames('flex w-full h-[130px]')}>
      <div ref={ref} className="flex w-full h-full"></div>
    </div>
  );
};
