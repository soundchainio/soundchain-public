import { SVGGradient } from './gradients';
import { IconProps } from './types/IconProps';

export const Search = ({ activatedColor, ...props }: IconProps) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <path
        fill={activatedColor ? `url(#${activatedColor}-gradient)` : '#505050'}
        d="M8.552 17.105a8.5 8.5 0 005.236-1.805l4.7 4.7 1.51-1.512-4.699-4.7a8.502 8.502 0 001.806-5.236C17.105 3.837 13.268 0 8.552 0 3.837 0 0 3.837 0 8.552c0 4.716 3.837 8.553 8.552 8.553zm0-14.967a6.42 6.42 0 016.415 6.414 6.42 6.42 0 01-6.415 6.415 6.42 6.42 0 01-6.414-6.415 6.42 6.42 0 016.414-6.414z"
      ></path>
      {activatedColor && <SVGGradient color={activatedColor} />}
    </svg>
  );
};
