import { registerEnumType } from 'type-graphql';

enum ReactionEmoji {
  HEART = '❤️',
  ROCKON = '🤘',
  HAPPY = '😃',
  SAD = '😢',
  SHADES = '😎',
}

registerEnumType(ReactionEmoji, {
  name: 'ReactionEmoji',
});

export { ReactionEmoji };
