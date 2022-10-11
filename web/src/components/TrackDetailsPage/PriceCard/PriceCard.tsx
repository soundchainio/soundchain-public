/* eslint-disable @next/next/link-passhref */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react'
import tw from 'tailwind-styled-components'
import Link from 'next/link'
import { Ogun } from 'components/Ogun'
import { Matic } from 'components/Matic'
import { TrackQuery } from 'lib/graphql'
import { Social } from './components/Social'
import { Divider } from 'components/common'
import { TrackSlider } from './components/TrackSlider'
import { Song } from 'hooks/useAudioPlayer'
import { Button } from 'components/Buttons/Button'
import { Auction } from './components/Auction'

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

  const isBuyNow = track.saleType === SaleType.BuyNow
  const isAuction = track.saleType === SaleType.Auction
  const price = track.price.value
  const isOgunPrice = track.price.currency === CurrencyType.Ogun
  const isMaticPrice = track.price.currency === CurrencyType.Matic
  const isUnlisted = !track.saleType
  const isMultipleEdition = track.editionSize > 1

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
        <>
          <PriceContainer>
            <span>
              {isMaticPrice && <Matic value={price} variant="currency-inline" className="text-xs" />}
              {isOgunPrice && <Ogun value={price} variant="currency" className="text-xs" showBonus />}
            </span>
            <Link href={`${track.id}/buy-now`}>
              <Button variant="rainbow">
                <span className="p-4">BUY NOW</span>
              </Button>
            </Link>
          </PriceContainer>
          <Divider />
        </>
      )}

      {isAuction && <Auction track={track} />}

      {isUnlisted && !isMultipleEdition && (
        <>
          <PriceContainer>
            <Link href={`${track.id}/list`}>
              <a className="my-4 w-full">
                <Button variant="list-nft">
                  <ButtonTitle>LIST</ButtonTitle>
                </Button>
              </a>
            </Link>
          </PriceContainer>
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
`
const ButtonTitle = tw.span`
  text-sm 
  font-bold 
  leading-6 
  tracking-wide
  text-white

  hover:text-blue-300
`
