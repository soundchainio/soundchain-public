import { FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { NFTSoldNotification } from '../types/NFTSoldNotification';
import { NFTSoldNotificationMetadata, SellType } from '../types/NFTSoldNotificationMetadata';

@Resolver(NFTSoldNotification)
export class NFTSoldNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id.toString();
  }

  @FieldResolver(() => String)
  buyerName(@Root() { metadata }: Notification): string {
    const { buyerName } = metadata as NFTSoldNotificationMetadata;
    return buyerName;
  }

  @FieldResolver(() => String)
  buyerPicture(@Root() { metadata }: Notification): string {
    const { buyerPicture } = metadata as NFTSoldNotificationMetadata;
    return buyerPicture;
  }

  @FieldResolver(() => String)
  buyerProfileId(@Root() { metadata }: Notification): string {
    const { buyerProfileId } = metadata as NFTSoldNotificationMetadata;
    return buyerProfileId.toString(); // Convert ObjectId to string
  }

  @FieldResolver(() => String)
  trackId(@Root() { metadata }: Notification): string {
    const { trackId } = metadata as NFTSoldNotificationMetadata;
    return trackId.toString();
  }

  @FieldResolver(() => Number)
  price(@Root() { metadata }: Notification): number {
    const { price } = metadata as NFTSoldNotificationMetadata;
    return price;
  }

  @FieldResolver(() => String)
  trackName(@Root() { metadata }: Notification): string {
    const { trackName } = metadata as NFTSoldNotificationMetadata;
    return trackName;
  }

  @FieldResolver(() => String)
  artist(@Root() { metadata }: Notification): string {
    const { artist } = metadata as NFTSoldNotificationMetadata;
    return artist;
  }

  @FieldResolver(() => String)
  artworkUrl(@Root() { metadata }: Notification): string {
    const { artworkUrl } = metadata as NFTSoldNotificationMetadata;
    return artworkUrl;
  }

  @FieldResolver(() => SellType)
  sellType(@Root() { metadata }: Notification): SellType {
    const { sellType } = metadata as NFTSoldNotificationMetadata;
    return sellType;
  }

  @FieldResolver(() => Boolean, { nullable: true })
  isPaymentOgun(@Root() { metadata }: Notification): boolean {
    const { isPaymentOgun } = metadata as NFTSoldNotificationMetadata;
    return isPaymentOgun;
  }
}
