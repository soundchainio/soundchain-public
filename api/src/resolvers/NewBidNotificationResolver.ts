import { Resolver } from 'type-graphql';
import { NewBidNotification } from '../types/NewBidNotification';
import { createTrackResolver } from './TrackWithPriceResolver';

const NewBidResolver = createTrackResolver(NewBidNotification);

@Resolver(NewBidNotification)
export class NewBidNotificationResolver extends NewBidResolver {}
