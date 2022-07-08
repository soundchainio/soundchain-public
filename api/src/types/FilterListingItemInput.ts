import { Field, InputType } from 'type-graphql';

@InputType()
export class FilterListingItemInput {
  @Field({nullable: false})
  tokenId: number;

  @Field({nullable: false})
  contractAddress: string;
}
