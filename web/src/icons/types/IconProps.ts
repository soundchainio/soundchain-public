import { SVGGradientColor } from 'icons/gradients';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  activatedColor?: SVGGradientColor;
}
