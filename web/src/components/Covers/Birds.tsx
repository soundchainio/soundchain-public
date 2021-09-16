import classNames from 'classnames';
import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import BIRDS from 'vanta/dist/vanta.birds.min';
import { VantaEffect } from './DefaultCover';

export const Birds = () => {
  const [vantaEffect, setVantaEffect] = useState();
  const myRef = useRef(null);
  useEffect(() => {
    if (!vantaEffect) {
      setVantaEffect(
        BIRDS({
          el: myRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: true,
          minHeight: 130.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 1.0,
          backgroundColor: 0xffe5b2,
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
