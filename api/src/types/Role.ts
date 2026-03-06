import { registerEnumType } from 'type-graphql';

enum Role {
  SYSTEM = 'SYSTEM',
  ADMIN = 'ADMIN',
  USER = 'USER',
  TEAM_MEMBER = 'TEAM_MEMBER',
  SOUNDCHAIN_ACCOUNT = 'SOUNDCHAIN_ACCOUNT',
}

registerEnumType(Role, {
  name: 'Role',
});

export { Role };
