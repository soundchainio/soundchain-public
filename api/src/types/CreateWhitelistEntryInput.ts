import { Field, InputType } from 'type-graphql';

@InputType()
export class CreateWhitelistEntryInput {
  @Field(() => String)
  walletAddress: string;

  @Field(() => String)
  emailAddress: string;
}