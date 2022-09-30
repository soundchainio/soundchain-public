/* eslint-disable @typescript-eslint/no-unused-vars */
import { Ogun } from 'components/Ogun'
import { Matic } from 'components/Matic'
import { TrackQuery, useListingItemLazyQuery, useTrackLazyQuery } from 'lib/graphql'
import { HighestBid } from 'pages/tracks/[id]/complete-auction'
import React, { useEffect, useState } from 'react'
import { Timer } from './Timer'
import { RainbowButton } from 'components/Buttons/RainbowButton'
import { Social } from './Social'
import tw from 'tailwind-styled-components'
import { Divider } from 'components/common'
import { TrackSlider } from './TrackSlider'
import { Song } from 'hooks/useAudioPlayer'
interface Props {
  track: TrackQuery['track']
}

export const PriceCard = (props: Props) => {
  const { track } = props

  const [maticPrice, setMaticPrice] = useState(0)
  const [OGUNprice, setOgunPrice] = useState(0)
  const [highestBid, setHighestBid] = useState<HighestBid>({} as HighestBid)

  const [fetchListingItem, { data: listingPayload, loading: loadingListingItem }] = useListingItemLazyQuery({
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'network-only',
  })

  const [refetchTrack, { data: trackData }] = useTrackLazyQuery({
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'network-only',
  })

  const { reservePriceToShow, pricePerItemToShow, OGUNPricePerItemToShow, id } = listingPayload?.listingItem ?? {}

  const isBuyNow = Boolean(listingPayload?.listingItem?.pricePerItem)
  const isPaymentOGUN = Boolean(listingPayload?.listingItem?.OGUNPricePerItemToShow != 0)
  const isAuction = Boolean(listingPayload?.listingItem?.reservePrice)

  const nftData = trackData?.track.nftData || track.nftData
  const tokenId = nftData?.tokenId
  const contractAddress = nftData?.contract

  const startingDate = new Date(listingPayload?.listingItem?.startingTime || 0 * 1000)
  const isFutureSale = Boolean(startingDate.getTime() > new Date().getTime())

  useEffect(() => {
    if (!highestBid.bid || !reservePriceToShow) return

    setMaticPrice(highestBid.bid || reservePriceToShow || 0)
  }, [highestBid.bid, reservePriceToShow])

  useEffect(() => {
    if (!tokenId || !contractAddress) return

    fetchListingItem({
      variables: { input: { tokenId, contractAddress } },
    })
  }, [contractAddress, fetchListingItem, tokenId])

  useEffect(() => {
    if (!OGUNPricePerItemToShow) return

    setOgunPrice(OGUNPricePerItemToShow)
  }, [OGUNPricePerItemToShow])

  const song: Song = {
    trackId: track.id,
    src: track.playbackUrl,
    art: track.artworkUrl,
    title: track.title,
    artist: track.artist,
    isFavorite: track.isFavorite,
  }

  return (
    <Container>
      <TrackSlider song={song} />

      {isBuyNow && (
        <PriceContainer>
          <span>
            {Boolean(maticPrice) && <Matic value={maticPrice} variant="currency-inline" className="text-xs" />}
            {Boolean(OGUNprice) && <Ogun value={OGUNprice} variant="currency" className="text-xs" showBonus />}
            {isFutureSale && <Timer date={startingDate} reloadOnEnd />}
          </span>
          <RainbowButton className="rounded-lg" variant="rainbow">
            <span className="p-4">BUY NOW</span>
          </RainbowButton>
        </PriceContainer>
      )}

      <Divider />

      <Social trackId={track.id} />
    </Container>
  )
}

const Container = tw.div`
  flex 
  min-w-[320px] 
  max-w-[350px]
  sm:max-w-[800px]
  flex-col 
  items-center 
  justify-center 
  gap-8 
  rounded-xl 
  bg-[#19191A] 
  p-6
  w-full
`

const PriceContainer = tw.div`
  flex 
  items-start 
  justify-between
  w-full
`
