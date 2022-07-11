import { Field, InputType } from 'type-graphql';
import { CreateTrackInput } from './CreateTrackInput';

@InputType()
export class CreateMultipleTracksInput {
  @Field()
  amount: number;

  @Field()
  track: CreateTrackInput;
}
