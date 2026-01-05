/* eslint-disable react/display-name */
import { GridView } from 'components/GridView/GridView'
import { ListView } from 'components/ListView/ListView'
import { useModalState } from 'contexts/ModalContext'
import { SelectToApolloQuery, SortListingItem } from 'lib/apollo/sorting'
import { SaleType, Track, useListingItemsQuery } from 'lib/graphql'
import { useEffect, useState, useCallback, useRef } from 'react'
import { GenreLabel } from 'utils/Genres'
import { SaleTypeLabel } from 'utils/SaleTypeLabel'
import { MarketplaceFilterWrapper } from './MarketplaceFilterWrapper'
import { OmnichainBillboard } from './OmnichainBillboard'
import { CHAINS } from '../constants/chains'

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
  } = useModalState() || {}

  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'single'>('grid')
  const [genres, setGenres] = useState<GenreLabel[] | undefined>(undefined)
  const [saleType, setSaleType] = useState<SaleTypeLabel | undefined>(undefined)
  const [acceptsMATIC, setAcceptsMATIC] = useState<boolean | undefined>(undefined)
  const [acceptsOGUN, setAcceptsOGUN] = useState<boolean | undefined>(undefined)
  const [sorting, setSorting] = useState<SortListingItem>(SortListingItem.CreatedAt)
  const [selectedChains, setSelectedChains] = useState<string[]>(['polygon'])
  const isInitialMount = useRef(true)

  const { data, refetch, fetchMore, loading, error } = useListingItemsQuery({
    variables: {
      page: { first: pageSize },
      sort: SelectToApolloQuery[sorting],
      filter: {},
    },
    ssr: false,
  })

  useEffect(() => {
    if (genresFromModal) setGenres(genresFromModal)
  }, [genresFromModal])

  useEffect(() => {
    if (filterSaleType) setSaleType(filterSaleType)
  }, [filterSaleType])

  useEffect(() => {
    if (filterAcceptsMATIC !== undefined) setAcceptsMATIC(filterAcceptsMATIC)
  }, [filterAcceptsMATIC])

  useEffect(() => {
    if (filterAcceptsOGUN !== undefined) setAcceptsOGUN(filterAcceptsOGUN)
  }, [filterAcceptsOGUN])

  useEffect(() => {
    // Skip refetch on initial mount - the query already runs with initial values
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    refetch({
      page: {
        first: pageSize,
      },
      sort: SelectToApolloQuery[sorting],
      filter: buildMarketplaceFilter(genres, saleType, acceptsMATIC, acceptsOGUN),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genres, saleType, sorting, acceptsMATIC, acceptsOGUN])

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

  const handleChainToggle = useCallback((chainId: string) => {
    setSelectedChains(prev =>
      prev.includes(chainId)
        ? prev.filter(id => id !== chainId)
        : [...prev, chainId]
    )
  }, [])

  const handleClearAllChains = useCallback(() => {
    setSelectedChains([])
  }, [])

  const handleSelectAllChains = useCallback(() => {
    const allChainIds = Object.keys(CHAINS)
    setSelectedChains(allChainIds)
  }, [])

  return (
    <>
      <OmnichainBillboard
        selectedChains={selectedChains}
        onChainToggle={handleChainToggle}
        onSelectAll={handleSelectAllChains}
        onClearAll={handleClearAllChains}
      />
      <MarketplaceFilterWrapper
        totalCount={data?.listingItems.pageInfo.totalCount}
        viewMode={viewMode}
        setViewMode={setViewMode}
        genres={genres}
        setGenres={setGenres}
        saleType={saleType}
        setSaleType={setSaleType}
        acceptedTokens={[]}
        setAcceptedTokens={() => {}}
        chainId={undefined}
        setChainId={() => {}}
        sorting={sorting}
        setSorting={setSorting}
        privateAssetOptions={[]}
        className="sm:flex-col md:flex-row"
      />
      {viewMode === 'grid' && (
        <GridView
          loading={loading}
          hasNextPage={data?.listingItems.pageInfo.hasNextPage}
          loadMore={loadMore}
          tracks={data?.listingItems.nodes as Track[]}
          refetch={refetch}
          className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-4 py-6"
        />
      )}
      {viewMode === 'list' && (
        <ListView
          loading={loading}
          hasNextPage={data?.listingItems.pageInfo.hasNextPage}
          loadMore={loadMore}
          tracks={data?.listingItems.nodes as Track[]}
          refetch={refetch}
        />
      )}
      {viewMode === 'single' && (
        <GridView
          loading={loading}
          hasNextPage={data?.listingItems.pageInfo.hasNextPage}
          loadMore={loadMore}
          tracks={data?.listingItems.nodes as Track[]}
          refetch={refetch}
          className="grid grid-cols-1 gap-6 px-4 py-6 max-w-2xl mx-auto"
        />
      )}
    </>
  )
}
