import React, { useState } from 'react'
import { ChevronDown, ChevronUp, X, Filter, DollarSign, Layers, Music2, Sparkles } from 'lucide-react'
import { GenreLabel, GENRES } from 'utils/Genres'
import { SaleTypeLabel, SALE_TYPE_LABELS } from 'utils/SaleTypeLabel'
import { SortListingItem } from 'lib/apollo/sorting'

interface MarketplaceFilterSidebarProps {
  // Filters
  genres?: GenreLabel[]
  setGenres: (genres: GenreLabel[] | undefined) => void
  saleType?: SaleTypeLabel
  setSaleType: (saleType: SaleTypeLabel | undefined) => void
  acceptsMATIC?: boolean
  setAcceptsMATIC: (value: boolean | undefined) => void
  acceptsOGUN?: boolean
  setAcceptsOGUN: (value: boolean | undefined) => void
  sorting: SortListingItem
  setSorting: (sorting: SortListingItem) => void
  // Price range
  minPrice?: number
  maxPrice?: number
  setMinPrice?: (value: number | undefined) => void
  setMaxPrice?: (value: number | undefined) => void
  // UI
  isOpen?: boolean
  onClose?: () => void
  totalCount?: number
}

// Collapsible section component
const FilterSection = ({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  defaultOpen?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 px-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

// Filter chip component
const FilterChip = ({
  label,
  isActive,
  onClick,
}: {
  label: string
  isActive: boolean
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
      isActive
        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
        : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white'
    }`}
  >
    {label}
  </button>
)

export const MarketplaceFilterSidebar: React.FC<MarketplaceFilterSidebarProps> = ({
  genres,
  setGenres,
  saleType,
  setSaleType,
  acceptsMATIC,
  setAcceptsMATIC,
  acceptsOGUN,
  setAcceptsOGUN,
  sorting,
  setSorting,
  minPrice,
  maxPrice,
  setMinPrice,
  setMaxPrice,
  isOpen = true,
  onClose,
  totalCount,
}) => {
  const activeFilterCount = [
    genres?.length ? 1 : 0,
    saleType ? 1 : 0,
    acceptsMATIC ? 1 : 0,
    acceptsOGUN ? 1 : 0,
    minPrice || maxPrice ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const clearAllFilters = () => {
    setGenres(undefined)
    setSaleType(undefined)
    setAcceptsMATIC(undefined)
    setAcceptsOGUN(undefined)
    setMinPrice?.(undefined)
    setMaxPrice?.(undefined)
  }

  const toggleGenre = (genre: GenreLabel) => {
    const current = genres || []
    const exists = current.some((g) => g.key === genre.key)
    if (exists) {
      const newGenres = current.filter((g) => g.key !== genre.key)
      setGenres(newGenres.length > 0 ? newGenres : undefined)
    } else {
      setGenres([...current, genre])
    }
  }

  const isGenreActive = (genre: GenreLabel) =>
    genres?.some((g) => g.key === genre.key) ?? false

  return (
    <aside
      className={`
        w-72 bg-gray-900/95 backdrop-blur-sm border-r border-white/5
        flex flex-col h-full overflow-hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        transition-transform duration-200
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-cyan-400" />
          <span className="font-semibold text-white">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors lg:hidden"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Results Count */}
      {totalCount !== undefined && (
        <div className="px-4 py-3 border-b border-white/5">
          <span className="text-sm text-gray-400">
            <span className="text-white font-medium">{totalCount.toLocaleString()}</span> items
          </span>
        </div>
      )}

      {/* Clear All */}
      {activeFilterCount > 0 && (
        <div className="px-4 py-2 border-b border-white/5">
          <button
            onClick={clearAllFilters}
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Filter Sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Sort */}
        <FilterSection title="Sort By" icon={Sparkles}>
          <select
            value={sorting}
            onChange={(e) => setSorting(e.target.value as SortListingItem)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
          >
            <option value={SortListingItem.CreatedAt}>Newest First</option>
            <option value={SortListingItem.PricePerItem}>Lowest Price</option>
            <option value={SortListingItem.PricePerItemDesc}>Highest Price</option>
            <option value={SortListingItem.PlaybackCount}>Most Played</option>
          </select>
        </FilterSection>

        {/* Sale Type */}
        <FilterSection title="Sale Type" icon={Layers}>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              label="All"
              isActive={!saleType}
              onClick={() => setSaleType(undefined)}
            />
            {SALE_TYPE_LABELS.map((type) => (
              <FilterChip
                key={type.key}
                label={type.label}
                isActive={saleType?.key === type.key}
                onClick={() => setSaleType(saleType?.key === type.key ? undefined : type)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Payment Token */}
        <FilterSection title="Payment Token" icon={DollarSign}>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={acceptsMATIC ?? false}
                onChange={(e) => setAcceptsMATIC(e.target.checked || undefined)}
                className="w-4 h-4 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500/50"
              />
              <div className="flex items-center gap-2">
                <span className="text-base">🟣</span>
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                  POL (Polygon)
                </span>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={acceptsOGUN ?? false}
                onChange={(e) => setAcceptsOGUN(e.target.checked || undefined)}
                className="w-4 h-4 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500/50"
              />
              <div className="flex items-center gap-2">
                <span className="text-base">🎵</span>
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                  OGUN
                </span>
              </div>
            </label>
          </div>
        </FilterSection>

        {/* Price Range */}
        {setMinPrice && setMaxPrice && (
          <FilterSection title="Price Range" icon={DollarSign} defaultOpen={false}>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice || ''}
                onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : undefined)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
              />
              <span className="text-gray-500">to</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice || ''}
                onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </FilterSection>
        )}

        {/* Genres */}
        <FilterSection title="Genres" icon={Music2} defaultOpen={false}>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {GENRES.map((genre) => (
              <FilterChip
                key={genre.key}
                label={genre.label}
                isActive={isGenreActive(genre)}
                onClick={() => toggleGenre(genre)}
              />
            ))}
          </div>
        </FilterSection>
      </div>
    </aside>
  )
}

export default MarketplaceFilterSidebar
