import { registerEnumType } from 'type-graphql';

enum DefaultProfilePicture {
  BLUE = 'blue',
  GREEN = 'green',
  ORANGE = 'orange',
  PINK = 'pink',
  PURPLE = 'purple',
  RED = 'red',
  TEAL = 'teal',
  yellow = 'yellow',
}

registerEnumType(DefaultProfilePicture, {
  name: 'DefaultProfilePicture',
});

export { DefaultProfilePicture };
