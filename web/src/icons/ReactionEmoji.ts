import { ReactionType } from 'lib/graphql'
import { Fire } from './emoji/Fire'
import { Headphones } from './emoji/Headphones'
import { Microphone } from './emoji/Microphone'
import { MusicalNote } from './emoji/MusicalNote'
import { Vinyl } from './emoji/Vinyl'
import { IconComponent } from './types/IconComponent'

interface ReactionEmojiProps extends React.SVGProps<SVGSVGElement> {
  name: ReactionType
}

// Music-themed reactions for SoundChain
// Keys are legacy enum values, visuals are music-themed
const emojiByName: Record<ReactionType, IconComponent> = {
  SAD: Fire,           // 🔥 Fire - "This track is fire!"
  HAPPY: MusicalNote,  // 🎵 Note - "Good vibes"
  HORNS: Headphones,   // 🎧 Headphones - "On repeat"
  SUNGLASSES: Microphone, // 🎤 Mic - "Bars/Great vocals"
  HEART: Vinyl,        // 💿 Vinyl - "Classic"
}

export const ReactionEmoji = ({ name, ...props }: ReactionEmojiProps) => {
  return emojiByName[name](props)
}
