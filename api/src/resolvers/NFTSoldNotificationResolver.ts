import { FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { NFTSoldNotification } from '../types/NFTSoldNotification';
import { NFTSoldNotificationMetadata } from '../types/NFTSoldNotificationMetadata';

@Resolver(NFTSoldNotification)
export class NFTSoldNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id;
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
    const { buyerPicture } = metadata as NFTSoldNotificationMetadata;
    return buyerPicture;
  }

  @FieldResolver(() => String)
  trackId(@Root() { metadata }: Notification): string {
    const { trackId } = metadata as NFTSoldNotificationMetadata;
    return trackId;
  }

  @FieldResolver(() => String)
  price(@Root() { metadata }: Notification): string {
    const { price } = metadata as NFTSoldNotificationMetadata;
    return price;
  }
}
