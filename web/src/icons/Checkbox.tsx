import React from 'react';
import { SVGGradient } from './gradients';
import { IconProps } from './types/IconProps';

export const Checkbox = ({ color, id = '', ...props }: IconProps) => {
  return (
    <svg width={20} height={20} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect
        x={1}
        y={1}
        width={18}
        height={18}
        rx={3}
        fill={color ? `url(#${id}${color}-gradient)` : 'transparent'}
        stroke="#0EDA65"
        strokeWidth={2}
      />
      {color && <SVGGradient id={id} color={color} />}
    </svg>
  );
};
