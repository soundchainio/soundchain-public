import React from 'react';
import { ReactionType } from 'lib/graphql';
import { Fire } from './emoji/Fire';
import { Heart } from './emoji/Heart';
import { Hundred } from './emoji/Hundred';
import { Rocket } from './emoji/Rocket';
import { Sunglasses } from './emoji/Sunglasses';
import { IconComponent } from './types/IconComponent';

interface ReactionEmojiProps {
  name: ReactionType | string; // Allow predefined and custom emoji names
  [key: string]: any; // Additional props
}

// Predefined emoji mapping
const emojiByName: Record<ReactionType, IconComponent> = {
  HAPPY: Hundred,
  HEART: Heart,
  HORNS: Rocket,
  SAD: Fire,
  SUNGLASSES: Sunglasses,
};

export const ReactionEmoji: React.FC<ReactionEmojiProps> = ({ name = ", ...props }) => {
  // Check if the emoji name exists in predefined emojis
  if (emojiByName[name as ReactionType]) {
    const EmojiComponent = emojiByName[name as ReactionType];
    return <EmojiComponent {...props} />;
  }

  // Fallback to rendering custom emoji
  return (
    <span role="img" aria-label={`reaction-${name}`} {...props}>
      {name}
    </span>
  );
};
