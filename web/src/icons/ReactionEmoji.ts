import React from 'react';
import { ReactionType } from 'lib/graphql';
import { Fire } from './emoji/Fire';
import { Heart } from './emoji/Heart';
import { Hundred } from './emoji/Hundred';
import { Rocket } from './emoji/Rocket';
import { Sunglasses } from './emoji/Sunglasses';
import { IconComponent } from './types/IconComponent';

interface ReactionEmojiProps {
  name: ReactionType | string; // Support both predefined and custom emojis
  [key: string]: any; // Spread for additional props
}

// Mapping of predefined emojis
const emojiByName: Record<ReactionType, IconComponent> = {
  HAPPY: Hundred,
  HEART: Heart,
  HORNS: Rocket,
  SAD: Fire,
  SUNGLASSES: Sunglasses,
};

export const ReactionEmoji: React.FC<ReactionEmojiProps> = ({ name, ...props }) => {
  // Render predefined emoji if it exists
  if (emojiByName[name as ReactionType]) {
    const EmojiComponent = emojiByName[name as ReactionType];
    return <EmojiComponent {...props} />;
  }

  // Render custom emoji (from Emoji Mart or native emoji)
  return (
    <span role="img" aria-label={`reaction-${name}`} {...props}>
      {name}
    </span>
  );
};
