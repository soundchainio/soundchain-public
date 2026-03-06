import { Matic } from 'components/Matic'
import { Modal } from 'components/Modal'
import { ProfileWithAvatar } from 'components/ProfileWithAvatar'
import { useModalDispatch, useModalState } from 'contexts/ModalContext'
import { DownArrow } from 'icons/DownArrow'
import { useBidsWithInfoLazyQuery } from 'lib/graphql'
import { useEffect } from 'react'

export const BidsHistoryModal = () => {
  const { showBidsHistory, auctionId } = useModalState()
  const { dispatchShowBidsHistory } = useModalDispatch()
  const [fetch, { data }] = useBidsWithInfoLazyQuery({ fetchPolicy: 'no-cache' })
  const bids = data?.bidsWithInfo.bids

  useEffect(() => {
    if (auctionId) {
      fetch({ variables: { auctionId } })
    }
  }, [auctionId, fetch])

  const handleClose = () => {
    dispatchShowBidsHistory({ show: false, auctionId: '' })
  }

  return (
    <Modal
      show={showBidsHistory}
      title={'Bid History'}
      onClose={handleClose}
      leftButton={
        <div className="ml-6 flex justify-start">
          <button aria-label="Close" className="flex h-10 w-10 items-center justify-center" onClick={handleClose}>
            <DownArrow />
          </button>
        </div>
      }
    >
      <ol className="flex flex-col text-white">
        {bids?.map(item => (
          <li key={item.amount} className="px-4 py-1 odd:bg-gray-15 even:bg-gray-20">
            <span className="text-xxs font-bold text-gray-50">{new Date(item.createdAt).toLocaleString()}</span>
            <div className="flex flex-row gap-2">
              <ProfileWithAvatar profile={item.profile} className="flex-1" />
              <div className="flex-shrink-0">
                <Matic value={item.amountToShow} variant="currency" className="text-xs" />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Modal>
  )
}
export default BidsHistoryModal
