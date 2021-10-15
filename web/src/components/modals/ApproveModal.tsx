import { Button } from 'components/Button';
import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { useMagicContext } from 'hooks/useMagicContext';
import { approveMarketplace } from 'lib/blockchain';
import React from 'react';

export const ApproveModal = () => {
  const { account, web3 } = useMagicContext();
  const modalState = useModalState();
  const { dispatchShowApproveModal } = useModalDispatch();

  const isOpen = modalState.showApprove;

  const handleClose = () => {
    dispatchShowApproveModal(false);
  };

  const setApprove = async () => {
    await approveMarketplace(web3!, account);
  };

  return (
    <Modal
      show={isOpen}
      title={'Approve Marketplace'}
      onClose={handleClose}
      leftButton={
        <div className="p-2 text-gray-400 font-bold flex-1 text-center text-sm" onClick={handleClose}>
          Cancel
        </div>
      }
    >
      <div className="flex flex-col justify-center m-auto">
        <Button variant="rainbow-xs" className="" onClick={setApprove}>
          Set Approve
        </Button>
      </div>
    </Modal>
  );
};
