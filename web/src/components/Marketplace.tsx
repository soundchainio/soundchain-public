/* eslint-disable react/display-name */
import { GridView } from 'components/common/GridView/GridView'
import { ListView } from 'components/ListView/ListView'
import { useModalState } from 'contexts/ModalContext'
import { SelectToApolloQuery, SortListingItem } from 'lib/apollo/sorting'
import { SaleType, Track, useListingItemsQuery } from 'lib/graphql'
import { useEffect, useState, useCallback, useRef } from 'react'
import { GenreLabel } from 'utils/Genres'
import { SaleTypeLabel } from 'utils/SaleTypeLabel'
import { MarketplaceFilterSidebar } from './MarketplaceFilterSidebar'
import { OmnichainBillboard } from './OmnichainBillboard'
import { CHAINS } from '../constants/chains'
import { Filter, LayoutGrid, List, Square, X } from 'lucide-react'

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

  const [showSidebar, setShowSidebar] = useState(true)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)

  return (
    <div className="min-h-screen bg-black">
      {/* Chain Selector Banner */}
      <OmnichainBillboard
        selectedChains={selectedChains}
        onChainToggle={handleChainToggle}
        onSelectAll={handleSelectAllChains}
        onClearAll={handleClearAllChains}
      />

      {/* Main Layout - Sidebar + Content */}
      <div className="flex relative">
        {/* Desktop Sidebar */}
        <div className={`hidden lg:block sticky top-16 h-[calc(100vh-4rem)] transition-all duration-200 ${showSidebar ? 'w-72' : 'w-0 overflow-hidden'}`}>
          <MarketplaceFilterSidebar
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
            totalCount={data?.listingItems.pageInfo.totalCount}
            isOpen={showSidebar}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {showMobileSidebar && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowMobileSidebar(false)} />
            <div className="absolute left-0 top-0 h-full">
              <MarketplaceFilterSidebar
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
                totalCount={data?.listingItems.pageInfo.totalCount}
                isOpen={true}
                onClose={() => setShowMobileSidebar(false)}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Top Bar - View Controls */}
          <div className="sticky top-16 z-30 bg-black/95 backdrop-blur-sm border-b border-white/5 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Left - Filter toggle + Results count */}
              <div className="flex items-center gap-3">
                {/* Mobile Filter Button */}
                <button
                  onClick={() => setShowMobileSidebar(true)}
                  className="lg:hidden flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-sm">Filters</span>
                </button>

                {/* Desktop Sidebar Toggle */}
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="hidden lg:flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {showSidebar ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                  <span className="text-sm">{showSidebar ? 'Hide' : 'Filters'}</span>
                </button>

                {/* Results Count */}
                <span className="text-sm text-gray-400">
                  <span className="text-white font-medium">
                    {data?.listingItems.pageInfo.totalCount?.toLocaleString() || '0'}
                  </span>{' '}
                  items
                </span>
              </div>

              {/* Right - View Mode Toggle */}
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('single')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'single' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  title="Single View"
                >
                  <Square className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Grid Content */}
          {viewMode === 'grid' && (
            <GridView
              loading={loading}
              hasNextPage={data?.listingItems.pageInfo.hasNextPage}
              loadMore={loadMore}
              tracks={data?.listingItems.nodes as Track[]}
              refetch={refetch}
              cardStyle="modern"
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
              className="max-w-2xl mx-auto"
              cardStyle="flip"
            />
          )}
        </div>
      </div>
    </div>
  )
}
