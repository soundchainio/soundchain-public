import { OutbidNotification } from 'lib/graphql'
import { TrackNotification } from './TrackNotification'

interface NotificationProps {
  notification: OutbidNotification
  index: number
}

export const OutbidNotificationItem = ({
  notification: { createdAt, price, trackId, trackName, artist, artworkUrl },
  index,
}: NotificationProps) => {
  const title = 'You have been outbid! You have to bid higher!'
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
