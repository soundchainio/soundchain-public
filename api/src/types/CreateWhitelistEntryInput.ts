import { Field, InputType } from 'type-graphql';

@InputType()
export class CreateWhitelistEntryInput {
  @Field()
  walletAddress: string;

  @Field()
  emailAddress: string;
}