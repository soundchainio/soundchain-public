import { ExploreAll } from 'components/ExploreAll'
import { ExploreUsersListView } from 'components/ExploreUsersListView'
import React, { useEffect, useState } from 'react'
import { ExploreTab } from 'types/ExploreTabType'
import { SelectToApolloQuery, SortListingItem, SortListingParam } from 'lib/apollo/sorting'
import { SortExploreTracksField, Track, useExploreTracksQuery } from 'lib/graphql'
import { ListView } from 'components/ListView'
import { GridView } from 'components/common'
import { ExploreSearchBar } from './ExploreSearchBar'
import { ExploreUsersGridView } from './ExploreUsersGridView'
import { TabsMenu } from 'components/common'
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { TrackListItemSkeleton } from 'components/TrackListItemSkeleton'

export const Explore = () => {
  const [selectedTab, setSelectedTab] = useState<ExploreTab>(ExploreTab.ALL)
  const [search, setSearch] = useState('')
  const [isGrid, setIsGrid] = useState(true)
  const [sorting, setSorting] = useState<SortListingItem>(SortListingItem.CreatedAt)
  const { playlistState } = useAudioPlayerContext()

  const pageSize = 30

  const { data, refetch, fetchMore, loading } = useExploreTracksQuery({
    variables: {
      page: { first: pageSize },
      search,
      sort: SelectToApolloQuery[sorting] as unknown as SortListingParam<SortExploreTracksField>,
    },
    ssr: false,
  })

  useEffect(() => {
    setSearch('')
  }, [selectedTab])

  useEffect(() => {
    refetch({
      search,
      page: {
        first: pageSize,
      },
      sort: SelectToApolloQuery[sorting] as unknown as SortListingParam<SortExploreTracksField>,
    })
  }, [refetch, sorting, search])

  const loadMore = () => {
    fetchMore({
      variables: {
        search,
        page: {
          first: pageSize,
          after: data?.exploreTracks.pageInfo.endCursor,
        },
        sort: SelectToApolloQuery[sorting],
      },
    })
  }

  const { nodes = [], pageInfo = {} } = data?.exploreTracks ?? { nodes: [], pageInfo: { hasNextPage: true } }

  const handleOnPlayClicked = (index: number) => {
    const list = nodes.map(
      node =>
        ({
          trackId: node.id,
          src: node.playbackUrl,
          art: node.artworkUrl,
          title: node.title,
          artist: node.artist,
          isFavorite: node.isFavorite,
        } as Song),
    )
    playlistState(list, index)
  }

  const exploreTabList = [ExploreTab.ALL, ExploreTab.TRACKS, ExploreTab.USERS]

  return (
    <div className="h-full overflow-x-hidden bg-gray-10 md:px-2">
      <TabsMenu
        isGrid={isGrid}
        setIsGrid={setIsGrid}
        sorting={sorting}
        setSorting={setSorting}
        tabList={exploreTabList}
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
      />
      {[ExploreTab.USERS, ExploreTab.TRACKS].includes(selectedTab) && (
        <ExploreSearchBar searchTerm={search} setSearchTerm={searchTerm => setSearch(searchTerm)} />
      )}

      {loading || !data ? (
        <div>
          <TrackListItemSkeleton />
          <TrackListItemSkeleton />
          <TrackListItemSkeleton />
        </div>
      ) : (
        <>
          {selectedTab === ExploreTab.ALL && <ExploreAll setSelectedTab={setSelectedTab} />}

          {selectedTab === ExploreTab.USERS && (
            <>{isGrid ? <ExploreUsersGridView searchTerm={search} /> : <ExploreUsersListView searchTerm={search} />}</>
          )}
          {selectedTab === ExploreTab.TRACKS && (
            <>
              {isGrid ? (
                <GridView
                  isLoading={loading}
                  variant="track"
                  hasNextPage={pageInfo.hasNextPage}
                  loadMore={loadMore}
                  list={nodes as Track[]}
                  refetch={refetch}
                  handleOnPlayClicked={handleOnPlayClicked}
                />
              ) : (
                <ListView
                  loading={loading}
                  hasNextPage={pageInfo.hasNextPage}
                  loadMore={loadMore}
                  tracks={nodes as Track[]}
                  displaySaleBadge={true}
                  refetch={refetch}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
