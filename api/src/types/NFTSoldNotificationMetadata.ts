import { registerEnumType } from 'type-graphql';

export interface NFTSoldNotificationMetadata {
  buyerName: string;
  buyerPicture: string | undefined;
  buyerProfileId: string;
  trackName: string;
  artist: string;
  artworkUrl: string;
  trackId: string;
  price: number;
  sellType: SellType;
}

export enum SellType {
  BuyNow = 'BuyNow',
  Auction = 'Auction',
}

registerEnumType(SellType, {
  name: 'SellType',
});
