import { Avatar } from 'components/Avatar'
import { GridView } from 'components/common'
import { DisplayName } from 'components/DisplayName'
import { InfiniteLoader } from 'components/InfiniteLoader'
import { NoResultFound } from 'components/NoResultFound'
import { ProfileListItemSkeleton } from 'components/ProfileListItemSkeleton'
import { useMe } from 'hooks/useMe'
import { RightArrow } from 'icons/RightArrow'
import { Profile, useFollowedArtistsLazyQuery } from 'lib/graphql'
import Link from 'next/link'
import { useCallback, useEffect } from 'react'
import PullToRefresh from 'react-simple-pull-to-refresh'

interface FavoriteArtistsProps {
  searchTerm: string
  isGrid?: boolean
}

export const FavoriteArtists = (props: FavoriteArtistsProps) => {
  const { searchTerm, isGrid } = props

  const me = useMe()
  const [artists, { data, loading, fetchMore: fetchMoreArtists, refetch }] = useFollowedArtistsLazyQuery()

  const onRefresh = useCallback(async () => refetch && (await refetch()), [refetch])

  const loadMore = () => {
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
  }, [artists, me, searchTerm])

  if (loading) {
    return (
      <div>
        <ProfileListItemSkeleton />
        <ProfileListItemSkeleton />
        <ProfileListItemSkeleton />
      </div>
    )
  }

  const followedArtists = data?.followedArtists?.nodes
  const pageInfo = data?.followedArtists?.pageInfo

  return (
    <>
      {isGrid ? (
        <GridView
          isLoading={loading}
          hasNextPage={pageInfo?.hasNextPage}
          loadMore={loadMore}
          list={followedArtists as Profile[]}
          variant="profile"
          refetch={refetch}
        />
      ) : (
        <PullToRefresh onRefresh={onRefresh} className="h-auto">
          <div className="bg-gray-25">
            {data?.followedArtists.nodes.map(followedArtist => (
              <div key={followedArtist.id} className="space-y-6 px-4 py-3">
                <Link href={`/profiles/${followedArtist.userHandle}`} passHref>
                  <div className="flex cursor-pointer flex-row items-center space-x-2 text-sm">
                    <Avatar pixels={40} className="flex" profile={followedArtist} />
                    <DisplayName
                      name={followedArtist.displayName}
                      verified={followedArtist.verified}
                      badges={followedArtist.badges}
                    />
                    <div className="flex flex-1 justify-end">
                      <RightArrow />
                    </div>
                  </div>
                </Link>
              </div>
            ))}
            {data?.followedArtists.nodes.length === 0 && !loading && <NoResultFound type="Artists" />}
            {data?.followedArtists.pageInfo.hasNextPage && (
              <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Artists" />
            )}
          </div>
        </PullToRefresh>
      )}
    </>
  )
}
