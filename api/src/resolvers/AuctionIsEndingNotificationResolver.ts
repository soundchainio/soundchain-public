import { Resolver } from 'type-graphql';
import { AuctionIsEndingNotification } from '../types/AuctionIsEndingNotification';
import { createTrackResolver } from './TrackWithPriceResolver';

const NewBidResolver = createTrackResolver(AuctionIsEndingNotification);

@Resolver(AuctionIsEndingNotification)
export class AuctionIsEndingNotificationResolver extends NewBidResolver {}
