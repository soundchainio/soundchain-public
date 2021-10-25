import { Field, ObjectType } from 'type-graphql';
import { Profile } from '../models/Profile';
import { Track } from '../models/Track';

@ObjectType()
export class ExplorePayload {
  @Field(() => [Profile])
  profiles: Profile[];

  @Field(() => [Track])
  tracks: Track[];

  @Field()
  totalProfiles: number;

  @Field()
  totalTracks: number;
}
