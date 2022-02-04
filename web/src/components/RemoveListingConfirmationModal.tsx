import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import useBlockchainV2 from 'hooks/useBlockchainV2';
import { useMaxGasFee } from 'hooks/useMaxGasFee';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { PendingRequest, useUpdateTrackMutation } from 'lib/graphql';
import router from 'next/router';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { SaleType } from 'types/SaleType';
import { Button } from './Button';
import { ConnectedNetwork } from './ConnectedNetwork';
import { CopyWalletAddress } from './CopyWalletAddress';
import { Label } from './Label';
import MaxGasFee from './MaxGasFee';
import { WalletSelected } from './WalletSelected';

const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || '';

export const RemoveListingConfirmationModal = () => {
  const me = useMe();
  const { showRemoveListing, trackId, tokenId, saleType } = useModalState();
  const [trackUpdate] = useUpdateTrackMutation();
  const { dispatchShowRemoveListingModal } = useModalDispatch();
  const { cancelListing, cancelAuction } = useBlockchainV2();
  const { web3, account, balance } = useWalletContext();
  const maxGasFee = useMaxGasFee(showRemoveListing);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    dispatchShowRemoveListingModal(false, 0, '', SaleType.CLOSE);
  };

  const handleCancel = () => {
    handleClose();
  };

  const hasEnoughFunds = () => {
    if (balance && maxGasFee) {
      return +balance > +maxGasFee;
    }
    return false;
  };

  const handleSubmit = () => {
    if (!tokenId || !trackId) return;

    if (!hasEnoughFunds()) {
      alert("Uh-oh, it seems you don't have enough funds for this transaction. Please select an appropriate amount");
      handleClose();
      return;
    }

    setLoading(true);
    if (!account || !web3) return;
    const onReceipt = async () => {
      await trackUpdate({
        variables: {
          input: {
            trackId: trackId,
            nftData: {
              pendingRequest: PendingRequest.CancelListing,
              pendingTime: new Date().toISOString(),
            },
          },
        },
      });

      dispatchShowRemoveListingModal(false, 0, '', SaleType.CLOSE);
      saleType === SaleType.MARKETPLACE
        ? router.push(router.asPath.replace('edit/buy-now', ''))
        : router.push(router.asPath.replace('edit/auction', ''));
    };
    const cancel =
      saleType === SaleType.MARKETPLACE ? cancelListing(tokenId, account) : cancelAuction(tokenId, account);

    cancel
      .onReceipt(onReceipt)
      .onError(cause => toast.error(cause.message))
      .finally(() => setLoading(false))
      .execute(web3);
  };

  return (
    <Modal
      show={showRemoveListing}
      title="Confirm Transaction"
      onClose={handleClose}
      leftButton={
        <div className="p-2 text-gray-400 font-bold flex-1 text-center text-sm" onClick={handleCancel}>
          Cancel
        </div>
      }
    >
      <div className="flex flex-col w-full h-full justify-between">
        <div className="flex flex-col mb-auto space-y-6 h-full justify-between">
          <div className="flex flex-col h-full justify-around">
            <div className="px-4 text-sm text-gray-80 font-bold text-center">
              <p className="flex flex-wrap items-end justify-center text-center py-6">
                <span className="leading-tight">Are you sure you want to remove listing?</span>
              </p>
              <p>This transaction cannot be undone.</p>
            </div>
            <div className="flex flex-col w-full space-y-6 py-6">
              <div className="space-y-2">
                <div className="px-4">
                  <Label className="uppercase font-bold" textSize="xs">
                    FROM:
                  </Label>
                </div>
                <div className="flex flex-col items-center px-3 gap-2">
                  <WalletSelected wallet={me?.defaultWallet} />
                  <ConnectedNetwork />
                </div>
                {account && <CopyWalletAddress walletAddress={account} />}
              </div>
              <div className="space-y-2">
                <div className="px-4">
                  <Label className="uppercase font-bold" textSize="xs">
                    MARKETPLACE:
                  </Label>
                </div>
                <CopyWalletAddress walletAddress={marketplaceAddress} />
              </div>
            </div>
          </div>
          <div className="flex flex-col p-4 bg-gray-20">
            <MaxGasFee />
          </div>
        </div>
        <div>
          <Button onClick={handleSubmit} loading={loading}>
            Confirm Transaction
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RemoveListingConfirmationModal;
