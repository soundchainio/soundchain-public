import { Resolver } from 'type-graphql';
import { OutbidNotification } from '../types/OutbidAuctionNotification';
import { createTrackResolver } from './TrackWithPriceResolver';

const NewBidResolver = createTrackResolver(OutbidNotification);

@Resolver(OutbidNotification)
export class OutbidNotificationResolver extends NewBidResolver {}
