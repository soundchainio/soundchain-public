import { Field, InputType } from 'type-graphql';

@InputType()
export class FilterBuyNowItemInput {
  @Field({ nullable: false })
  trackEdition: string;
}
