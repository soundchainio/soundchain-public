import classNames from 'classnames';
import React, { useState, useEffect, useRef } from 'react';
import * as P5 from 'p5';
import TOPOLOGY from 'vanta/dist/vanta.topology.min';
import isBrowser from 'lib/isBrowser';

export const Topology = () => {
  const [vantaEffect, setVantaEffect] = useState();
  const myRef = useRef(null);
  useEffect(() => {
    if (isBrowser && !vantaEffect) {
      setVantaEffect(
        TOPOLOGY({
          el: myRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: true,
          minHeight: 130.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 2.0,
          color1: 0x18016b,
          color2: 0x9d059d,
          P5: P5,
        }),
      );
    }
    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, [vantaEffect]);
  return (
    <div className={classNames('flex w-full h-[150px] rounded-lg border-2 p-2')}>
      <div ref={myRef} className="flex w-full h-full"></div>
    </div>
  );
};
