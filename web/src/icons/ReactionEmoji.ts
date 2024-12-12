import { ReactionType } from 'lib/graphql';
import { Fire } from './emoji/Fire';
import { Heart } from './emoji/Heart';
import { Hundred } from './emoji/Hundred';
import { Rocket } from './emoji/Rocket';
import { Sunglasses } from './emoji/Sunglasses';
import { IconComponent } from './types/IconComponent';

interface ReactionEmojiProps extends React.SVGProps<SVGSVGElement> {
  name: ReactionType | string; // Allow both predefined and custom emoji names
}

// Static mapping for default emojis
const emojiByName: Record<ReactionType, IconComponent> = {
  HAPPY: Hundred,
  HEART: Heart,
  HORNS: Rocket,
  SAD: Fire,
  SUNGLASSES: Sunglasses,
};

export const ReactionEmoji = ({ name, ...props }: ReactionEmojiProps) => {
  // Check if the reaction is a custom emoji or a default one
  if (emojiByName[name as ReactionType]) {
    // Render predefined emoji
    return emojiByName[name as ReactionType](props);
  }

  // Render custom emoji from `emoji-mart`
  return (
    <span role="img" aria-label="reaction" {...props}>
      {name}
    </span>
  );
};
