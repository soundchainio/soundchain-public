import { registerEnumType } from 'type-graphql';

export enum ActivityType {
  Listened = 'Listened',
  Liked = 'Liked',
  Commented = 'Commented',
  Followed = 'Followed',
  Minted = 'Minted',
  Posted = 'Posted',
  WallPosted = 'WallPosted',
}

registerEnumType(ActivityType, {
  name: 'ActivityType',
  description: 'Types of user activities for the activity feed',
});
