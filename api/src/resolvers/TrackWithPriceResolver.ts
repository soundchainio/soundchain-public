import { ClassType, FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { TrackWithPriceMetadata } from '../types/TrackWithPriceMetadata';

export function createTrackResolver<T>(objectTypeCls: ClassType<T>) {
  @Resolver(objectTypeCls, { isAbstract: true })
  abstract class TrackWithPriceResolver {
    @FieldResolver(() => String)
    id(@Root() { _id }: Notification): string {
      return typeof _id === 'string' ? _id : _id.toString(); // Ensure it's a string
    }

    @FieldResolver(() => String)
    trackId(@Root() { metadata }: Notification): string {
      const { trackId } = metadata;
      return trackId;
    }

    @FieldResolver(() => String)
    trackName(@Root() { metadata }: Notification): string {
      const { trackName } = metadata;
      return trackName;
    }

    @FieldResolver(() => String)
    artist(@Root() { metadata }: Notification): string {
      const { artist } = metadata;
      return artist;
    }

    @FieldResolver(() => String)
    artworkUrl(@Root() { metadata }: Notification): string {
      const { artworkUrl } = metadata;
      return artworkUrl;
    }

    @FieldResolver(() => Number)
    price(@Root() { metadata }: Notification): number {
      const { price } = metadata;
      return price;
    }

    @FieldResolver(() => String)
    auctionId(@Root() { metadata }: Notification): string {
      const { auctionId } = metadata;
      return auctionId;
    }
  }
  return TrackWithPriceResolver;
}
