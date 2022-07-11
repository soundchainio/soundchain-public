import { Field, ObjectType } from 'type-graphql';
import { Track } from '../models/Track';

@ObjectType()
export class CreateMultipleTracksPayload {
  @Field()
  firstTrack: Track

  @Field(() => [String])
  trackIds: string[]
}