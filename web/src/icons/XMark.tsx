import React from 'react';
import { IconProps } from './types/IconProps';

export const XMarkFilled = ({ ...props }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4.151 17.943l-4.143-4.102-4.117 4.159-1.833-1.833 4.104-4.157-4.162-4.119 1.833-1.833 4.155 4.102 4.106-4.16 1.849 1.849-4.1 4.141 4.157 4.104-1.849 1.849z"
        fill="url(#paint0_linear_2172:12133)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_2172:12133"
          x1="0.258785"
          y1="10.2693"
          x2="14.2888"
          y2="6.8752"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#9b1a15" />
          <stop offset="1" stopColor="#e4150d" />
        </linearGradient>
      </defs>
    </svg>
  );
};
