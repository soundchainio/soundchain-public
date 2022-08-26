import { AuctionEndedNotification } from 'lib/graphql'
import { TrackNotification } from './TrackNotification'

interface NotificationProps {
  notification: AuctionEndedNotification
  index: number
}

export const AuctionEndedNotificationItem = ({
  notification: { createdAt, price, trackId, trackName, artist, artworkUrl },
  index,
}: NotificationProps) => {
  const title = 'Your auction is over! Check the results!'
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
  )
}
