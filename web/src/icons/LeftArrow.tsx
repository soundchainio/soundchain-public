import { SVGGradient } from './gradients';
import { IconProps } from './types/IconProps';

export const LeftArrow = ({ color }: IconProps) => {
  return (
    <>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="15" fill="none" viewBox="0 0 16 15">
        <path
          stroke={color ? `url(#${color}-gradient)` : 'gray'}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M7.125 1L1 7.125l6.125 6.125M1 7.125h14"
        ></path>
        {color && <SVGGradient color={color} />}
      </svg>
    </>
  );
};
