import { IconProps } from 'icons/types/IconProps';
import { GreenBlue } from './GreenBlue';
import { GreenGradient } from './GreenGradient';
import { GreenYellowGradient } from './GreenYellow';
import { PurpleGradient } from './Purple';
import { PurpleGreenGradient } from './PurpleGreen';
import { YellowGradient } from './Yellow';

export type SVGGradientColor = 'yellow' | 'green' | 'green-yellow' | 'purple' | 'purple-green' | 'green-blue';

const SVGGradients: Record<SVGGradientColor, (props: IconProps) => JSX.Element> = {
  green: GreenGradient,
  yellow: YellowGradient,
  'green-yellow': GreenYellowGradient,
  purple: PurpleGradient,
  'purple-green': PurpleGreenGradient,
  'green-blue': GreenBlue,
};

interface SVGGradientProps {
  color: SVGGradientColor;
  id?: string;
}

export const SVGGradient = ({ color, ...props }: SVGGradientProps) => {
  return SVGGradients[color](props);
};
