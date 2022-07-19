import { Max, Min } from 'class-validator';
import { Field, InputType, Int } from 'type-graphql';
import { EditionData } from './EditionData';

export const MAX_EDITION_SIZE = 1000;

@InputType()
export class CreateTrackEditionInput {
  @Field()
  transactionHash: string;

  @Field()
  editionId: number;

  @Min(1)
  @Max(MAX_EDITION_SIZE)
  @Field(() => Int)
  editionSize: number;

  @Field(() => EditionData, { nullable: true })
  editionData: EditionData;
}
