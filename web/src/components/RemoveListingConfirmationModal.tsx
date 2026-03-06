import { Modal } from 'components/Modal'
import { useModalDispatch, useModalState } from 'contexts/ModalContext'
import useBlockchainV2, { CancelListingBatchParams, ContractAddresses } from 'hooks/useBlockchainV2'
import { useMaxCancelBatchListGasFee } from 'hooks/useMaxCancelBatchListGasFee'
import { useMaxGasFee } from 'hooks/useMaxGasFee'
import { useMe } from 'hooks/useMe'
import { useWalletContext } from 'hooks/useWalletContext'
import {
  PendingRequest,
  useOwnedBuyNowTrackIdsQuery,
  useUpdateAllOwnedTracksMutation,
  useUpdateTrackMutation,
} from 'lib/graphql'
import router from 'next/router'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { SaleType } from 'lib/graphql'
import { Button } from './common/Buttons/Button'
import { ConnectedNetwork } from './ConnectedNetwork'
import { CopyWalletAddress } from './CopyWalletAddress'
import { Label } from './Label'
import MaxGasFee from './MaxGasFee'
import { WalletSelected } from './WalletSelected'

const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || ''
const CANCEL_BATCH_SIZE = 120

export const RemoveListingConfirmationModal = () => {
  const me = useMe()
  const { showRemoveListing, trackId, tokenId, trackEditionId, saleType, contractAddresses } = useModalState()
  const [trackUpdate] = useUpdateTrackMutation()
  const [ownedTracksUpdate] = useUpdateAllOwnedTracksMutation()
  const { dispatchShowRemoveListingModal } = useModalDispatch()
  const { cancelListing, cancelAuction, cancelListingBatch } = useBlockchainV2()
  const { web3, account, balance } = useWalletContext()
  const defaultMaxGasFee = useMaxGasFee(showRemoveListing)
  const [loading, setLoading] = useState(false)
  const { data: ownedTrackIds } = useOwnedBuyNowTrackIdsQuery({
    variables: {
      filter: {
        trackEditionId: trackEditionId!,
        owner: account!,
      },
    },
    skip: !account || !trackEditionId,
  })

  const allTracks = ownedTrackIds?.ownedBuyNowListingItems.nodes.filter(
    track => track.nftData?.tokenId !== null && track.nftData?.tokenId !== undefined,
  )

  const editionMaxGasFee = useMaxCancelBatchListGasFee(allTracks?.length ?? 0)

  const maxGasFee = trackEditionId ? editionMaxGasFee : defaultMaxGasFee

  const handleClose = () => {
    dispatchShowRemoveListingModal({
      show: false,
      tokenId: 0,
      trackId: '',
      saleType: undefined,
      contractAddresses: {},
    })
  }

  const handleCancel = () => {
    handleClose()
  }

  const hasEnoughFunds = () => {
    if (balance && maxGasFee) {
      return +balance > +maxGasFee
    }
    return false
  }

  const getCancelationHandler = (account: string, tokenId?: number, contractAddresses?: ContractAddresses) => {
    if (trackEditionId) {
      if (!allTracks) return
      return () => handleCancelBatch(trackEditionId, account, contractAddresses)
    }

    if (!tokenId || !trackId) return

    return () => handleCancelItem(tokenId, account, contractAddresses)
  }

  const handleCancelBatch = async (trackEditionId: string, account: string, contractAddresses?: ContractAddresses) => {
    function cancelIds(trackIds: string[], params: CancelListingBatchParams) {
      return new Promise<void>((resolve, reject) => {
        const onReceipt = async () => {
          await ownedTracksUpdate({
            variables: {
              input: {
                trackIds,
                trackEditionId,
                owner: params.from,
                nftData: {
                  pendingRequest: PendingRequest.CancelListing,
                  pendingTime: new Date().toISOString(),
                },
              },
            },
          })
          resolve()
        }
        if (cancelListingBatch && web3) {
          cancelListingBatch(params)
            .onReceipt(onReceipt)
            .onError(cause => {
              toast.error(cause.message)
              reject(cause)
            })
            .execute(web3!)
        } else {
          toast.error('Unable to cancel listing batch')
          reject(new Error('cancelListingBatch or web3 is undefined'))
        }
      })
    }

    let nonce = await web3!.eth.getTransactionCount(account)
    let numNonce = Number(nonce) // Convert bigint to number

    const promises = []
    while (allTracks!.length > 0) {
      const tracksToList = allTracks!.splice(0, CANCEL_BATCH_SIZE)
      promises.push(
        cancelIds(
          tracksToList.map(track => track.id),
          {
            tokenIds: tracksToList.map(t => Number(t.nftData!.tokenId)),
            from: account,
            contractAddresses,
            nonce: numNonce++, // Use and increment the number version
          },
        ),
      )
    }

    await Promise.all(promises)
    handleClose()
  }

  const handleCancelItem = (tokenId: number, account: string, contractAddresses?: ContractAddresses) => {
    const cancel =
      saleType === SaleType.BuyNow
        ? cancelListing(tokenId, account, contractAddresses)
        : cancelAuction(tokenId, account, contractAddresses)

    const onSingleItemReceipt = async () => {
      await trackUpdate({
        variables: {
          input: {
            trackId: trackId!,
            nftData: {
              pendingRequest: PendingRequest.CancelListing,
              pendingTime: new Date().toISOString(),
            },
          },
        },
      })

      handleClose()

      saleType === SaleType.BuyNow
        ? router.replace(router.asPath.replace('edit/buy-now', ''))
        : router.replace(router.asPath.replace('edit/auction', ''))
    }

    cancel
      .onReceipt(onSingleItemReceipt)
      .onError(cause => toast.error(cause.message))
      .finally(() => setLoading(false))
      .execute(web3!)
  }

  const handleSubmit = () => {
    if (!account || !web3) return
    const cancelationHandler = getCancelationHandler(account, tokenId, contractAddresses)
    if (!cancelationHandler) return

    if (!hasEnoughFunds()) {
      alert("Uh-oh, it seems you don't have enough funds for this transaction. Please select an appropriate amount")
      handleClose()
      return
    }

    setLoading(true)
    cancelationHandler()
  }

  return (
    <Modal
      show={showRemoveListing}
      title="Confirm Transaction"
      onClose={handleClose}
      leftButton={
        <button className="flex-1 p-2 text-center text-sm font-bold text-gray-400" onClick={handleCancel}>
          Cancel
        </button>
      }
    >
      <div className="flex h-full w-full flex-col justify-between">
        <div className="mb-auto flex h-full flex-col justify-between space-y-6">
          <div className="flex h-full flex-col justify-around">
            <div className="px-4 text-center text-sm font-bold text-gray-80">
              <p className="flex flex-wrap items-end justify-center py-6 text-center">
                <span className="leading-tight">Are you sure you want to remove listing?</span>
              </p>
              <p>This transaction cannot be undone.</p>
            </div>
            <div className="flex w-full flex-col space-y-6 py-6">
              <div className="space-y-2">
                <div className="px-4">
                  <Label className="font-bold uppercase" textSize="xs">
                    FROM:
                  </Label>
                </div>
                <div className="flex flex-col items-center gap-2 px-3">
                  <WalletSelected wallet={me?.defaultWallet} />
                  <ConnectedNetwork />
                </div>
                {account && <CopyWalletAddress walletAddress={account} />}
              </div>
              <div className="space-y-2">
                <div className="px-4">
                  <Label className="font-bold uppercase" textSize="xs">
                    MARKETPLACE:
                  </Label>
                </div>
                <CopyWalletAddress walletAddress={marketplaceAddress} />
              </div>
            </div>
          </div>
          <div className="flex flex-col bg-gray-20 p-4">
            <MaxGasFee maxGasFee={maxGasFee} />
          </div>
        </div>
        <div>
          <Button onClick={handleSubmit} loading={loading}>
            Confirm Transaction
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default RemoveListingConfirmationModal
