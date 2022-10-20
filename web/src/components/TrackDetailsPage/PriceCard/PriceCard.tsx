/* eslint-disable @next/next/link-passhref */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Button } from 'components/Buttons/Button'
import { Divider } from 'components/common'
import { Matic } from 'components/Matic'
import { Ogun } from 'components/Ogun'
import { Song } from 'hooks/useAudioPlayer'
import { useTokenOwner } from 'hooks/useTokenOwner'
import { TrackQuery, useAuctionItemQuery } from 'lib/graphql'
import { default as Link, default as NextLink } from 'next/link'
import { useRouter } from 'next/router'
import tw from 'tailwind-styled-components'
import { isPendingRequest } from 'utils/isPendingRequest'
import { Auction } from './components/Auction'
import { Social } from './components/Social'
import { TrackSlider } from './components/TrackSlider'
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
  const router = useRouter()
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
  const isUnlisted = track.saleType ? false : true
  const isMultipleEdition = track.editionSize > 1
  const isProcessing =
    isPendingRequest(track.nftData?.pendingRequest) || isPendingRequest(track.trackEdition?.editionData?.pendingRequest)

  const shouldShowAuction = (isAuction && !isDeleted) || (isAuctionOver && !isDeleted)

  const { isOwner, loading: useOwnerIsLoading } = useTokenOwner(track.nftData?.tokenId, track.nftData?.contract)

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
              <NextLink
                href={{
                  pathname: `${router.pathname}/edit/buy-now`,
                  query: { ...router.query, isPaymentOGUN: isOgunPrice },
                }}
              >
                <a>
                  <Button variant="list-nft" className="w-[170px]" loading={isProcessing}>
                    <span className="py-4">EDIT</span>
                  </Button>
                </a>
              </NextLink>
            ) : (
              <NextLink
                href={{
                  pathname: `${router.pathname}/buy-now`,
                  query: { ...router.query, isPaymentOGUN: isOgunPrice },
                }}
              >
                <a>
                  <Button variant="rainbow" loading={isProcessing}>
                    <span className="p-4">BUY NOW</span>
                  </Button>
                </a>
              </NextLink>
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

      {isUnlisted && !isOwner && !shouldShowAuction && !useOwnerIsLoading && (
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
  flex-col
  items-center
  justify-center
  w-full
  mb-6
  gap-8
  mt-2

  md:flex-row
  md:justify-between
  md:items-start
  md:mb-8
  md:mt-2
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
