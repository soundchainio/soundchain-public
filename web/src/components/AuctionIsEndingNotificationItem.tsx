import { AuctionIsEndingNotification } from 'lib/graphql'
import { TrackNotification } from './TrackNotification'

interface NotificationProps {
  notification: AuctionIsEndingNotification
  index: number
}

export const AuctionIsEndingNotificationItem = ({
  notification: { createdAt, price, trackId, trackName, artworkUrl, artist },
  index,
}: NotificationProps) => {
  const title = 'The auction is ending in one hour, make sure you are winning!'
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
