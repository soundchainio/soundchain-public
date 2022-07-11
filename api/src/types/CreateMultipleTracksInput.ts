import { Max, Min } from 'class-validator';
import { Field, InputType, Int } from 'type-graphql';
import { CreateTrackInput } from './CreateTrackInput';

@InputType()
export class CreateMultipleTracksInput {

  @Min(1)
  @Max(1000)
  @Field(() => Int, { nullable: false })
  amount: number;

  @Field()
  track: CreateTrackInput;
}
