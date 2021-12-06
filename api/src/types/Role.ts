import { registerEnumType } from 'type-graphql';

enum Role {
  SYSTEM = 'SYSTEM',
  ADMIN = 'ADMIN',
  USER = 'USER',
  TEAM_MEMBER = 'TEAM_MEMBER',
}

registerEnumType(Role, {
  name: 'Role',
});

export { Role };
