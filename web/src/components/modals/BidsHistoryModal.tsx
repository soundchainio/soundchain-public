import { Avatar } from 'components/Avatar';
import { Matic } from 'components/Matic';
import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { useBidsWithInfoLazyQuery, useMaticUsdQuery } from 'lib/graphql';
import { useEffect } from 'react';
import { currency } from 'utils/format';

export const BidsHistoryModal = () => {
  const { showBidsHistory, auctionId } = useModalState();
  const { dispatchShowBidsHistory } = useModalDispatch();
  const { data: maticUsd } = useMaticUsdQuery();
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
      onClose={() => handleClose}
      leftButton={
        <button className="p-2 ml-3 text-gray-400 font-bold flex-1 text-center text-sm" onClick={handleClose}>
          Cancel
        </button>
      }
    >
      <ol className="flex flex-col text-white">
        {bids?.map(item => (
          <li key={item.amount} className="odd:bg-gray-15 even:bg-gray-20 px-4 py-1">
            <span className="text-gray-50 font-bold text-xxs">{new Date(item.createdAt).toLocaleString()}</span>
            <div className="flex flex-row">
              <div className="flex flex-1 w-3/6 gap-2">
                <Avatar
                  profile={{ profilePicture: item.profile.profilePicture, userHandle: item.profile.userHandle }}
                  pixels={30}
                  linkToProfile
                />
                <div className="flex flex-col ">
                  <div className="text-sm font-bold">{item.profile.displayName}</div>
                  <div className="text-xxs text-gray-80 font-bold">@{item.profile.userHandle}</div>
                </div>
              </div>
              <div className="flex flex-col">
                <Matic value={item.amount / 1e18} />
                <div className="flex justify-end">
                  <span className="text-gray-50 font-bold text-xxs">
                    {maticUsd && `${currency((item.amount / 1e18) * parseFloat(maticUsd.maticUsd))}`}
                  </span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Modal>
  );
};
