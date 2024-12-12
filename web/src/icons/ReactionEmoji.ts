import { ReactionType } from 'lib/graphql';
import { Fire } from './emoji/Fire';
import { Heart } from './emoji/Heart';
import { Hundred } from './emoji/Hundred';
import { Rocket } from './emoji/Rocket';
import { Sunglasses } from './emoji/Sunglasses';
import { IconComponent } from './types/IconComponent';
import React from 'react';

interface ReactionEmojiProps {
  name: ReactionType | string; // Support both predefined and custom emojis
  [key: string]: any; // Spread for extra props
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
  // Render predefined emoji if it exists in `emojiByName`
  if (emojiByName[name as ReactionType]) {
    const EmojiComponent = emojiByName[name as ReactionType];
    return <EmojiComponent {...props} />;
  }

  // Render custom emoji as plain text or from `emoji-mart`
  return (
    <span role="img" aria-label="reaction" {...props}>
      {name}
    </span>
  );
};
