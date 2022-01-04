import { Avatar } from 'components/Avatar';
import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { Matic } from 'icons/Matic';
import { useBidsWithInfoQuery } from 'lib/graphql';
import React from 'react';

export const BidsHistoryModal = () => {
  const { showBidsHistory, auctionId } = useModalState();
  const { dispatchShowBidsHistory } = useModalDispatch();

  const { data } = useBidsWithInfoQuery({ variables: { auctionId: auctionId || '' } });
  const bids = data?.bidsWithInfo.bids;

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
                <div className="flex flex-row items-center gap-1 font-bold">
                  <Matic />
                  <span className="pl-1 text-white">{item.amount / 1e18}</span>
                  <span className="text-xxs self-end text-gray-80">MATIC</span>
                </div>
                <div className="flex justify-end">
                  <span className="text-gray-50 font-bold text-xxs">$49 USD</span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Modal>
  );
};
