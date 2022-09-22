import { Profile, Track } from 'lib/graphql'
import { TrackGrid } from './TrackGrid'
import { ProfileGridItem } from './ProfileGridItem'

interface GridItemProps<T> {
  variant: 'track' | 'profile'
  handleOnPlayClicked?: (index: number) => void
  index?: number
  item: T
}

export const GridItem = <T extends unknown>(props: GridItemProps<T>) => {
  const { variant, item, handleOnPlayClicked, index } = props

  if (!item) return null

  if (variant === 'track') {
    if (!handleOnPlayClicked) return null

    const _item = item as unknown as Track

    return (
      <TrackGrid
        track={_item}
        coverPhotoUrl={_item.artworkUrl || ''}
        handleOnPlayClicked={() => handleOnPlayClicked(index || 0)}
      />
    )
  }

  if (variant === 'profile') {
    const _item = item as unknown as Profile

    return <ProfileGridItem profile={_item} />
  }

  return null
}
