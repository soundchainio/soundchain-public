import { registerEnumType } from 'type-graphql';

enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

registerEnumType(SortOrder, {
  name: 'SortOrder',
});

export { SortOrder };
