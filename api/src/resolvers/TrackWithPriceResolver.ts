import { ClassType, FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { TrackWithPriceMetadata } from '../types/TrackWithPriceMetadata';

export function createTrackResolver<T>(objectTypeCls: ClassType<T>) {
    @Resolver(() => objectTypeCls, { isAbstract: true })
    abstract class TrackWithPriceResolver {
        @FieldResolver(() => String)
        id(@Root() { _id }: Notification): string {
            return typeof _id === 'string' ? _id : _id.toString(); // Ensure it's a string
        }

        @FieldResolver(() => String)
        trackId(@Root() { metadata }: Notification): string {
            const { trackId } = metadata as TrackWithPriceMetadata;
            return trackId;
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
