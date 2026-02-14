import { ListNFTBuyNow, ListNFTBuyNowFormValues } from 'components/pages/details-NFT/ListNFTBuyNow'
import { Track } from 'components/Track'
import { useModalDispatch, useModalState } from 'contexts/ModalContext'
import { FormikHelpers } from 'formik'
import useBlockchain from 'hooks/useBlockchain'
import useBlockchainV2 from 'hooks/useBlockchainV2'
import { useMe } from 'hooks/useMe'
import { useWalletContext } from 'hooks/useWalletContext'
import { PendingRequest, TrackDocument, TrackQuery, useBuyNowItemLazyQuery, useUpdateTrackMutation } from 'lib/graphql'
import { protectPage } from 'lib/protectPage'
import { useRouter } from 'next/router'
import { ParsedUrlQuery } from 'querystring'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { SaleType } from 'lib/graphql'
import SEO from '../../../../components/SEO'
import { ArrowLeft, Tag } from 'lucide-react'
import Link from 'next/link'
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

  return {
    props: {
      track: data.track,
    },
  }
})

export default function ListBuyNowPage({ track }: TrackPageProps) {
  const { isApprovedMarketplace: checkIsApproved } = useBlockchain()
  const { listItem } = useBlockchainV2()
  const router = useRouter()
  const me = useMe()
  const [trackUpdate] = useUpdateTrackMutation()
  const { account, web3 } = useWalletContext()
  const { showApprove } = useModalState()
  const { dispatchShowApproveModal } = useModalDispatch()
  const [isOwner, setIsOwner] = useState(false)
  const [isApproved, setIsApproved] = useState(false)

  const nftData = track.nftData
  const tokenId = track.nftData?.tokenId ?? -1
  const contractAddress = track.nftData?.contract ?? ''
  const canList = (me?.profile.verified && nftData?.minter === account) || nftData?.minter != account

  const [getBuyNowItem, { data: buyNowItem }] = useBuyNowItemLazyQuery({
    variables: { input: { tokenId, contractAddress } },
  })

  // Check ownership via address comparison (more reliable than contract call)
  useEffect(() => {
    if (!account || !nftData?.owner) {
      setIsOwner(false)
      return
    }
    // Compare addresses case-insensitively
    const ownerMatch = nftData.owner.toLowerCase() === account.toLowerCase()
    setIsOwner(ownerMatch)
  }, [account, nftData?.owner])

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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-black">
      <SEO
        title={`List track | SoundChain`}
        description={'List your track as a buy now item on SoundChain'}
        canonicalUrl={router.asPath}
      />

      {/* DEX-style page header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-black/80 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-purple-400" />
              <h1 className="text-xl font-bold text-white">List for Sale</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Track preview card */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 mb-6">
          <Track track={track} />
        </div>

        {/* Listing form */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
          <ListNFTBuyNow handleSubmit={handleList} submitLabel={isApproved ? 'LIST NFT' : 'APPROVE MARKETPLACE'} />
        </div>
      </div>
    </div>
  )
}
