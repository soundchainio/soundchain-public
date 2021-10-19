import { Button } from 'components/Button';
import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { useMagicContext } from 'hooks/useMagicContext';
import { approveMarketplace } from 'lib/blockchain';
import { useSetIsApprovedOnMarketplaceMutation } from 'lib/graphql';
import React, { useState } from 'react';
import { Receipt } from 'types/NftTypes';

export const ApproveModal = () => {
  const { account, web3 } = useMagicContext();
  const modalState = useModalState();
  const { dispatchShowApproveModal } = useModalDispatch();
  const [setIsApprovedMutation] = useSetIsApprovedOnMarketplaceMutation();

  const [isApproved, setIsApproved] = useState(false);

  const isOpen = modalState.showApprove;

  const handleClose = () => {
    dispatchShowApproveModal(false);
  };

  const setApprove = async () => {
    if (!web3 || !account) {
      return;
    }
    await approveMarketplace(web3, account, onReceipt);
  };

  const onReceipt = (receipt: Receipt) => {
    if (receipt.status) {
      setIsApprovedMutation();
      setIsApproved(true);
    }
  };

  return (
    <Modal
      show={isOpen}
      title={'Approve Marketplace'}
      onClose={handleClose}
      leftButton={
        <button className="p-2 ml-3 text-gray-400 font-bold flex-1 text-center text-sm" onClick={handleClose}>
          Cancel
        </button>
      }
    >
      <div className="flex flex-col justify-center m-auto">
        <Button variant="rainbow-xs" className="" onClick={setApprove}>
          Set Approve
        </Button>
        <p className="text-lg text-gray-400">{isApproved ? 'Approved' : 'Not Approved'}</p>
      </div>
    </Modal>
  );
};
