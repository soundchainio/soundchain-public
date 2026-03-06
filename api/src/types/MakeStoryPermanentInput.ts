import { Field, InputType, Float } from 'type-graphql';

@InputType()
export class MakeStoryPermanentInput {
  @Field(() => String)
  storyId!: string;

  @Field(() => String)
  paymentToken!: string; // 'OGUN' or 'POL'

  @Field(() => String)
  transactionHash!: string;

  @Field(() => Float)
  amountPaid!: number;
}
