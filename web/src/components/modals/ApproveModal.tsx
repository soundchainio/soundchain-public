import { Button } from 'components/Button';
import MaxGasFee from 'components/MaxGasFee';
import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import useBlockchainV2 from 'hooks/useBlockchainV2';
import { useWalletContext } from 'hooks/useWalletContext';
import { ApproveBuyNow } from 'icons/ApproveBuyNow';
import { ApproveMarketplace } from 'icons/ApproveMarketplace';
import { Auction } from 'icons/Auction';
import { CheckmarkFilled } from 'icons/CheckmarkFilled';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { SaleType } from 'types/SaleType';

export const ApproveModal = () => {
  const { account, web3 } = useWalletContext();
  const { showApprove, type } = useModalState();
  const { dispatchShowApproveModal } = useModalDispatch();
  const { approveMarketplace, approveAuction } = useBlockchainV2();
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    dispatchShowApproveModal(false, SaleType.CLOSE);
  };

  const setApprove = () => {
    if (!web3 || !account) {
      return;
    }
    const onReceipt = () => {
      setLoading(false);
      dispatchShowApproveModal(false, SaleType.CLOSE);
    };

    setLoading(true);

    const approve =
      type === SaleType.AUCTION
        ? approveAuction(account)
        : type === SaleType.MARKETPLACE
        ? approveMarketplace(account)
        : null;

    approve
      ?.onReceipt(onReceipt)
      .onError(cause => toast.error(cause.message))
      .finally(() => setLoading(false))
      .execute(web3);
  };

  const icon =
    type === SaleType.AUCTION ? <Auction className="h-8 w-8" purple /> : <CheckmarkFilled className="h-6 w-6" />;

  const title = type === SaleType.AUCTION ? 'Auction' : 'Buy Now';

  const image = type === SaleType.AUCTION ? <ApproveMarketplace /> : <ApproveBuyNow />;

  return (
    <Modal
      show={showApprove}
      title={`Approve ${title}`}
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
            {icon}
            <span className="text-white font-bold">{title}</span>
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
          <div className="flex justify-around p-6 gap-6">
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
  );
};
