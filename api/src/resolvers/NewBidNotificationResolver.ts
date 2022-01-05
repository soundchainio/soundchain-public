import { FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { NewBidNotification } from '../types/NewBidNotification';
import { NewBidNotificationMetadata } from '../types/NewBidNotificationMetadata';

@Resolver(NewBidNotification)
export class NewBidNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id;
  }

  @FieldResolver(() => String)
  trackId(@Root() { metadata }: Notification): string {
    const { trackId } = metadata as NewBidNotificationMetadata;
    return trackId;
  }

  @FieldResolver(() => String)
  trackName(@Root() { metadata }: Notification): string {
    const { trackName } = metadata as NewBidNotificationMetadata;
    return trackName;
  }

  @FieldResolver(() => String)
  artist(@Root() { metadata }: Notification): string {
    const { artist } = metadata as NewBidNotificationMetadata;
    return artist;
  }

  @FieldResolver(() => String)
  artworkUrl(@Root() { metadata }: Notification): string {
    const { artworkUrl } = metadata as NewBidNotificationMetadata;
    return artworkUrl;
  }

  @FieldResolver(() => Number)
  price(@Root() { metadata }: Notification): number {
    const { price } = metadata as NewBidNotificationMetadata;
    return price;
  }
}
