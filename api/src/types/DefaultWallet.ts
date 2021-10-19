import { registerEnumType } from 'type-graphql';

enum DefaultWallet {
  Soundchain = 'Soundchain',
  MetaMask = 'MetaMask',
}

registerEnumType(DefaultWallet, {
  name: 'DefaultWallet',
});

export { DefaultWallet };
