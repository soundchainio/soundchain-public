// import { Ogun } from 'components/Ogun'
// import { Matic } from 'components/Matic'
// import { useListingItemLazyQuery } from 'lib/graphql'
// import { HighestBid } from 'pages/tracks/[id]/complete-auction'
// import { Timer } from '../SingleTrackPage'
// import React, { useEffect, useState } from 'react'
import React from 'react'
export const PriceCard = () => {
  // const [price, setPrice] = useState(0)
  // const [OGUNprice, setOgunPrice] = useState(0)
  // const [highestBid, setHighestBid] = useState<HighestBid>({} as HighestBid)

  // const [fetchListingItem, { data: listingPayload, loading: loadingListingItem }] = useListingItemLazyQuery({
  //   fetchPolicy: 'network-only',
  //   nextFetchPolicy: 'network-only',
  // })
  // const { reservePriceToShow, pricePerItemToShow, OGUNPricePerItemToShow, id } = listingPayload?.listingItem ?? {}

  // const isBuyNow = true // Boolean(listingPayload?.listingItem?.pricePerItem)
  // const isPaymentOGUN = Boolean(listingPayload?.listingItem?.OGUNPricePerItemToShow != 0)
  // const isAuction = Boolean(listingPayload?.listingItem?.reservePrice)

  // const startingDate = new Date(listingPayload?.listingItem?.startingTime || 0 * 1000)
  // const futureSale = Boolean(startingDate.getTime() > new Date().getTime())

  // useEffect(() => {
  //   if (!highestBid.bid || !reservePriceToShow) return

  //   setPrice(highestBid.bid || reservePriceToShow || 0)
  // }, [highestBid.bid, reservePriceToShow])

  return (
    <div className="flex items-center justify-center rounded-xl bg-[#19191A] p-4">
      {/* {isBuyNow && (
        <div className="bg-[#112011]">
          {Boolean(price) && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="text-xs font-bold text-gray-80">MATIC BUY NOW PRICE</div>
              <Matic value={price} variant="currency-inline" className="text-xs" />
            </div>
          )}
          {Boolean(OGUNprice) && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="text-xs font-bold text-gray-80">OGUN BUY NOW PRICE</div>
              <Ogun value={OGUNprice} variant="currency" className="text-xs" showBonus />
            </div>
          )}
          {futureSale && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex-shrink-0 text-xs font-bold text-gray-80">SALE STARTS</div>
              <div className="flex items-center gap-1 text-right text-xs font-bold">
                <Timer date={startingDate || new Date()} reloadOnEnd />
              </div>
            </div>
          )}
        </div>
      )} */}
    </div>
  )
}
