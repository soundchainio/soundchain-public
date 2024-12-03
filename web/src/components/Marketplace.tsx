/* eslint-disable react/display-name */
import { GridView } from 'components/GridView'
import { ListView } from 'components/ListView'
import { useModalState } from 'contexts/providers/modal'
import { SelectToApolloQuery, SortListingItem } from 'lib/apollo/sorting'
import { SaleType, Track, useListingItemsQuery } from 'lib/graphql'
import { useEffect, useState } from 'react'
import { GenreLabel } from 'utils/Genres'
import { SaleTypeLabel } from 'utils/SaleTypeLabel'
import { MarketplaceFilterWrapper } from './MarketplaceFilterWrapper'

interface ListingItem {
  saleType?: SaleType | undefined
  acceptsMATIC?: boolean | undefined
  acceptsOGUN?: boolean | undefined
}

const buildMarketplaceFilter = (
  genres: GenreLabel[] | undefined,
  saleType: SaleTypeLabel | undefined,
  acceptsMATIC: boolean | undefined,
  acceptsOGUN: boolean | undefined,
) => {
  const listingItem: ListingItem = {}

  if (saleType) {
    listingItem.saleType = saleType.key
  }

  if (acceptsMATIC) {
    listingItem.acceptsMATIC = acceptsMATIC
  }

  if (acceptsOGUN) {
    listingItem.acceptsOGUN = acceptsOGUN
  }

  return {
    ...(genres?.length && { genres: genres.map(genre => genre.key) }),
    ...(Object.keys(listingItem).length > 0 && {
      listingItem: listingItem,
    }),
  }
}

export const Marketplace = () => {
  const pageSize = 30
  const {
    genres: genresFromModal,
    filterSaleType,
    acceptsMATIC: filterAcceptsMATIC,
    acceptsOGUN: filterAcceptsOGUN,
  } = useModalState()
  const [isGrid, setIsGrid] = useState(true)
  const [genres, setGenres] = useState<GenreLabel[] | undefined>(undefined)
  const [saleType, setSaleType] = useState<SaleTypeLabel | undefined>(undefined)
  const [acceptsMATIC, setAcceptsMATIC] = useState<boolean | undefined>(undefined)
  const [acceptsOGUN, setAcceptsOGUN] = useState<boolean | undefined>(undefined)
  const [sorting, setSorting] = useState<SortListingItem>(SortListingItem.CreatedAt)

  const { data, refetch, fetchMore, loading } = useListingItemsQuery({
    variables: {
      page: { first: pageSize },
      sort: SelectToApolloQuery[sorting],
      filter: {},
    },
    ssr: false,
  })

  useEffect(() => genresFromModal && setGenres(genresFromModal), [genresFromModal])
  useEffect(() => filterSaleType && setSaleType(filterSaleType), [filterSaleType])
  useEffect(() => setAcceptsMATIC(filterAcceptsMATIC), [filterAcceptsMATIC])
  useEffect(() => setAcceptsOGUN(filterAcceptsOGUN), [filterAcceptsOGUN])

  useEffect(() => {
    refetch({
      page: {
        first: pageSize,
      },
      sort: SelectToApolloQuery[sorting],
      filter: buildMarketplaceFilter(genres, saleType, acceptsMATIC, acceptsOGUN),
    })
  }, [genres, saleType, refetch, sorting, acceptsMATIC, acceptsOGUN])

  const loadMore = () => {
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: data?.listingItems.pageInfo.endCursor,
        },
        sort: SelectToApolloQuery[sorting],
        filter: buildMarketplaceFilter(genres, saleType, acceptsMATIC, acceptsOGUN),
      },
    })
  }

  return (
    <>
      <MarketplaceFilterWrapper
        totalCount={data?.listingItems.pageInfo.totalCount}
        isGrid={isGrid}
        setIsGrid={setIsGrid}
        genres={genres}
        setGenres={setGenres}
        saleType={saleType}
        setSaleType={setSaleType}
        acceptsMATIC={acceptsMATIC}
        setAcceptsMATIC={setAcceptsMATIC}
        acceptsOGUN={acceptsOGUN}
        setAcceptsOGUN={setAcceptsOGUN}
        sorting={sorting}
        setSorting={setSorting}
      />
      {isGrid ? (
        <GridView
          loading={loading}
          hasNextPage={data?.listingItems.pageInfo.hasNextPage}
          loadMore={loadMore}
          tracks={data?.listingItems.nodes as Track[]}
          refetch={refetch}
        />
      ) : (
        <ListView
          loading={loading}
          hasNextPage={data?.listingItems.pageInfo.hasNextPage}
          loadMore={loadMore}
          tracks={data?.listingItems.nodes as Track[]}
          refetch={refetch}
        />
      )}
    </>
  )
}
