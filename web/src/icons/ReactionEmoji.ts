import { ReactionType } from 'lib/graphql'
import { Happy } from './emoji/Happy'
import { Heart } from './emoji/Heart'
import { Horns } from './emoji/Horns'
import { Sad } from './emoji/Sad'
import { Sunglasses } from './emoji/Sunglasses'
import { IconComponent } from './types/IconComponent'

interface ReactionEmojiProps extends React.SVGProps<SVGSVGElement> {
  name: ReactionType
}

const emojiByName: Record<ReactionType, IconComponent> = {
  HAPPY: Happy,
  HEART: Heart,
  HORNS: Horns,
  SAD: Sad,
  SUNGLASSES: Sunglasses,
}

export const ReactionEmoji = ({ name, ...props }: ReactionEmojiProps) => {
  return emojiByName[name](props)
}
