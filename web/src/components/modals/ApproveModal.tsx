import { Button } from 'components/common/Buttons/Button'
import MaxGasFee from 'components/MaxGasFee'
import { Modal } from 'components/Modal'
import { useModalDispatch, useModalState } from 'contexts/ModalContext'
import useBlockchainV2 from 'hooks/useBlockchainV2'
import { useWalletContext } from 'hooks/useWalletContext'
import { ApproveBuyNow } from 'icons/ApproveBuyNow'
import { ApproveMarketplace } from 'icons/ApproveMarketplace'
import { Auction } from 'icons/Auction'
import { CheckmarkFilled } from 'icons/CheckmarkFilled'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { SaleType } from 'lib/graphql'

export const ApproveModal = () => {
  const { account, web3 } = useWalletContext()
  const { showApprove, type, nftContractAddress } = useModalState()
  const { dispatchShowApproveModal } = useModalDispatch()
  const { approveMarketplace, approveAuction } = useBlockchainV2()
  const [loading, setLoading] = useState(false)

  const handleClose = () => {
    dispatchShowApproveModal(false, undefined, '')
  }

  const setApprove = () => {
    if (!web3 || !account) {
      return
    }
    const onReceipt = () => {
      setLoading(false)
      dispatchShowApproveModal(false, undefined, '')
    }

    setLoading(true)

    const approve =
      type === SaleType.Auction
        ? approveAuction(account, { nft: nftContractAddress })
        : type === SaleType.BuyNow
        ? approveMarketplace(account, { nft: nftContractAddress })
        : null

    approve
      ?.onReceipt(onReceipt)
      .onError(cause => toast.error(cause.message))
      .finally(() => setLoading(false))
      .execute(web3)
  }

  const icon =
    type === SaleType.Auction ? <Auction className="h-8 w-8" purple /> : <CheckmarkFilled className="h-6 w-6" />

  const title = type === SaleType.Auction ? 'Auction' : 'Buy Now'

  const image = type === SaleType.Auction ? <ApproveMarketplace /> : <ApproveBuyNow />

  return (
    <Modal
      show={showApprove}
      title={`Approve ${title}`}
      onClose={handleClose}
      leftButton={
        <button className="ml-3 flex-1 p-2 text-center text-sm font-bold text-gray-400" onClick={handleClose}>
          Cancel
        </button>
      }
    >
      <div className="flex h-full w-full flex-col justify-between bg-gray-10">
        <div className="flex h-full flex-col items-center justify-evenly gap-4 p-4 text-center">
          <div className="flex flex-row items-center gap-2">
            {icon}
            <span className="font-bold text-white">{title}</span>
          </div>
          <div className="text-xs text-gray-80">
            To get set up for selling on SoundChain for the first time, you must approve the SoundChain marketplace
            smart contracts to move your NFT. This is only required once and includes a small gas fee.
          </div>
          <div>{image}</div>
        </div>
        <div>
          <div className="flex flex-col bg-gray-15 p-4">
            <MaxGasFee />
          </div>
          <div className="flex justify-around gap-6 p-6">
            <Button className="w-full" variant="cancel" onClick={handleClose}>
              Cancel
            </Button>
            <Button className="w-full" variant="approve" onClick={setApprove} loading={loading}>
              Approve
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
export default ApproveModal
