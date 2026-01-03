import { IconProps } from 'icons/types/IconProps'
import { BlueGradient } from './BlueGradient'
import { CyanGradient } from './CyanGradient'
import { GreenBlue } from './GreenBlue'
import { GreenGradient } from './GreenGradient'
import { GreenYellowGradient } from './GreenYellow'
import { PinkBlueGradient } from './PinkBlueGradient'
import { PurpleGradient } from './Purple'
import { PurpleGreenGradient } from './PurpleGreen'
import { RainbowGradient } from './RainbowGradient'
import { RedGradient } from './RedGradient'
import { YellowGradient } from './Yellow'

export type SVGGradientColor =
  | 'yellow'
  | 'green'
  | 'green-yellow'
  | 'purple'
  | 'purple-green'
  | 'green-blue'
  | 'blue'
  | 'cyan'
  | 'red'
  | 'rainbow'
  | 'pink-blue'

const SVGGradients: Record<SVGGradientColor, (props: IconProps) => JSX.Element> = {
  green: GreenGradient,
  yellow: YellowGradient,
  'green-yellow': GreenYellowGradient,
  purple: PurpleGradient,
  'purple-green': PurpleGreenGradient,
  'green-blue': GreenBlue,
  blue: BlueGradient,
  cyan: CyanGradient,
  red: RedGradient,
  rainbow: RainbowGradient,
  'pink-blue': PinkBlueGradient,
}

interface SVGGradientProps {
  color: SVGGradientColor
  id?: string
}

export const SVGGradient = ({ color, ...props }: SVGGradientProps) => {
  return SVGGradients[color](props)
}
