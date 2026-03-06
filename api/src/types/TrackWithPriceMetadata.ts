import mongoose from 'mongoose';

export interface TrackWithPriceMetadata {
  trackName: string;
  trackId: mongoose.Types.ObjectId;
  artist: string;
  artworkUrl: string;
  price: number;
  auctionId: string;
}
