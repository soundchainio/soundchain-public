import { registerEnumType } from 'type-graphql';

enum SortExploreTracksField {
  CREATED_AT = 'createdAt',
}

registerEnumType(SortExploreTracksField, {
  name: 'SortExploreTracksField',
});

export { SortExploreTracksField };
