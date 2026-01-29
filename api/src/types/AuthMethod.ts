import { registerEnumType } from 'type-graphql';

enum AuthMethod {
  magicLink = 'magicLink',
  google = 'google',
  discord = 'discord',
  twitch = 'twitch',
  wallet = 'wallet',  // Direct wallet login (MetaMask, Coinbase, etc.)
}

registerEnumType(AuthMethod, {
  name: 'AuthMethod',
});

export { AuthMethod };
