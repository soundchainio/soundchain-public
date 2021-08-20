import { registerEnumType } from 'type-graphql';

enum ReactionEmoji {
  '❤️',
  '🤘',
  '😃',
  '😢',
  '😎',
}

registerEnumType(ReactionEmoji, {
  name: 'ReactionEmoji',
});

export { ReactionEmoji };
