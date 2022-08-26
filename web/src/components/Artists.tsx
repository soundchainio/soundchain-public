import { Avatar } from 'components/Avatar'
import { DisplayName } from 'components/DisplayName'
import { InfiniteLoader } from 'components/InfiniteLoader'
import { useMe } from 'hooks/useMe'
import { RightArrow } from 'icons/RightArrow'
import { useFollowedArtistsLazyQuery } from 'lib/graphql'
import Link from 'next/link'
import { useCallback, useEffect } from 'react'
import PullToRefresh from 'react-simple-pull-to-refresh'
import { NoResultFound } from './NoResultFound'
import { ProfileListItemSkeleton } from './ProfileListItemSkeleton'

interface ArtistsPageProps {
  searchTerm?: string
}

export const Artists = ({ searchTerm }: ArtistsPageProps) => {
  const me = useMe()
  const [artists, { data, loading, fetchMore: fetchMoreArtists, refetch }] = useFollowedArtistsLazyQuery()

  const onRefresh = useCallback(async () => refetch && (await refetch()), [refetch])

  const onLoadMore = () => {
    if (fetchMoreArtists)
      fetchMoreArtists({
        variables: {
          profileId: me?.profile.id,
          search: searchTerm,
          page: { after: data?.followedArtists.pageInfo.endCursor },
        },
      })
  }

  useEffect(() => {
    if (me?.profile.id) artists({ variables: { profileId: me.profile.id, search: searchTerm } })
  }, [me, searchTerm])

  if (loading) {
    return (
      <div>
        <ProfileListItemSkeleton />
        <ProfileListItemSkeleton />
        <ProfileListItemSkeleton />
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={onRefresh} className="h-auto">
      <div className="bg-gray-25">
        {data?.followedArtists.nodes.map(followedArtists => (
          <div key={followedArtists.id} className="space-y-6 px-4 py-3">
            <Link href={`/profiles/${followedArtists.userHandle}`} passHref>
              <div className="flex cursor-pointer flex-row items-center space-x-2 text-sm">
                <Avatar pixels={40} className="flex" profile={followedArtists} />
                <DisplayName name={followedArtists.displayName} verified={followedArtists.verified} />
                <div className="flex flex-1 justify-end">
                  <RightArrow />
                </div>
              </div>
            </Link>
          </div>
        ))}
        {data?.followedArtists.nodes.length === 0 && !loading && <NoResultFound type="Artists" />}
        {data?.followedArtists.pageInfo.hasNextPage && (
          <InfiniteLoader loadMore={onLoadMore} loadingMessage="Loading Artists" />
        )}
      </div>
    </PullToRefresh>
  )
}
