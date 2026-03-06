import { ListNFTAuction, ListNFTAuctionFormValues } from 'components/pages/details-NFT/ListNFTAuction'
import { TopNavBarProps } from 'components/TopNavBar'
import { Track } from 'components/Track'
import { useModalDispatch } from 'contexts/ModalContext'
import useBlockchainV2 from 'hooks/useBlockchainV2'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMe } from 'hooks/useMe'
import { useWalletContext } from 'hooks/useWalletContext'
import { cacheFor } from 'lib/apollo'
import { PendingRequest, TrackDocument, TrackQuery, useAuctionItemQuery, useUpdateTrackMutation } from 'lib/graphql'
import { protectPage } from 'lib/protectPage'
import { useRouter } from 'next/router'
import { ParsedUrlQuery } from 'querystring'
import { useCallback, useEffect, useMemo } from 'react'
import { toast } from 'react-toastify'
import { SaleType } from 'lib/graphql'
import { compareWallets } from 'utils/Wallet'
import SEO from '../../../../components/SEO'

export interface TrackPageProps {
  track: TrackQuery['track']
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

  return cacheFor(EditBuyNowPage, { track: data.track }, context, apolloClient)
})

export default function EditBuyNowPage({ track }: TrackPageProps) {
  const router = useRouter()
  const { updateAuction } = useBlockchainV2()
  const { dispatchShowRemoveListingModal } = useModalDispatch()
  const [trackUpdate] = useUpdateTrackMutation()
  const { account, web3 } = useWalletContext()
  const { setTopNavBarProps } = useLayoutContext()
  const me = useMe()

  const nftData = track.nftData
  const tokenId = nftData?.tokenId ?? -1

  const { data: listingPayload } = useAuctionItemQuery({
    variables: { tokenId },
  })

  const handleRemove = useCallback(() => {
    if (
      !web3 ||
      !listingPayload?.auctionItem?.auctionItem?.tokenId ||
      !account ||
      nftData?.pendingRequest != PendingRequest.None
    ) {
      return
    }
    dispatchShowRemoveListingModal({
      show: true,
      tokenId: listingPayload.auctionItem?.auctionItem?.tokenId,
      trackId: track.id,
      saleType: SaleType.Auction,
      contractAddresses: { nft: nftData.contract },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, listingPayload?.auctionItem?.auctionItem?.tokenId, nftData?.pendingRequest, track.id, web3])

  const RemoveListing = useMemo(
    () => (
      <button className="text-sm font-bold text-red-400" onClick={handleRemove}>
        Remove Listing
      </button>
    ),
    [handleRemove],
  )

  const topNavBarProps: TopNavBarProps = useMemo(
    () => ({
      title: 'Edit Listing',
      rightButton: RemoveListing,
    }),
    [RemoveListing],
  )

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps, topNavBarProps])

  if (!listingPayload) {
    return null
  }

  const isOwner = compareWallets(listingPayload.auctionItem?.auctionItem?.owner, account)
  const isForSale = !!listingPayload.auctionItem?.auctionItem?.reservePrice // Removed ?? false
  const startPrice = listingPayload.auctionItem.auctionItem?.reservePriceToShow
  const startingTime = listingPayload.auctionItem.auctionItem?.startingTime
    ? new Date(listingPayload.auctionItem.auctionItem?.startingTime * 1000)
    : undefined
  const endingTime = listingPayload.auctionItem.auctionItem?.endingTime
    ? new Date(listingPayload.auctionItem.auctionItem?.endingTime * 1000)
    : undefined

  const handleUpdate = ({ price, startTime, endTime }: ListNFTAuctionFormValues) => {
    if (!web3 || !listingPayload.auctionItem?.auctionItem?.tokenId || !account) {
      return
    }
    const weiPrice = web3?.utils.toWei(price.toString(), 'ether') || '0'
    const startTimestamp = startTime.getTime() / 1000
    const endTimestamp = endTime.getTime() / 1000

    const onTransactionReceipt = () => {
      trackUpdate({
        variables: {
          input: {
            trackId: track.id,
            nftData: {
              pendingRequest: PendingRequest.UpdateListing,
            },
          },
        },
      })
      router.replace(router.asPath.replace('edit/auction', ''))
    }

    updateAuction(listingPayload.auctionItem?.auctionItem?.tokenId, weiPrice, startTimestamp, endTimestamp, account, {
      nft: nftData?.contract,
      auction: listingPayload.auctionItem?.auctionItem?.contract,
    })
      .onReceipt(onTransactionReceipt)
      .onError(cause => toast.error(cause.message))
      .execute(web3)
  }

  if (!isForSale || !isOwner || !me || !track || nftData?.pendingRequest != PendingRequest.None) {
    return null
  }

  return (
    <>
      <SEO title="Edit Listing | SoundChain" description="Edit Auction Listing" canonicalUrl={router.asPath} />
      <div className="m-4">
        <Track track={track} />
      </div>
      <ListNFTAuction
        handleSubmit={handleUpdate}
        submitLabel="UPDATE LISTING"
        initialValues={{ price: startPrice, startTime: startingTime, endTime: endingTime }}
      />
    </>
  )
}
