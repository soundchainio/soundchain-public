import { MarketplaceNav } from 'components/MarketplaceNav'
import { ListNFTBuyNow, ListNFTBuyNowFormValues } from 'components/pages/details-NFT/ListNFTBuyNow'
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
import { useMagicContext } from 'hooks/useMagicContext'
import { PendingRequest, TrackDocument, TrackQuery } from 'lib/graphql'
import { useUpdateTrackMutation } from 'hooks/useMutationsDirect'  // Phase 7f — Vercel-direct
import { useBuyNowItemLazy as useBuyNowItemLazyQuery } from 'hooks/useMarketplaceItemsDirect'  // Phase 7e — Vercel-direct
import { protectPage } from 'lib/protectPage'
import { Tag, Wallet, Copy, Check } from 'lucide-react'
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

export default function ListBuyNowPage({ track }: TrackPageProps) {
  const { isApprovedMarketplace: checkIsApproved } = useBlockchain()
  const { listItem } = useBlockchainV2()
  const router = useRouter()
  const me = useMe()
  const [trackUpdate] = useUpdateTrackMutation()
  const { account, web3, balance, OGUNBalance } = useWalletContext()
  const { account: magicAccount, balance: magicBalance, ogunBalance: magicOgunBalance } = useMagicContext()
  const { showApprove } = useModalState()
  const { dispatchShowApproveModal } = useModalDispatch()
  const [isOwner, setIsOwner] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const [copied, setCopied] = useState(false)

  // Resolve wallet address and balances
  const walletAddress = account || magicAccount
  const polBalance = balance || magicBalance || '0'
  const ogunBal = OGUNBalance || magicOgunBalance || '0'

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`
  const formatBalance = (bal: string | undefined) => {
    const num = Number(bal) || 0
    if (num === 0) return '0'
    if (num < 0.0001) return '< 0.0001'
    if (num < 1) return num.toFixed(4)
    if (num < 1000) return num.toFixed(2)
    return `${(num / 1000).toFixed(1)}K`
  }

  const handleCopyAddress = async () => {
    if (!walletAddress) return
    await navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
      toast('Track needs a price higher than 0 on OGUN or POL.')
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

      {/* DEX-style navigation */}
      <MarketplaceNav title="List for Sale" icon={<Tag className="w-5 h-5 text-purple-400" />} />

      {/* Content area */}
      <div className="max-w-4xl mx-auto px-4 py-4">

        {/* Connected Wallet & Balances */}
        {walletAddress && (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10">
                  <Wallet className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Connected Wallet</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-mono">{truncateAddress(walletAddress)}</span>
                    <button onClick={handleCopyAddress} className="p-1 hover:bg-white/10 rounded transition-colors">
                      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-gray-400">POL</div>
                  <div className="text-sm text-white font-semibold">{formatBalance(polBalance)}</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-right">
                  <div className="text-xs text-gray-400">OGUN</div>
                  <div className="text-sm text-cyan-400 font-semibold">{formatBalance(ogunBal)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Track preview card */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 mb-4">
          <Track track={track} />
        </div>

        {/* Listing form */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
          <ListNFTBuyNow handleSubmit={handleList} submitLabel={isApproved ? 'LIST TRACK' : 'APPROVE MARKETPLACE'} />
        </div>
      </div>
    </div>
  )
}

// Custom layout to bypass default Layout component (uses DEX-style nav instead of legacy TopNavBar)
ListBuyNowPage.getLayout = (page: ReactElement) => {
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
