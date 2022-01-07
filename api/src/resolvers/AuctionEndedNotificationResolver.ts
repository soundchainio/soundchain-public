import { Resolver } from 'type-graphql';
import { AuctionEndedNotification } from '../types/AuctionEndedNotification';
import { createTrackResolver } from './TrackWithPriceResolver';

const TrackResolver = createTrackResolver(AuctionEndedNotification);

@Resolver(AuctionEndedNotification)
export class AuctionEndedNotificationResolver extends TrackResolver {}
