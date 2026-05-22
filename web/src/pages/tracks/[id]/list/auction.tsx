import { MarketplaceNav } from 'components/MarketplaceNav'
import { ListNFTAuction, ListNFTAuctionFormValues } from 'components/pages/details-NFT/ListNFTAuction'
import { Track } from 'components/Track'
import { ModalProvider, useModalDispatch, useModalState } from 'contexts/ModalContext'
import { StateProvider } from 'contexts'
import { FormikHelpers } from 'formik'
import useBlockchain from 'hooks/useBlockchain'
import useBlockchainV2 from 'hooks/useBlockchainV2'
import { AudioPlayerProvider } from 'hooks/useAudioPlayer'
import { HideBottomNavBarProvider } from 'hooks/useHideBottomNavBar'
import { LayoutContextProvider } from 'hooks/useLayoutContext'
import { useMe } from 'hooks/useMe'
import { TrackProvider } from 'hooks/useTrack'
import { useWalletContext } from 'hooks/useWalletContext'
import { PendingRequest, TrackDocument, TrackQuery, useUpdateTrackMutation } from 'lib/graphql'
import { useBuyNowItemLazy as useBuyNowItemLazyQuery } from 'hooks/useMarketplaceItemsDirect'  // Phase 7e — Vercel-direct
import { protectPage } from 'lib/protectPage'
import { Gavel } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { ParsedUrlQuery } from 'querystring'
import { ReactElement, useEffect, useState } from 'react'
import { toast, ToastContainer } from 'react-toastify'
import { SaleType } from 'lib/graphql'
import SEO from '../../../../components/SEO'

const ApproveModal = dynamic(import('../../../../components/modals/ApproveModal'))
const AudioEngine = dynamic(import('components/common/BottomAudioPlayer/AudioEngine'))
const MobileBottomAudioPlayer = dynamic(import('components/common/BottomAudioPlayer/MobileBottomAudioPlayer'))
const DesktopBottomAudioPlayer = dynamic(import('components/common/BottomAudioPlayer/DesktopBottomAudioPlayer'))

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

  const nftData = track.nftData
  const tokenId = nftData?.tokenId ?? -1
  const contractAddress = nftData?.contract ?? ''
  const isVerified = me?.profile.verified
  const canList = (isVerified && nftData?.minter === account) || nftData?.minter != account

  const [getBuyNowItem, { data: buyNowItem }] = useBuyNowItemLazyQuery({
    variables: { input: { tokenId, contractAddress } },
  })

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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-black">
      <SEO
        title={`List track | SoundChain`}
        description={'List your track as an auction item on SoundChain'}
        canonicalUrl={router.asPath}
      />

      {/* DEX-style navigation */}
      <MarketplaceNav title="List for Auction" icon={<Gavel className="w-5 h-5 text-purple-400" />} />

      {/* Content area */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Track preview card */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 mb-4">
          <Track track={track} />
        </div>

        {/* Auction form */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
          <ListNFTAuction handleSubmit={handleList} submitLabel={isApproved ? 'LIST TRACK' : 'APPROVE MARKETPLACE'} />
        </div>
      </div>
    </div>
  )
}

// Custom layout to bypass default Layout component (uses DEX-style nav instead of legacy TopNavBar)
AuctionPage.getLayout = (page: ReactElement) => {
  return (
    <ModalProvider>
      <StateProvider>
        <HideBottomNavBarProvider>
          <LayoutContextProvider>
            <AudioPlayerProvider>
              <TrackProvider>
                {page}
                <AudioEngine />
                <MobileBottomAudioPlayer />
                <DesktopBottomAudioPlayer />
                <ToastContainer
                  position="top-center"
                  autoClose={6 * 1000}
                  toastStyle={{
                    backgroundColor: '#202020',
                    color: 'white',
                    fontSize: '12px',
                    textAlign: 'center',
                  }}
                />
                <div id="modals">
                  <ApproveModal />
                </div>
              </TrackProvider>
            </AudioPlayerProvider>
          </LayoutContextProvider>
        </HideBottomNavBarProvider>
      </StateProvider>
    </ModalProvider>
  )
}
