import { Field, ObjectType } from 'type-graphql';
import { Profile } from '../models/Profile';
import { Track } from '../models/Track';

@ObjectType()
export class ExploreTrackPayload {
  @Field(() => [Profile])
  profiles: Profile[];

  @Field(() => [Track])
  tracks: Track[];
}
