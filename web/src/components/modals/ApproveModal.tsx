import { Button } from 'components/Button';
import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import useBlockchain from 'hooks/useBlockchain';
import { useMaxGasFee } from 'hooks/useMaxGasFee';
import { useWalletContext } from 'hooks/useWalletContext';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { ApproveType } from 'types/ApproveType';
import { Auction } from 'icons/Auction';
import { CheckmarkFilled } from 'icons/CheckmarkFilled';
import { ApproveMarketplace } from 'icons/ApproveMarketplace';
import { ApproveBuyNow } from 'icons/ApproveBuyNow';
import { Matic } from 'icons/Matic';

export const ApproveModal = () => {
  const { account, web3 } = useWalletContext();
  const { showApprove, type } = useModalState();
  const { dispatchShowApproveModal } = useModalDispatch();
  const { approveMarketplace, approveAuction } = useBlockchain();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const maxGasFee = useMaxGasFee(showApprove);

  const handleClose = () => {
    dispatchShowApproveModal(false, ApproveType.CLOSE);
  };

  const setApprove = () => {
    if (!web3 || !account) {
      return;
    }
    setLoading(true);
    if (type === ApproveType.AUCTION) {
      approveAuction(web3, account, onReceipt);
    } else if (type === ApproveType.MARKETPLACE) {
      approveMarketplace(web3, account, onReceipt);
    }
  };

  const onReceipt = () => {
    setLoading(false);
    dispatchShowApproveModal(false, ApproveType.CLOSE);
    router.reload();
  };

  const icon = () => {
    if (type === ApproveType.AUCTION) return <Auction className="h-8 w-8" purple />
    return <CheckmarkFilled className="h-6 w-6" />
  }

  const title = () => {
    if (type === ApproveType.AUCTION) return "Auction"
    return "Buy Now"
  }

  const image = () => {
    if (type === ApproveType.AUCTION) return <ApproveMarketplace />
    return <ApproveBuyNow />
  }

  return (
    <Modal
      show={showApprove}
      title={`Approve ${title()}`}
      onClose={handleClose}
      leftButton={
        <button className="p-2 ml-3 text-gray-400 font-bold flex-1 text-center text-sm" onClick={handleClose}>
          Cancel
        </button>
      }
    >
      <div className="flex flex-col bg-gray-10 w-full h-full justify-between">
        <div className="flex flex-col justify-evenly items-center p-4 gap-4 h-full text-center">
          <div className="flex flex-row gap-2 items-center">
            {icon()}
            <span className="text-white font-bold">{title()}</span>
          </div>
          <div className="text-xs text-gray-80">
            To get set up for selling on SoundChain for the first time,
            you must approve the SoundChain marketplace smart contracts to move your NFT.
            This is only required once and includes a small gas fee.
          </div>
          <div>
            {image()}
          </div>
        </div>
        <div>
          <div className="flex w-full bg-gray-15 p-4">
            <div className="flex-1 flex items-center justify-start text-gray-CC font-bold text-xs uppercase">
              Max Gas Fee
            </div>
            <div className="flex flex-wrap items-center justify-center uppercase gap-1">
              <span className="text-white font-black text-md leading-tight">{maxGasFee}</span>
              <span className="my-auto">
                <Matic />
              </span>
              <span className="text-gray-80 font-black text-xxs leading-tight">matic</span>
            </div>
          </div>
          <div className="flex justify-around p-6 gap-6">
            <Button className="w-full" variant="cancel" onClick={handleClose} loading={loading}>
              Cancel
            </Button>
            <Button className="w-full" variant="approve" onClick={setApprove} loading={loading}>
              Approve
            </Button>
          </div>
        </div>
        
      </div>
    </Modal>
  );
};
