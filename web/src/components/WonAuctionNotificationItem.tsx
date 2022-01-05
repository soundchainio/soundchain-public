import { WonAuctionNotification } from 'lib/graphql';
import { TrackNotification } from './TrackNotification';

interface NotificationProps {
  notification: WonAuctionNotification;
  index: number;
}

export const WonAuctionNotificationItem = ({
  notification: { createdAt, price, trackId, trackName, artist, artworkUrl },
  index,
}: NotificationProps) => {
  const title = (
    <div>
      <span className="font-semibold">You</span> won the auction! Please complete the auction to get your NFT!
    </div>
  );
  return (
    <TrackNotification
      createdAt={createdAt}
      price={price}
      trackId={trackId}
      trackName={trackName}
      artist={artist}
      artworkUrl={artworkUrl}
      index={index}
      title={title}
    />
  );
};
