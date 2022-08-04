import { Field, ObjectType } from 'type-graphql';
import { TrackEdition } from '../models/TrackEdition';

@ObjectType()
export class CreateTrackEditionPayload {
  @Field()
  trackEdition: TrackEdition;
}
