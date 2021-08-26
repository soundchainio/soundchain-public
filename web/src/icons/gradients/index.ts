import { IconProps } from 'icons/types/IconProps';
import { GreenGradient } from './Green';
import { GreenBlue } from './GreenBlue';
import { PurpleGradient } from './Purple';
import { PurpleGreenGradient } from './PurpleGreen';
import { YellowGradient } from './Yellow';

export type SVGGradientColor = 'yellow' | 'green' | 'purple' | 'green-purple' | 'green-blue';

const SVGGradients: Record<SVGGradientColor, (props: IconProps) => JSX.Element> = {
  yellow: YellowGradient,
  green: GreenGradient,
  purple: PurpleGradient,
  'green-purple': PurpleGreenGradient,
  'green-blue': GreenBlue,
};

interface SVGGradientProps {
  color: SVGGradientColor;
}

export const SVGGradient = ({ color, ...props }: SVGGradientProps) => {
  return SVGGradients[color](props);
};
