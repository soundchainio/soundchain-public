/* eslint-disable @next/next/link-passhref */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react'
import tw from 'tailwind-styled-components'
import Link from 'next/link'
import { Ogun } from 'components/Ogun'
import { Matic } from 'components/Matic'
import { TrackQuery, useAuctionItemQuery } from 'lib/graphql'
import { Social } from './components/Social'
import { Divider } from 'components/common'
import { TrackSlider } from './components/TrackSlider'
import { Song } from 'hooks/useAudioPlayer'
import { Button } from 'components/Buttons/Button'
import { Auction } from './components/Auction'
import { useTokenOwner } from 'hooks/useTokenOwner'
import { isPendingRequest } from 'utils/isPendingRequest'
interface Props {
  track: TrackQuery['track']
}

enum SaleType {
  Auction = 'auction',
  BuyNow = 'buy now',
}

enum CurrencyType {
  Ogun = 'OGUN',
  Matic = 'MATIC',
}

export const PriceCard = (props: Props) => {
  const { track } = props

  const { data: { auctionItem } = {} } = useAuctionItemQuery({
    variables: { tokenId: track.nftData?.tokenId as number },
    skip: !track?.nftData?.tokenId,
  })

  const isBuyNow = track.saleType === SaleType.BuyNow
  const isAuction = track.saleType === SaleType.Auction
  const isAuctionOver = (auctionItem?.auctionItem?.endingTime || 0) < Math.floor(Date.now() / 1000)

  const price = track.price.value
  const isOgunPrice = track.price.currency === CurrencyType.Ogun
  const isMaticPrice = track.price.currency === CurrencyType.Matic
  const isDeleted = track.deleted
  const isUnlisted = !track.saleType
  const isMultipleEdition = track.editionSize > 1
  const isProcessing =
    isPendingRequest(track.nftData?.pendingRequest) || isPendingRequest(track.trackEdition?.editionData?.pendingRequest)

  const shouldShowAuction = (isAuction && !isDeleted) || (isAuctionOver && !isDeleted)

  const { isOwner } = useTokenOwner(track.nftData?.tokenId, track.nftData?.contract)

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

      {isBuyNow && !isDeleted && !isMultipleEdition && (
        <>
          <PriceContainer>
            <span>
              {isMaticPrice && <Matic value={price} variant="currency-inline" className="text-xs" />}
              {isOgunPrice && <Ogun value={price} variant="currency" className="text-xs" showBonus />}
            </span>
            {isOwner ? (
              <Link href={`${track.id}/edit/buy-now`}>
                <a>
                  <Button variant="list-nft" className="w-[170px]" loading={isProcessing}>
                    <span className="py-4">EDIT</span>
                  </Button>
                </a>
              </Link>
            ) : (
              <Link href={`${track.id}/buy-now`}>
                <a>
                  <Button variant="rainbow" loading={isProcessing}>
                    <span className="p-4">BUY NOW</span>
                  </Button>
                </a>
              </Link>
            )}
          </PriceContainer>
          <Divider />
        </>
      )}

      {shouldShowAuction && <Auction track={track} />}

      {isUnlisted && !isMultipleEdition && !isDeleted && isOwner && (
        <>
          <PriceContainer>
            <Link href={`${track.id}/list`}>
              <a className="my-4 w-full">
                <Button variant="list-nft" loading={isProcessing}>
                  <ButtonTitle>LIST</ButtonTitle>
                </Button>
              </a>
            </Link>
          </PriceContainer>
          <Divider />
        </>
      )}

      {isUnlisted && !isOwner && !shouldShowAuction && (
        <>
          <Paragraph>This track has not been listed</Paragraph>
          <Divider />
        </>
      )}

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
  gap-2
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
  mt-2
  mb-6
`
const ButtonTitle = tw.span`
  text-sm 
  font-bold 
  leading-6 
  tracking-wide
  text-white

  hover:text-blue-300
`
const Paragraph = tw.p`
  text-lg
  text-neutral-400
  mt-2
  mb-4
`
