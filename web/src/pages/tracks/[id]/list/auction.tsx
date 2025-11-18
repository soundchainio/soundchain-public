import { ListNFTAuction, ListNFTAuctionFormValues } from 'components/pages/details-NFT/ListNFTAuction'
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
  title: 'List for Auction',
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

  return cacheFor(AuctionPage, { track: data.track }, context, apolloClient)
})

export default function AuctionPage({ track }: TrackPageProps) {
  const { isTokenOwner, isApprovedAuction: checkIsApproved } = useBlockchain()
  const { createAuction } = useBlockchainV2()
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
  const tokenId = nftData?.tokenId ?? -1
  const contractAddress = nftData?.contract ?? ''
  const isVerified = me?.profile.verified
  const canList = (isVerified && nftData?.minter === account) || nftData?.minter != account

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

  const isForSale = !!buyNowItem?.buyNowItem?.buyNowItem?.pricePerItem // Removed ?? false

  const handleList = (
    { price, startTime, endTime }: ListNFTAuctionFormValues,
    helper: FormikHelpers<ListNFTAuctionFormValues>,
  ) => {
    if (nftData?.tokenId === null || nftData?.tokenId === undefined || !account || !web3) {
      return
    }
    const weiPrice = web3?.utils.toWei(price.toString(), 'ether') || '0'
    const startTimestamp = Math.ceil(startTime.getTime() / 1000)
    const endTimestamp = Math.ceil(endTime.getTime() / 1000)
    if (isApproved) {
      const onReceive = async () => {
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
        router.replace(router.asPath.replace('/list/auction', ''))
      }
      createAuction(nftData.tokenId, weiPrice, startTimestamp, endTimestamp, account, { nft: nftData.contract })
        .onReceipt(onReceive)
        .onError(cause => toast.error(cause.message))
        .finally(() => helper.setSubmitting(false))
        .execute(web3)
    } else {
      me ? dispatchShowApproveModal(true, SaleType.Auction, nftData.contract) : router.push('/login')
      helper.setSubmitting(false)
    }
  }

  useEffect(() => {
    if (isVerified) return

    if (!isVerified) router.push('/get-verified')
  }, [isVerified, router])

  // TODO: We are returning null in various places in the application without correct user feedback
  if (!isOwner || isForSale || nftData?.pendingRequest != PendingRequest.None || !canList) {
    return null
  }

  return (
    <>
      <SEO
        title={`List track | SoundChain`}
        description={'List your track as an auction item on SoundChain'}
        canonicalUrl={router.asPath}
      />
      <div className="m-4">
        <Track track={track} />
      </div>
      <ListNFTAuction handleSubmit={handleList} submitLabel={isApproved ? 'LIST NFT' : 'APPROVE MARKETPLACE'} />
    </>
  )
}
