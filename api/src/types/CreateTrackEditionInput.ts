import { Max, Min } from 'class-validator';
import { Field, InputType, Int } from 'type-graphql';
import { EditionData } from './EditionData';

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

  @Field(() => EditionData, { nullable: true })
  editionData: EditionData;
}
