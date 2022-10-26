import { Field, InputType } from 'type-graphql';
import { SellType } from './NFTSoldNotificationMetadata';

@InputType()
export class FinishBuyNowItemInput {
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
  price: number;

  @Field()
  sellType: SellType;

  @Field()
  isPaymentOgun: boolean;
}
