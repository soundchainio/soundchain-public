import { IconProps } from 'icons/types/IconProps';
import { GreenGradient } from './Green';
import { PurpleGradient } from './Purple';
import { PurpleGreenGradient } from './PurpleGreen';
import { YellowGradient } from './Yellow';

export type SVGGradientColor = 'yellow' | 'green' | 'purple' | 'green-purple';

const SVGGradients: Record<SVGGradientColor, (props: IconProps) => JSX.Element> = {
  yellow: YellowGradient,
  green: GreenGradient,
  purple: PurpleGradient,
  'green-purple': PurpleGreenGradient,
};

interface SVGGradientProps {
  color: SVGGradientColor;
}

export const SVGGradient = ({ color, ...props }: SVGGradientProps) => {
  return SVGGradients[color](props);
};
