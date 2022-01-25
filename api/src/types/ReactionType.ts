import { registerEnumType } from 'type-graphql';

enum ReactionType {
  HAPPY = 'happy',
  HEART = 'heart',
  HORNS = 'horns',
  SAD = 'sad',
  SUNGLASSES = 'sunglasses',
}

registerEnumType(ReactionType, {
  name: 'ReactionType',
});

export { ReactionType };
