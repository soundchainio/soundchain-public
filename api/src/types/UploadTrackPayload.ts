import { Field, ObjectType } from 'type-graphql';
import { Track } from '../models/Track';

@ObjectType()
export class UploadTrackPayload {
  @Field()
  track: Track;
}
