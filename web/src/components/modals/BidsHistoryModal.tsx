import { Matic } from 'components/Matic';
import { Modal } from 'components/Modal';
import { ProfileWithAvatar } from 'components/ProfileWithAvatar';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { DownArrow } from 'icons/DownArrow';
import { useBidsWithInfoLazyQuery } from 'lib/graphql';
import { useEffect } from 'react';

export const BidsHistoryModal = () => {
  const { showBidsHistory, auctionId } = useModalState();
  const { dispatchShowBidsHistory } = useModalDispatch();
  const [fetch, { data }] = useBidsWithInfoLazyQuery({ fetchPolicy: 'no-cache' });
  const bids = data?.bidsWithInfo.bids;

  useEffect(() => {
    if (auctionId) {
      fetch({ variables: { auctionId } });
    }
  }, [auctionId, fetch]);

  const handleClose = () => {
    dispatchShowBidsHistory(false, '');
  };

  return (
    <Modal
      show={showBidsHistory}
      title={'Bid History'}
      onClose={handleClose}
      leftButton={
        <div className="flex justify-start ml-6">
          <button aria-label="Close" className="w-10 h-10 flex justify-center items-center" onClick={handleClose}>
            <DownArrow />
          </button>
        </div>
      }
    >
      <ol className="flex flex-col text-white">
        {bids?.map(item => (
          <li key={item.amount} className="odd:bg-gray-15 even:bg-gray-20 px-4 py-1">
            <span className="text-gray-50 font-bold text-xxs">{new Date(item.createdAt).toLocaleString()}</span>
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
  );
};
export default BidsHistoryModal;
