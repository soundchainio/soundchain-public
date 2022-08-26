import classNames from 'classnames'
import { useVantaEffect } from 'hooks/useVantaEffect'
import React from 'react'

interface VantaEffectContainerProps {
  effectName: string
}

export const VantaEffectContainer = ({ effectName }: VantaEffectContainerProps) => {
  const ref = useVantaEffect(effectName)

  return (
    <div className={classNames('flex h-[130px] w-full')}>
      <div ref={ref} className="flex h-full w-full"></div>
    </div>
  )
}
