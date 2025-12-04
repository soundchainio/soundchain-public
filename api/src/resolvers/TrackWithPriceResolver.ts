import mongoose from 'mongoose';
import { ClassType, FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { TrackWithPriceMetadata } from '../types/TrackWithPriceMetadata';

export function createTrackResolver<T>(objectTypeCls: ClassType<T>) {
  @Resolver(objectTypeCls, { isAbstract: true })
  abstract class TrackWithPriceResolver {
    // 1) Convert `_id` from ObjectId to a string
    @FieldResolver(() => String)
    id(@Root() { _id }: Notification & { _id: mongoose.Types.ObjectId }): string {
      return _id.toString();
    }

    @FieldResolver(() => String)
    trackId(@Root() { metadata }: Notification): string {
      const { trackId } = metadata as TrackWithPriceMetadata;
      return trackId.toString(); // Convert ObjectId to string
    }

    @FieldResolver(() => String)
    trackName(@Root() { metadata }: Notification): string {
      const { trackName } = metadata as TrackWithPriceMetadata;
      return trackName;
    }

    @FieldResolver(() => String)
    artist(@Root() { metadata }: Notification): string {
      const { artist } = metadata as TrackWithPriceMetadata;
      return artist;
    }

    @FieldResolver(() => String)
    artworkUrl(@Root() { metadata }: Notification): string {
      const { artworkUrl } = metadata as TrackWithPriceMetadata;
      return artworkUrl;
    }

    @FieldResolver(() => Number)
    price(@Root() { metadata }: Notification): number {
      const { price } = metadata as TrackWithPriceMetadata;
      return price;
    }

    @FieldResolver(() => String)
    auctionId(@Root() { metadata }: Notification): string {
      const { auctionId } = metadata as TrackWithPriceMetadata;
      return auctionId;
    }
  }

  return TrackWithPriceResolver;
}
