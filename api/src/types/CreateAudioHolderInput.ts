import { Field, InputType } from 'type-graphql';

@InputType()
export class CreateAudioHolderInput {
  @Field()
  walletAddress: string;

  @Field()
  amount: number;
}
