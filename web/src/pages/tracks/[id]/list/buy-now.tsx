import { ListNFTBuyNow, ListNFTBuyNowFormValues } from 'components/pages/details-NFT/ListNFTBuyNow'
import { TopNavBarProps } from 'components/TopNavBar'
import { Track } from 'components/Track'
import { useModalDispatch, useModalState } from 'contexts/ModalContext'
import { FormikHelpers } from 'formik'
import useBlockchain from 'hooks/useBlockchain'
import useBlockchainV2 from 'hooks/useBlockchainV2'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMe } from 'hooks/useMe'
import { useWalletContext } from 'hooks/useWalletContext'
import { cacheFor } from 'lib/apollo'
import { PendingRequest, TrackDocument, TrackQuery, useBuyNowItemLazyQuery, useUpdateTrackMutation } from 'lib/graphql'
import { protectPage } from 'lib/protectPage'
import { useRouter } from 'next/router'
import { ParsedUrlQuery } from 'querystring'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { SaleType } from 'lib/graphql'
import SEO from '../../../../components/SEO'
export interface TrackPageProps {
  track: TrackQuery['track']
}

interface TrackPageParams extends ParsedUrlQuery {
  id: string
}

const topNavBarProps: TopNavBarProps = {
  title: 'List for Sale',
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

  return cacheFor(ListBuyNowPage, { track: data.track }, context, apolloClient)
})

export default function ListBuyNowPage({ track }: TrackPageProps) {
  const { isTokenOwner, isApprovedMarketplace: checkIsApproved } = useBlockchain()
  const { listItem } = useBlockchainV2()
  const router = useRouter()
  const me = useMe()
  const [trackUpdate] = useUpdateTrackMutation()
  const { account, web3 } = useWalletContext()
  const { showApprove } = useModalState()
  const { dispatchShowApproveModal } = useModalDispatch()
  const [isOwner, setIsOwner] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const { setTopNavBarProps } = useLayoutContext()

  const nftData = track.nftData
  const tokenId = track.nftData?.tokenId ?? -1
  const contractAddress = track.nftData?.contract ?? ''
  const canList = (me?.profile.verified && nftData?.minter === account) || nftData?.minter != account

  const [getBuyNowItem, { data: buyNowItem }] = useBuyNowItemLazyQuery({
    variables: { input: { tokenId, contractAddress } },
  })

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps])

  useEffect(() => {
    const fetchIsOwner = async () => {
      if (!account || !web3 || nftData?.tokenId === null || nftData?.tokenId === undefined || !isTokenOwner) {
        return
      }
      const isTokenOwnerRes = await isTokenOwner(web3, nftData.tokenId, account, { nft: nftData.contract })
      setIsOwner(isTokenOwnerRes)
    }
    fetchIsOwner()
  }, [account, web3, nftData, isTokenOwner])

  useEffect(() => {
    getBuyNowItem()
  }, [getBuyNowItem])

  useEffect(() => {
    const fetchIsApproved = async () => {
      if (!web3 || !checkIsApproved || !account) return

      const is = await checkIsApproved(web3, account, { nft: nftData?.contract })
      setIsApproved(is)
    }
    fetchIsApproved()
  }, [account, web3, checkIsApproved, showApprove, nftData])

  const isForSale =
    (!!buyNowItem?.buyNowItem?.buyNowItem?.pricePerItem || !!buyNowItem?.buyNowItem?.buyNowItem?.OGUNPricePerItem) ??
    false

  const handleListSingleNft = (
    { salePrice, selectedCurrency, startTime }: ListNFTBuyNowFormValues,
    helper: FormikHelpers<ListNFTBuyNowFormValues>,
  ) => {
    if (nftData?.tokenId === null || nftData?.tokenId === undefined || !account || !web3) {
      return
    }

    if (salePrice <= 0) {
      toast('NFT needs a price higher than 0 on OGUN or MATIC.')
      return
    }
    const weiPrice = selectedCurrency === 'MATIC' ? web3?.utils.toWei(salePrice.toString(), 'ether') : '0'
    const weiPriceOGUN = selectedCurrency === 'OGUN' ? web3?.utils.toWei(salePrice.toString(), 'ether') : '0'
    const startTimestamp = Math.ceil(startTime.getTime() / 1000)

    const onReceipt = async () => {
      await trackUpdate({
        variables: {
          input: {
            trackId: track.id,
            nftData: {
              pendingRequest: PendingRequest.List,
              pendingTime: new Date().toISOString(),
            },
          },
        },
      })
      router.replace(router.asPath.replace('/list/buy-now', ''))
    }
    listItem(nftData.tokenId, account, weiPrice, weiPriceOGUN, startTimestamp, { nft: nftData.contract })
      .onReceipt(onReceipt)
      .onError(cause => toast.error(cause.message))
      .finally(() => helper.setSubmitting(false))
      .execute(web3)
  }

  const handleList = (values: ListNFTBuyNowFormValues, helper: FormikHelpers<ListNFTBuyNowFormValues>) => {
    if (nftData?.tokenId === null || nftData?.tokenId === undefined || !account || !web3) {
      return
    }
    if (isApproved) {
      handleListSingleNft(values, helper)
    } else {
      me ? dispatchShowApproveModal(true, SaleType.BuyNow, nftData.contract) : router.push('/login')
      helper.setSubmitting(false)
    }
  }

  if (!isOwner || isForSale || nftData?.pendingRequest != PendingRequest.None || !canList) {
    return null
  }

  return (
    <>
      <SEO
        title={`List track | SoundChain`}
        description={'List your track as a buy now item on SoundChain'}
        canonicalUrl={router.asPath}
      />
      <div className="m-4">
        <Track track={track} />
      </div>
      <ListNFTBuyNow handleSubmit={handleList} submitLabel={isApproved ? 'LIST NFT' : 'APPROVE MARKETPLACE'} />
    </>
  )
}
