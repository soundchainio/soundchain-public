import { SVGGradient } from './gradients';
import { IconProps } from './types/IconProps';

export const Checked = ({color ,...props}: IconProps) => {
  return (
    <svg width="32" height="26" viewBox="0 0 32 26" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M2 12.6407L10.8987 21.5394L29.859 2.5791" stroke="url(#paint0_linear_1723_419)" strokeWidth="5" />
      <defs>
        <linearGradient
          id="paint0_linear_1723_419"
          x1="15.3687"
          y1="-11.0178"
          x2="34.439"
          y2="23.7134"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#84FF82" />
          <stop offset="1" stopColor="#4870FF" />
        </linearGradient>
      </defs>

      {color && <SVGGradient color={color} />}

    </svg>
  );
};
