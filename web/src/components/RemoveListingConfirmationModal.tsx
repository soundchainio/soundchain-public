import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import useBlockchainV2, { ContractAddresses } from 'hooks/useBlockchainV2';
import { useMaxGasFee } from 'hooks/useMaxGasFee';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { PendingRequest, useUpdateAllOwnedTracksMutation, useUpdateTrackMutation } from 'lib/graphql';
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
  const { showRemoveListing, trackId, tokenId, editionId, trackEditionId, saleType, contractAddresses } = useModalState();
  const [trackUpdate] = useUpdateTrackMutation();
  const [ownedTracksUpdate] = useUpdateAllOwnedTracksMutation();
  const { dispatchShowRemoveListingModal } = useModalDispatch();
  const { cancelListing, cancelAuction, cancelEditionListing } = useBlockchainV2();
  const { web3, account, balance } = useWalletContext();
  const maxGasFee = useMaxGasFee(showRemoveListing);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    dispatchShowRemoveListingModal({show: false, tokenId: 0, trackId: '', saleType: SaleType.CLOSE, contractAddresses: {}});
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

  const getCancelationHandler = (account: string, tokenId?: number, editionId?: number, contractAddresses?: ContractAddresses) => {
    if (editionId) {
      if (!trackEditionId) return;
      return cancelEditionListing(editionId, account, contractAddresses);
    }

    if (!tokenId || !trackId) return;

    if (saleType === SaleType.AUCTION) {
      return cancelAuction(tokenId, account, contractAddresses);
    }
    return cancelListing(tokenId, account, contractAddresses);
  }

  const onReceipt = async () => {
    if (editionId && trackEditionId) {
      await ownedTracksUpdate({
        variables: {
          input: {
            trackEditionId,
            owner: account!,
            nftData: {
              pendingRequest: PendingRequest.CancelListing,
              pendingTime: new Date().toISOString(),
            },
          }
        }
      })
    } else {
      await trackUpdate({
        variables: {
          input: {
            trackId: trackId!,
            nftData: {
              pendingRequest: PendingRequest.CancelListing,
              pendingTime: new Date().toISOString(),
            },
          },
        },
      });
    }

    handleClose();
    if (editionId) return;

    saleType === SaleType.MARKETPLACE
      ? router.replace(router.asPath.replace('edit/buy-now', ''))
      : router.replace(router.asPath.replace('edit/auction', ''));
  };

  const handleSubmit = () => {
    if (!account || !web3) return;
    const cancelationHandler = getCancelationHandler(account, tokenId, editionId, contractAddresses)
    if (!cancelationHandler) return;

    if (!hasEnoughFunds()) {
      alert("Uh-oh, it seems you don't have enough funds for this transaction. Please select an appropriate amount");
      handleClose();
      return;
    }

    setLoading(true);    

    cancelationHandler
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
        <button className="p-2 text-gray-400 font-bold flex-1 text-center text-sm" onClick={handleCancel}>
          Cancel
        </button>
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
