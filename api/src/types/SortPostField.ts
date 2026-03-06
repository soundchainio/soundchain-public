import { registerEnumType } from 'type-graphql';

enum SortPostField {
  CREATED_AT = 'createdAt',
}

registerEnumType(SortPostField, {
  name: 'SortPostField',
});

export { SortPostField };
