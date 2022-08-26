import { NewBidNotification } from 'lib/graphql'
import { TrackNotification } from './TrackNotification'

interface NotificationProps {
  notification: NewBidNotification
  index: number
}

export const NewBidNotificationItem = ({
  notification: { createdAt, price, trackId, trackName, artist, artworkUrl },
  index,
}: NotificationProps) => {
  const title = 'Your auction got a new bid! Check it out!'
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
