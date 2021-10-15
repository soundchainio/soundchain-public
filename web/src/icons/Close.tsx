import { SVGGradient } from './gradients';
import { IconProps } from './types/IconProps';

export const Close = ({ color, id, ...props }: IconProps) => {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M6 0a6 6 0 100 12A6 6 0 006 0zm1.626 6.774a.6.6 0 01-.195.983.6.6 0 01-.657-.131L6 6.846l-.774.78a.6.6 0 01-.983-.195.6.6 0 01.131-.657L5.154 6l-.78-.774a.602.602 0 01.852-.852l.774.78.774-.78a.602.602 0 11.852.852L6.846 6l.78.774z"
        fill={color ? `url(#${color}-gradient)` : '#505050'}
      />
      {color && <SVGGradient color={color} id={id ? id : ''} />}
    </svg>
  );
};
