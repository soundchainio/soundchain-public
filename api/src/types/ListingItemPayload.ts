import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class ListingItemPayload {
  @Field({ nullable: true })
  _id: string;

  @Field({ nullable: true })
  owner: string;

  @Field({ nullable: true })
  nft: string;

  @Field({ nullable: true })
  tokenId: number;

  @Field({ nullable: true })
  startingTime: number;

  @Field({ nullable: true })
  endingTime: number;

  @Field({ nullable: true })
  reservePrice: number;

  @Field({ nullable: true })
  pricePerItem: number;
}
