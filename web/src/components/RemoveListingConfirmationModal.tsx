import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import useBlockchain from 'hooks/useBlockchain';
import { useMaxGasFee } from 'hooks/useMaxGasFee';
import { useWalletContext } from 'hooks/useWalletContext';
import { Logo } from 'icons/Logo';
import { PendingRequest, useUpdateTrackMutation } from 'lib/graphql';
import router from 'next/router';
import { useState } from 'react';
import { SaleType } from 'types/SaleType';
import { Button } from './Button';
import { Label } from './Label';
import MaxGasFee from './MaxGasFee';
import { Account, Wallet } from './Wallet';

const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || '';

export const RemoveListingConfirmationModal = () => {
  const { showRemoveListing, trackId, tokenId, saleType } = useModalState();
  const [trackUpdate] = useUpdateTrackMutation();
  const { dispatchShowRemoveListingModal } = useModalDispatch();
  const { cancelListing, cancelAuction } = useBlockchain();
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

    try {
      setLoading(true);
      if (!account || !web3) return;
      const onTransactionHash = async () => {
        await trackUpdate({
          variables: {
            input: {
              trackId: trackId,
              nftData: {
                pendingRequest: PendingRequest.CancelListing,
              },
            },
          },
        });

        dispatchShowRemoveListingModal(false, 0, '', SaleType.CLOSE);
        saleType === SaleType.MARKETPLACE
          ? router.push(router.asPath.replace('edit/buy-now', ''))
          : router.push(router.asPath.replace('edit/auction', ''));
      };
      saleType === SaleType.MARKETPLACE
        ? cancelListing(web3, tokenId, account, onTransactionHash)
        : cancelAuction(web3, tokenId, account, onTransactionHash);
    } catch (e) {
      setLoading(false);
      alert('We had some trouble, please try again later!');
    }
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
                    FROM:{' '}
                  </Label>
                </div>
                <Wallet
                  account={account}
                  icon={() => <Logo id="soundchain-wallet" height="20" width="20" />} //TODO SHOULD BE DYNAMIC
                  title="SoundChain Wallet"
                  correctNetwork={true}
                  defaultWallet={true}
                />
              </div>
              <div className="space-y-2">
                <div className="px-4">
                  <Label className="uppercase font-bold" textSize="xs">
                    TO MARKETPLACE:{' '}
                  </Label>
                </div>
                <Account account={marketplaceAddress} defaultWallet={true} />
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
