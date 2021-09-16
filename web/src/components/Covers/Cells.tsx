import classNames from 'classnames';
import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import CELLS from 'vanta/dist/vanta.cells.min';
import { VantaEffect } from './DefaultCover';

export const Cells = () => {
  const [vantaEffect, setVantaEffect] = useState();
  const myRef = useRef(null);
  useEffect(() => {
    if (!vantaEffect) {
      setVantaEffect(
        CELLS({
          el: myRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: true,
          minHeight: 130.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 2.0,
          color1: 0x8c8c,
          color2: 0xc3b351,
          THREE: THREE,
        }),
      );
    }
    return () => {
      if (vantaEffect) (vantaEffect as VantaEffect).destroy();
    };
  }, [vantaEffect]);
  return (
    <div className={classNames('flex w-full h-[130px]')}>
      <div ref={myRef} className="flex w-full h-full"></div>
    </div>
  );
};
