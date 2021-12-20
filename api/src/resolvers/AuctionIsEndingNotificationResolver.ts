import { FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { AuctionIsEndingNotification } from '../types/AuctionIsEndingNotification';
import { AuctionIsEndingNotificationMetadata } from '../types/AuctionIsEndingNotificationMetadata';

@Resolver(AuctionIsEndingNotification)
export class AuctionIsEndingNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id;
  }

  @FieldResolver(() => String)
  trackId(@Root() { metadata }: Notification): string {
    const { trackId } = metadata as AuctionIsEndingNotificationMetadata;
    return trackId;
  }

  @FieldResolver(() => String)
  trackName(@Root() { metadata }: Notification): string {
    const { trackName } = metadata as AuctionIsEndingNotificationMetadata;
    return trackName;
  }
}
