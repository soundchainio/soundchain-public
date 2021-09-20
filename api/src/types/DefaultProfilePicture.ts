import { registerEnumType } from 'type-graphql';

enum DefaultProfilePicture {
  RED = 'red',
  ORANGE = 'orange',
  yellow = 'yellow',
  GREEN = 'green',
  TEAL = 'teal',
  BLUE = 'blue',
  PURPLE = 'purple',
  PINK = 'pink',
}

registerEnumType(DefaultProfilePicture, {
  name: 'DefaultProfilePicture',
});

export { DefaultProfilePicture };
