import classNames from 'classnames'
import React, { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import FOG from 'vanta/dist/vanta.fog.min'
import { VantaEffect } from './DefaultCover'

export const Fog = () => {
  const [vantaEffect, setVantaEffect] = useState()
  const myRef = useRef(null)
  useEffect(() => {
    if (!vantaEffect) {
      setVantaEffect(
        FOG({
          el: myRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: true,
          minHeight: 130.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 1.0,
          THREE: THREE,
        }),
      )
    }
    return () => {
      if (vantaEffect) (vantaEffect as unknown as VantaEffect).destroy()
    }
  }, [vantaEffect])
  return (
    <div className={classNames('flex h-[130px] w-full')}>
      <div ref={myRef} className="flex h-full w-full"></div>
    </div>
  )
}
