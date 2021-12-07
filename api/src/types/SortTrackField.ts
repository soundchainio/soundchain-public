import { registerEnumType } from 'type-graphql';

enum SortTrackField {
  // PLAYBACK_COUNT = 'playbackCount',
  CREATED_AT = 'createdAt',
}

registerEnumType(SortTrackField, {
  name: 'SortTrackField',
});

export { SortTrackField };
