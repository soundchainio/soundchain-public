import { ReactionType } from 'lib/graphql'
import { Fire } from './emoji/Fire'
import { Heart } from './emoji/Heart'
import { Hundred } from './emoji/Hundred'
import { Rocket } from './emoji/Rocket'
import { Sunglasses } from './emoji/Sunglasses'
import { IconComponent } from './types/IconComponent'

interface ReactionEmojiProps extends React.SVGProps<SVGSVGElement> {
  name: ReactionType
}

// We will need a bigger migration if we wanna change the key names
// of the emojis, it should be something like first, second, third...
// then we could always rewrite the entire history by changing only
// the svg file, for now this solution will work
const emojiByName: Record<ReactionType, IconComponent> = {
  HAPPY: Hundred,
  HEART: Heart,
  HORNS: Rocket,
  SAD: Fire,
  SUNGLASSES: Sunglasses,
}

export const ReactionEmoji = ({ name, ...props }: ReactionEmojiProps) => {
  return emojiByName[name](props)
}
