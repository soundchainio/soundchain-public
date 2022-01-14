import React from 'react';
import { SVGGradient } from './gradients';
import { IconProps } from './types/IconProps';

export const Checkmark = ({ color, id = '', ...props }: IconProps) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 14 14" {...props}>
      <path
        fill={color ? `url(#${id}${color}-gradient)` : '#ffffff'}
        d="M10.296 5.746a.7.7 0 10-.992-.992L6.3 7.76 4.696 6.154a.7.7 0 00-.992.992l2.1 2.1a.7.7 0 00.992 0l3.5-3.5zM7 0a7 7 0 100 14A7 7 0 007 0zM1.4 7a5.6 5.6 0 1111.2 0A5.6 5.6 0 011.4 7z"
      ></path>
      {color && <SVGGradient id={id} color={color} />}
    </svg>
  );
};
