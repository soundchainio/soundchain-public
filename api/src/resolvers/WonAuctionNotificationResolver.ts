import { FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { WonAuctionNotification } from '../types/WonAuctionNotification';
import { WonAuctionNotificationMetadata } from '../types/WonAuctionNotificationMetadata';

@Resolver(WonAuctionNotification)
export class WonAuctionNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id;
  }

  @FieldResolver(() => String)
  trackId(@Root() { metadata }: Notification): string {
    const { trackId } = metadata as WonAuctionNotificationMetadata;
    return trackId;
  }

  @FieldResolver(() => String)
  trackName(@Root() { metadata }: Notification): string {
    const { trackName } = metadata as WonAuctionNotificationMetadata;
    return trackName;
  }

  @FieldResolver(() => String)
  artist(@Root() { metadata }: Notification): string {
    const { artist } = metadata as WonAuctionNotificationMetadata;
    return artist;
  }

  @FieldResolver(() => String)
  artworkUrl(@Root() { metadata }: Notification): string {
    const { artworkUrl } = metadata as WonAuctionNotificationMetadata;
    return artworkUrl;
  }

  @FieldResolver(() => Number)
  price(@Root() { metadata }: Notification): number {
    const { price } = metadata as WonAuctionNotificationMetadata;
    return price;
  }
}
