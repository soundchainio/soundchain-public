import mongoose from 'mongoose';
import { Field, InputType } from 'type-graphql';
import { SellType } from './NFTSoldNotificationMetadata';

@InputType()
export class FinishBuyNowItemInput {
  @Field(() => String) // GraphQL String maps to ObjectId
  sellerProfileId: mongoose.Types.ObjectId;

  @Field(() => String) // GraphQL String maps to ObjectId
  buyerProfileId: mongoose.Types.ObjectId;

  @Field()
  tokenId: number;

  @Field(() => String) // GraphQL String maps to ObjectId
  trackId: mongoose.Types.ObjectId;

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
