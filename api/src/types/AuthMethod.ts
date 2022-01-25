import { registerEnumType } from 'type-graphql';

enum AuthMethod {
  magicLink = 'magicLink',
  google = 'google',
}

registerEnumType(AuthMethod, {
  name: 'AuthMethod',
});

export { AuthMethod };
