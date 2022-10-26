import { registerEnumType } from 'type-graphql';
import { TrackWithPriceMetadata } from './TrackWithPriceMetadata';

export interface NFTSoldNotificationMetadata extends TrackWithPriceMetadata {
  buyerName: string;
  buyerPicture: string | undefined;
  buyerProfileId: string;
  sellType: SellType;
  isPaymentOgun: boolean;
}

export enum SellType {
  BuyNow = 'BuyNow',
  Auction = 'Auction',
}

registerEnumType(SellType, {
  name: 'SellType',
});
