import { Max, Min } from 'class-validator';
import { Field, InputType, Int } from 'type-graphql';

@InputType()
export class CreateTrackEditionInput {
  @Field()
  transactionHash: string;

  @Field()
  editionId: number;

  @Min(1)
  @Max(1000)
  @Field(() => Int)
  editionSize: number;
}
