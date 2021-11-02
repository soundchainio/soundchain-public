import { Field, InputType } from 'type-graphql';

@InputType()
export class UpdateWalletInput {
  @Field()
  wallet: string;
}
