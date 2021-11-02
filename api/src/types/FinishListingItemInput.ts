import { Field, InputType } from 'type-graphql';

@InputType()
export class FinishListingItemInput {
  @Field()
  sellerProfileId: string;

  @Field()
  buyerProfileId: string;

  @Field()
  tokenId: number;

  @Field()
  trackId: string;

  @Field()
  trackName: string;

  @Field()
  artist: string;

  @Field()
  artworkUrl: string;

  @Field()
  price: string;
}
