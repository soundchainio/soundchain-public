import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronDown, ChevronUp, Tag, Shield, Wallet, Check, Copy } from 'lucide-react'
import { ListNFTBuyNow, ListNFTBuyNowFormValues } from 'components/pages/details-NFT/ListNFTBuyNow'
import useBlockchain from 'hooks/useBlockchain'
import useBlockchainV2 from 'hooks/useBlockchainV2'
import { useMe } from 'hooks/useMe'
import { PendingRequest } from 'lib/graphql'
import { useUpdateTrackMutation } from 'hooks/useMutationsDirect'  // Phase 7f — Vercel-direct
import { useBuyNowItemLazy as useBuyNowItemLazyQuery } from 'hooks/useMarketplaceItemsDirect'  // Phase 7e — Vercel-direct
import { FormikHelpers } from 'formik'
import { toast } from 'react-toastify'
import { Button } from 'components/ui/button'
import MaxGasFee from 'components/MaxGasFee'
import Web3 from 'web3'

interface ListNFTModalProps {
  isOpen: boolean
  onClose: () => void
  track: any
  walletAddress: string
  polBalance: string
  ogunBalance: string
  web3: Web3 | null
}

export const ListNFTModal = ({
  isOpen,
  onClose,
  track,
  walletAddress,
  polBalance,
  ogunBalance,
  web3,
}: ListNFTModalProps) => {
  const { isApprovedMarketplace: checkIsApproved } = useBlockchain()
  const { listItem, approveMarketplace } = useBlockchainV2()
  const me = useMe()
  const [trackUpdate] = useUpdateTrackMutation()

  const [isApproved, setIsApproved] = useState(false)
  const [approveExpanded, setApproveExpanded] = useState(false)
  const [approveLoading, setApproveLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const nftData = track?.nftData
  const tokenId = nftData?.tokenId ?? -1
  const contractAddress = nftData?.contract ?? ''

  // Check if already listed
  const [getBuyNowItem, { data: buyNowItem }] = useBuyNowItemLazyQuery({
    variables: { input: { tokenId, contractAddress } },
  })

  // Ownership check
  const isOwner = walletAddress && nftData?.owner
    ? nftData.owner.toLowerCase() === walletAddress.toLowerCase()
    : false

  const isForSale =
    (!!buyNowItem?.buyNowItem?.buyNowItem?.pricePerItem || !!buyNowItem?.buyNowItem?.buyNowItem?.OGUNPricePerItem) ?? false

  // Check marketplace approval
  useEffect(() => {
    if (!isOpen) return
    getBuyNowItem()
  }, [isOpen, getBuyNowItem])

  useEffect(() => {
    const fetchIsApproved = async () => {
      if (!web3 || !checkIsApproved || !walletAddress || !isOpen) return
      try {
        const is = await checkIsApproved(web3, walletAddress, { nft: nftData?.contract })
        setIsApproved(is)
      } catch (e) {
        console.error('Error checking approval:', e)
      }
    }
    fetchIsApproved()
  }, [walletAddress, web3, checkIsApproved, isOpen, nftData])

  const formatBalance = (bal: string | undefined) => {
    const num = Number(bal) || 0
    if (num === 0) return '0'
    if (num < 0.0001) return '< 0.0001'
    if (num < 1) return num.toFixed(4)
    if (num < 1000) return num.toFixed(2)
    return `${(num / 1000).toFixed(1)}K`
  }

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  const handleCopyAddress = async () => {
    if (!walletAddress) return
    await navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Handle listing the NFT (defined first - used by handleApprove)
  const handleListSingleNft = useCallback((
    { salePrice, selectedCurrency, startTime }: ListNFTBuyNowFormValues,
    helper: FormikHelpers<ListNFTBuyNowFormValues>,
  ) => {
    if (nftData?.tokenId === null || nftData?.tokenId === undefined || !walletAddress || !web3) {
      helper.setSubmitting(false)
      return
    }

    if (salePrice <= 0) {
      toast('Track needs a price higher than 0 on OGUN or POL.')
      helper.setSubmitting(false)
      return
    }

    const weiPrice = selectedCurrency === 'MATIC' ? web3.utils.toWei(salePrice.toString(), 'ether') : '0'
    const weiPriceOGUN = selectedCurrency === 'OGUN' ? web3.utils.toWei(salePrice.toString(), 'ether') : '0'
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
      toast.success('Track listed for sale!')
      onClose()
    }

    listItem(nftData.tokenId, walletAddress, weiPrice, weiPriceOGUN, startTimestamp, { nft: nftData.contract })
      .onReceipt(onReceipt)
      .onError((cause: any) => toast.error(cause.message))
      .finally(() => helper.setSubmitting(false))
      .execute(web3)
      .catch((err: any) => {
        console.error('List execute error:', err)
        toast.error(err?.message || 'Listing failed. Please try again.')
        helper.setSubmitting(false)
      })
  }, [web3, walletAddress, nftData, track, listItem, trackUpdate, onClose])

  // Handle the approve marketplace action
  // Optional params: pass form values directly to avoid stale closure issues
  const handleApprove = useCallback((
    formValues?: ListNFTBuyNowFormValues,
    formHelper?: FormikHelpers<ListNFTBuyNowFormValues>,
  ) => {
    if (!web3 || !walletAddress) {
      formHelper?.setSubmitting(false)
      return
    }
    setApproveLoading(true)

    approveMarketplace(walletAddress, { nft: nftData?.contract })
      .onReceipt(() => {
        setIsApproved(true)
        setApproveLoading(false)
        setApproveExpanded(false)
        toast.success('Marketplace approved! You can now list your track.')
        // Auto-list if form values were passed directly
        if (formValues && formHelper) {
          handleListSingleNft(formValues, formHelper)
        }
      })
      .onError((cause: any) => {
        toast.error(cause.message)
        setApproveLoading(false)
        formHelper?.setSubmitting(false)
      })
      .finally(() => setApproveLoading(false))
      .execute(web3)
      .catch((err: any) => {
        // Catch estimateGas/RPC errors that bypass .onError()
        console.error('Approve execute error:', err)
        toast.error(err?.message || 'Transaction failed. Please try again.')
        setApproveLoading(false)
        formHelper?.setSubmitting(false)
      })
  }, [web3, walletAddress, approveMarketplace, nftData, handleListSingleNft])

  // Main form submit handler
  const handleList = useCallback((values: ListNFTBuyNowFormValues, helper: FormikHelpers<ListNFTBuyNowFormValues>) => {
    if (nftData?.tokenId === null || nftData?.tokenId === undefined || !walletAddress || !web3) {
      toast.error('Wallet not connected. Please refresh and try again.')
      helper.setSubmitting(false)
      return
    }
    if (isApproved) {
      handleListSingleNft(values, helper)
    } else {
      // Pass form values directly to avoid stale closure - approve then auto-list
      setApproveExpanded(true)
      handleApprove(values, helper)
    }
  }, [isApproved, walletAddress, web3, nftData, handleListSingleNft, handleApprove])

  if (!isOpen || !track) return null

  // Guard: not owner, already for sale, or pending request
  const canList = isOwner && !isForSale && nftData?.pendingRequest === PendingRequest.None

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg animate-fadeIn sm:mb-0">
        <div className="retro-card overflow-hidden rounded-t-2xl sm:rounded-2xl bg-gray-900 border border-white/10">
          {/* Header */}
          <div className="relative p-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-purple-500/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.15),transparent_70%)]" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-cyan-500/30 flex items-center justify-center">
                  <Tag className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="font-bold text-white">List Track for Sale</h2>
                  <p className="text-xs text-gray-400">Set your price and start selling</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="max-h-[70vh] overflow-y-auto">
            {/* Compact Track Preview */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                {track.coverImage && (
                  <img
                    src={track.coverImage}
                    alt={track.title}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium text-sm truncate">{track.title}</h3>
                  <p className="text-gray-400 text-xs truncate">{track.artist || track.profile?.displayName}</p>
                </div>
                {isForSale && (
                  <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-full">Already Listed</span>
                )}
              </div>
            </div>

            {/* Wallet & Balances */}
            {walletAddress && (
              <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-white font-mono">{truncateAddress(walletAddress)}</span>
                    <button onClick={handleCopyAddress} className="p-0.5 hover:bg-white/10 rounded transition-colors">
                      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-400">POL <span className="text-white font-semibold">{formatBalance(polBalance)}</span></span>
                    <span className="text-gray-400">OGUN <span className="text-cyan-400 font-semibold">{formatBalance(ogunBalance)}</span></span>
                  </div>
                </div>
              </div>
            )}

            {/* Guard Messages */}
            {!isOwner && (
              <div className="p-4 text-center text-yellow-400 text-sm">
                You don&apos;t own this NFT.
              </div>
            )}

            {isForSale && (
              <div className="p-4 text-center text-yellow-400 text-sm">
                This NFT is already listed for sale.
              </div>
            )}

            {/* Listing Form - only show when eligible */}
            {canList && (
              <div className="border-b border-white/10">
                <ListNFTBuyNow
                  handleSubmit={handleList}
                  submitLabel={isApproved ? 'LIST TRACK' : 'APPROVE & LIST'}
                />
              </div>
            )}

            {/* Approve Marketplace Section (Accordion) */}
            {canList && !isApproved && (
              <div className="border-b border-white/10">
                <button
                  onClick={() => setApproveExpanded(!approveExpanded)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-white">Approve Marketplace</span>
                    {!isApproved && (
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">Required</span>
                    )}
                  </div>
                  {approveExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {approveExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    <p className="text-xs text-gray-400">
                      To list on SoundChain for the first time, you must approve the marketplace smart contract to move your NFT. This is a one-time approval with a small gas fee.
                    </p>
                    <div className="bg-white/5 rounded-lg p-3">
                      <MaxGasFee />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setApproveExpanded(false)}
                        className="flex-1 border-white/10 text-gray-400 hover:bg-white/5"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleApprove()}
                        disabled={approveLoading}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-semibold disabled:opacity-50"
                      >
                        {approveLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Approving...
                          </div>
                        ) : (
                          'Approve'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (typeof window === 'undefined') return null
  return createPortal(modalContent, document.body)
}

export default ListNFTModal
