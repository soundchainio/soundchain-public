import { FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { OutbidNotification } from '../types/OutbidAuctionNotification';
import { OutbidNotificationMetadata } from '../types/OutbidNotificationMetadata';

@Resolver(OutbidNotification)
export class OutbidNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id;
  }

  @FieldResolver(() => String)
  trackId(@Root() { metadata }: Notification): string {
    const { trackId } = metadata as OutbidNotificationMetadata;
    return trackId;
  }

  @FieldResolver(() => String)
  trackName(@Root() { metadata }: Notification): string {
    const { trackName } = metadata as OutbidNotificationMetadata;
    return trackName;
  }

  @FieldResolver(() => String)
  artist(@Root() { metadata }: Notification): string {
    const { artist } = metadata as OutbidNotificationMetadata;
    return artist;
  }

  @FieldResolver(() => String)
  artworkUrl(@Root() { metadata }: Notification): string {
    const { artworkUrl } = metadata as OutbidNotificationMetadata;
    return artworkUrl;
  }

  @FieldResolver(() => Number)
  price(@Root() { metadata }: Notification): number {
    const { price } = metadata as OutbidNotificationMetadata;
    return price;
  }
}
