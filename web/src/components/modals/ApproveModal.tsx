import { Button } from 'components/Button';
import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import useBlockchain from 'hooks/useBlockchain';
import { useWalletContext } from 'hooks/useWalletContext';
import { useRouter } from 'next/router';
import React, { useState } from 'react';

export const ApproveModal = () => {
  const { account, web3 } = useWalletContext();
  const modalState = useModalState();
  const { dispatchShowApproveModal } = useModalDispatch();
  const { approveMarketplace } = useBlockchain();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isOpen = modalState.showApprove;

  const handleClose = () => {
    dispatchShowApproveModal(false);
  };

  const setApprove = () => {
    if (!web3 || !account) {
      return;
    }
    setLoading(true);
    approveMarketplace(web3, account, onReceipt);
  };

  const onReceipt = () => {
    setLoading(false);
    dispatchShowApproveModal(false);
    router.reload();
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
      <div className="flex flex-col justify-evenly items-center p-4 gap-4 h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="text-white font-bold text-center">
            You must approve the marketplace to trade your Soundchain NFT
          </div>
          <Button variant="rainbow-xs" className="w-40" onClick={setApprove} loading={loading}>
            Approve
          </Button>
        </div>
      </div>
    </Modal>
  );
};
