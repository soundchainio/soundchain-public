import React from 'react'
import { ShoppingBag, Clock, Tag, Wallet, ExternalLink } from 'lucide-react'

interface TrackPriceCardProps {
  price?: {
    value: string
    currency: string
  }
  listingEndsAt?: string
  sellerName?: string
  sellerHandle?: string
  editionNumber?: number
  editionSize?: number
  onBuyClick?: () => void
  onMakeOfferClick?: () => void
  isLoading?: boolean
  isOwned?: boolean
  ownerAddress?: string
}

export const TrackPriceCard: React.FC<TrackPriceCardProps> = ({
  price,
  listingEndsAt,
  sellerName,
  sellerHandle,
  editionNumber,
  editionSize,
  onBuyClick,
  onMakeOfferClick,
  isLoading = false,
  isOwned = false,
  ownerAddress,
}) => {
  const formatTimeRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) return 'Ended'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h remaining`
  }

  const truncateAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="bg-gray-900/95 rounded-xl border border-white/5 overflow-hidden">
      {/* Header - Sale type indicator */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400">
            {price ? 'Listed for sale' : 'Not listed'}
          </span>
        </div>
        {listingEndsAt && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            {formatTimeRemaining(listingEndsAt)}
          </div>
        )}
      </div>

      {/* Price Section */}
      <div className="p-4 space-y-4">
        {price ? (
          <>
            {/* Current Price */}
            <div>
              <p className="text-xs text-gray-500 mb-1">Current price</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{price.value}</span>
                <span className="text-lg text-gray-400">{price.currency}</span>
              </div>
            </div>

            {/* Edition Info */}
            {editionNumber && editionSize && (
              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                  #{editionNumber} of {editionSize}
                </span>
              </div>
            )}

            {/* Buy Button - Prominent */}
            <div className="space-y-2">
              <button
                onClick={onBuyClick}
                disabled={isLoading}
                className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 text-black disabled:text-gray-500 font-semibold rounded-lg flex items-center justify-center gap-2 transition-all text-base"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <Wallet className="w-5 h-5" />
                    Buy now
                  </>
                )}
              </button>

              {onMakeOfferClick && (
                <button
                  onClick={onMakeOfferClick}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all border border-white/10"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Make offer
                </button>
              )}
            </div>
          </>
        ) : isOwned ? (
          <>
            {/* Owned - Not Listed */}
            <div className="text-center py-4">
              <p className="text-gray-400 mb-2">You own this item</p>
              <button
                onClick={onBuyClick}
                className="w-full py-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 font-medium rounded-lg flex items-center justify-center gap-2 transition-all border border-cyan-500/30"
              >
                <Tag className="w-4 h-4" />
                List for sale
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Not Listed */}
            <div className="text-center py-4">
              <p className="text-gray-500 mb-3">This item is not for sale</p>
              {onMakeOfferClick && (
                <button
                  onClick={onMakeOfferClick}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all border border-white/10"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Make offer
                </button>
              )}
            </div>
          </>
        )}

        {/* Seller/Owner Info */}
        {(sellerName || ownerAddress) && (
          <div className="pt-3 border-t border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {price ? 'Seller' : 'Owner'}
              </span>
              <div className="flex items-center gap-2">
                {sellerName ? (
                  <span className="text-sm text-cyan-400 hover:text-cyan-300 cursor-pointer">
                    {sellerName}
                  </span>
                ) : ownerAddress ? (
                  <span className="text-sm text-gray-400 font-mono">
                    {truncateAddress(ownerAddress)}
                  </span>
                ) : null}
                <ExternalLink className="w-3 h-3 text-gray-500" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TrackPriceCard
