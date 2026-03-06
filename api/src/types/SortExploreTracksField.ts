import { registerEnumType } from 'type-graphql';

enum SortExploreTracksField {
  CREATED_AT = 'createdAt',
  PLAYBACK_COUNT = 'playbackCount',
}

registerEnumType(SortExploreTracksField, {
  name: 'SortExploreTracksField',
});

export { SortExploreTracksField };
