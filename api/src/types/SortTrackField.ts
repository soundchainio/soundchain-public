import { registerEnumType } from 'type-graphql';

enum SortTrackField {
  CREATED_AT = 'createdAt',
}

registerEnumType(SortTrackField, {
  name: 'SortTrackField',
});

export { SortTrackField };

