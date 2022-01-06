import { Resolver } from 'type-graphql';
import { WonAuctionNotification } from '../types/WonAuctionNotification';
import { createTrackResolver } from './TrackWithPriceResolver';

const NewBidResolver = createTrackResolver(WonAuctionNotification);

@Resolver(WonAuctionNotification)
export class WonAuctionNotificationResolver extends NewBidResolver {}
