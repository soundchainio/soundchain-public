import { registerEnumType } from 'type-graphql';

enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

registerEnumType(Role, {
  name: 'Role',
});

export { Role };
