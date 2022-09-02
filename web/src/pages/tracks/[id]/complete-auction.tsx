import { Button } from 'components/Button'
import { AuctionEnded } from 'components/details-NFT/AuctionEnded'
import { Matic } from 'components/Matic'
import PlayerAwareBottomBar from 'components/PlayerAwareBottomBar'
import { TopNavBarProps } from 'components/TopNavBar'
import { TotalPrice } from 'components/TotalPrice'
import { Track } from 'components/Track'
import useBlockchain from 'hooks/useBlockchain'
import useBlockchainV2 from 'hooks/useBlockchainV2'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMe } from 'hooks/useMe'
import { useWalletContext } from 'hooks/useWalletContext'
import { CheckmarkFilled } from 'icons/CheckmarkFilled'
import { cacheFor } from 'lib/apollo'
import { PendingRequest, TrackDocument, TrackQuery, useAuctionItemQuery, useUpdateTrackMutation } from 'lib/graphql'
import { protectPage } from 'lib/protectPage'
import { useRouter } from 'next/router'
import { ParsedUrlQuery } from 'querystring'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { priceToShow } from 'utils/format'
import { compareWallets } from 'utils/Wallet'
import SEO from '../../../components/SEO'

export interface TrackPageProps {
  track: TrackQuery['track']
}

export interface HighestBid {
  bid: number
  bidder: string
}

interface TrackPageParams extends ParsedUrlQuery {
  id: string
}

export const getServerSideProps = protectPage<TrackPageProps, TrackPageParams>(async (context, apolloClient) => {
  const trackId = context.params?.id

  if (!trackId) {
    return { notFound: true }
  }

  const { data, error } = await apolloClient.query({
    query: TrackDocument,
    variables: { id: trackId },
    context,
  })

  if (error) {
    return { notFound: true }
  }

  return cacheFor(CompleteAuctionPage, { track: data.track }, context, apolloClient)
})

const topNavBarProps: TopNavBarProps = {
  title: 'Complete Auction',
}

export default function CompleteAuctionPage({ track }: TrackPageProps) {
  const { getHighestBid } = useBlockchain()
  const { resultAuction } = useBlockchainV2()
  const { account, web3 } = useWalletContext()
  const [trackUpdate] = useUpdateTrackMutation()
  const [loading, setLoading] = useState(false)
  const [highestBid, setHighestBid] = useState<HighestBid>({} as HighestBid)
  const me = useMe()
  const router = useRouter()
  const { setTopNavBarProps } = useLayoutContext()

  const tokenId = track.nftData?.tokenId ?? -1

  const { data: auctionItem } = useAuctionItemQuery({
    variables: { tokenId },
  })

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const fetchHighestBid = async () => {
      if (!web3 || !tokenId || !getHighestBid || highestBid.bidder) {
        return
      }
      const { _bid, _bidder } = await getHighestBid(web3, tokenId, { nft: track.nftData?.contract })
      setHighestBid({ bid: priceToShow(_bid), bidder: _bidder })
    }
    fetchHighestBid()
  }, [tokenId, web3, getHighestBid, highestBid.bidder, track])

  if (!auctionItem) {
    return null
  }

  const isOwner = compareWallets(auctionItem.auctionItem.auctionItem?.owner, account)
  const saleEnded = (auctionItem.auctionItem?.auctionItem?.endingTime || 0) < Math.floor(Date.now() / 1000)

  const handleClaim = () => {
    if (!web3 || !auctionItem.auctionItem?.auctionItem?.tokenId || !account) {
      return
    }
    const onReceipt = async () => {
      await trackUpdate({
        variables: {
          input: {
            trackId: track.id,
            nftData: {
              pendingRequest: PendingRequest.CompleteAuction,
              pendingTime: new Date().toISOString(),
            },
          },
        },
      })
      router.replace(router.asPath.replace('complete-auction', ''))
    }
    setLoading(true)
    resultAuction(tokenId, account, {
      nft: track.nftData?.contract,
      auction: auctionItem.auctionItem.auctionItem.contract,
    })
      .onReceipt(onReceipt)
      .onError(cause => toast.error(cause.message))
      .finally(() => setLoading(false))
      .execute(web3)
  }

  if (
    (account !== highestBid.bidder && !isOwner) ||
    !saleEnded ||
    !me ||
    track.nftData?.pendingRequest != PendingRequest.None
  ) {
    return null
  }

  const winningBid = highestBid.bid

  return (
    <>
      <SEO
        title={`Complete auction | SoundChain`}
        description={`Complete auction of ${track.title} - song by ${track.artist}.`}
        canonicalUrl={`/tracks/${track.id}/complete-auction/`}
        image={track.artworkUrl}
      />
      <div className="flex min-h-full flex-col">
        <div className="flex flex-1 flex-col justify-between">
          <div>
            <div className="m-4">
              <Track track={track} />
            </div>
            <p className="m-8 text-center text-xs font-bold text-green-600">
              <CheckmarkFilled className="inline" /> Congrats, you {isOwner ? 'sold' : 'won'} this NFT!
            </p>
            <div className="flex bg-[#111920] p-5 text-gray-80">
              <p className="md-text-sm flex flex-shrink-0 items-center justify-start text-xs font-bold uppercase">
                winning bid
              </p>
              <p className="flex w-full items-center justify-end">
                <Matic value={winningBid} />
              </p>
            </div>
            <div className="flex bg-[#111920] p-5 text-gray-80">
              <p className="md-text-sm flex flex-shrink-0 items-center justify-start text-xs font-bold uppercase">
                time reaming
              </p>
              <p className="flex w-full items-center justify-end">
                <span className="mx-1 text-xs font-bold uppercase leading-tight text-red-500">auction ended</span>
              </p>
            </div>
          </div>

          <AuctionEnded highestBid={highestBid} />
        </div>
        <PlayerAwareBottomBar>
          <TotalPrice price={winningBid} />
          <Button className="ml-auto" variant="buy-nft" onClick={handleClaim} loading={loading}>
            <div className="px-4">COMPLETE</div>
          </Button>
        </PlayerAwareBottomBar>
      </div>
    </>
  )
}
