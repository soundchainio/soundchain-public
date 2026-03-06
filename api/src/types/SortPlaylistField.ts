import { registerEnumType } from 'type-graphql';

enum SortPlaylistField {
  CREATED_AT = 'createdAt',
}

registerEnumType(SortPlaylistField, {
  name: 'SortPlaylistField',
});

export { SortPlaylistField };