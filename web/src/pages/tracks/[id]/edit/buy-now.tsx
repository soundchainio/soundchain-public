import { ListNFTBuyNow, ListNFTBuyNowFormValues } from 'components/pages/details-NFT/ListNFTBuyNow'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { Track } from 'components/Track'
import { useModalDispatch } from 'contexts/providers/modal'
import { FormikHelpers } from 'formik'
import useBlockchainV2 from 'hooks/useBlockchainV2'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMe } from 'hooks/useMe'
import { useWalletContext } from 'hooks/useWalletContext'
import { cacheFor } from 'lib/apollo'
import { PendingRequest, TrackDocument, TrackQuery, useBuyNowItemQuery, useUpdateTrackMutation } from 'lib/graphql'
import { protectPage } from 'lib/protectPage'
import { useRouter } from 'next/router'
import { ParsedUrlQuery } from 'querystring'
import { useCallback, useEffect, useMemo } from 'react'
import { toast } from 'react-toastify'
import { SaleType } from 'types/SaleType'
import { compareWallets } from 'utils/Wallet'
import Web3 from 'web3'

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
  const { updateListing } = useBlockchainV2()
  const { dispatchShowRemoveListingModal } = useModalDispatch()
  const [trackUpdate] = useUpdateTrackMutation()
  const { account, web3 } = useWalletContext()
  const { setTopNavBarProps } = useLayoutContext()
  const me = useMe()

  const nftData = track.nftData
  const tokenId = nftData?.tokenId ?? -1
  const contractAddress = nftData?.contract ?? ''

  const { data: listingPayload } = useBuyNowItemQuery({
    variables: { input: { tokenId, contractAddress } },
    fetchPolicy: 'network-only',
  })

  const handleRemove = useCallback(() => {
    if (
      !web3 ||
      !listingPayload?.buyNowItem?.buyNowItem?.tokenId ||
      !account ||
      nftData?.pendingRequest != PendingRequest.None
    ) {
      return
    }
    dispatchShowRemoveListingModal({
      show: true,
      tokenId: listingPayload?.buyNowItem?.buyNowItem?.tokenId,
      trackId: track.id,
      saleType: SaleType.MARKETPLACE,
      contractAddresses: {
        nft: nftData.contract,
        marketplace: listingPayload?.buyNowItem?.buyNowItem?.contract,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, listingPayload?.buyNowItem?.buyNowItem?.tokenId, nftData?.pendingRequest, track.id, web3])

  const topNavBarProps: TopNavBarProps = useMemo(
    () => ({
      title: 'Edit Listing',
      rightButton: (
        <button className="text-sm font-bold text-red-400" onClick={handleRemove}>
          Remove Listing
        </button>
      ),
    }),
    [handleRemove],
  )

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps, topNavBarProps])

  if (!listingPayload) {
    return null
  }

  const isOwner = compareWallets(listingPayload.buyNowItem?.buyNowItem?.owner, account)
  const isForSale = !!listingPayload.buyNowItem?.buyNowItem?.pricePerItem // Removed ?? false
  const price = listingPayload.buyNowItem?.buyNowItem?.pricePerItemToShow
  const OGUNprice = listingPayload.buyNowItem?.buyNowItem?.OGUNPricePerItemToShow

  const startingDate = listingPayload.buyNowItem?.buyNowItem?.startingTime
    ? new Date(listingPayload.buyNowItem.buyNowItem.startingTime * 1000)
    : undefined

  const handleUpdate = (
    { salePrice, selectedCurrency, startTime }: ListNFTBuyNowFormValues,
    helper: FormikHelpers<ListNFTBuyNowFormValues>,
  ) => {
    if (!web3 || !listingPayload.buyNowItem?.buyNowItem?.tokenId || !salePrice || !account) {
      return
    }
    const weiPrice = selectedCurrency === 'MATIC' ? Web3.utils.toWei(salePrice.toString(), 'ether') : '0'
    const weiPriceOGUN = selectedCurrency === 'OGUN' ? web3?.utils.toWei(salePrice.toString(), 'ether') : '0'
    const startTimestamp = startTime.getTime() / 1000

    const onReceipt = () => {
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
      router.replace(router.asPath.replace('/edit/buy-now', ''))
    }

    updateListing(listingPayload.buyNowItem?.buyNowItem?.tokenId, account, weiPrice, weiPriceOGUN, startTimestamp, {
      nft: nftData?.contract,
      marketplace: listingPayload.buyNowItem?.buyNowItem.contract,
    })
      .onReceipt(onReceipt)
      .onError(cause => toast.error(cause.message))
      .finally(() => helper.setSubmitting(false))
      .execute(web3)
  }

  if (!isForSale || !isOwner || !me || !track || nftData?.pendingRequest != PendingRequest.None) {
    return null
  }

  return (
    <>
      <SEO title={`Edit Listing | SoundChain`} description={'Edit Buy now listing'} canonicalUrl={router.asPath} />
      <div className="m-4">
        <Track track={track} />
      </div>
      <ListNFTBuyNow
        submitLabel="EDIT LISTING"
        handleSubmit={handleUpdate}
        initialValues={{
          salePrice: price ? price : OGUNprice,
          selectedCurrency: price ? 'MATIC' : 'OGUN',
          startTime: startingDate,
        }}
      />
    </>
  )
}
