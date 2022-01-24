import { registerEnumType } from 'type-graphql';

enum AuthMethod {
  MagicLink = 'MagicLink',
  Google = 'Google',
}

registerEnumType(AuthMethod, {
  name: 'AuthMethod',
});

export { AuthMethod };
