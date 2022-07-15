import { Field, InputType } from 'type-graphql';
import { CreateTrackInput } from './CreateTrackInput';

@InputType()
export class CreateMultipleTracksInput {
  @Field()
  batchSize: number;

  @Field()
  track: CreateTrackInput;
}
