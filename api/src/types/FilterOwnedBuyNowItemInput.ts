import { Field, InputType } from 'type-graphql';

@InputType()
export class FilterOwnedBuyNowItemInput {
  @Field({ nullable: false })
  trackEditionId: string;

  @Field({ nullable: false })
  owner: string;
}
