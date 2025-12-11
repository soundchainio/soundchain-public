import { registerEnumType } from 'type-graphql';

enum AuthMethod {
  magicLink = 'magicLink',
  google = 'google',
  discord = 'discord',
  twitch = 'twitch',
}

registerEnumType(AuthMethod, {
  name: 'AuthMethod',
});

export { AuthMethod };
