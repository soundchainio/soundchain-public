import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import useBlockchain from 'hooks/useBlockchain';
import { useMagicContext } from 'hooks/useMagicContext';
import { useMaxGasFee } from 'hooks/useMaxGasFee';
import { Logo } from 'icons/Logo';
import { Matic } from 'icons/Matic';
import { PendingRequest, useUpdateTrackMutation } from 'lib/graphql';
import router from 'next/router';
import { useState } from 'react';
import { Button } from './Button';
import { Label } from './Label';
import { Account, Wallet } from './Wallet';

const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || '';

export const RemoveListingConfirmationModal = () => {
  const { trackId, tokenId } = useModalState();
  const [trackUpdate] = useUpdateTrackMutation();
  const { showRemoveListing } = useModalState();
  const { dispatchShowRemoveListingModal } = useModalDispatch();
  const [loading, setLoading] = useState(false);
  const { cancelListing } = useBlockchain();
  const { web3, account, balance } = useMagicContext();
  const maxGasFee = useMaxGasFee();

  const handleClose = () => {
    dispatchShowRemoveListingModal(false, 0, '');
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
    console.log(tokenId, trackId);
    if (!tokenId || !trackId) return;

    if (!hasEnoughFunds()) {
      alert("Uh-oh, it seems you don't have enough funds for this transaction. Please select an appropriate amount");
      handleClose();
      return;
    }

    try {
      setLoading(true);
      if (!account) return;
      cancelListing(web3, tokenId, account, onReceipt);
      trackUpdate({
        variables: {
          input: {
            trackId: trackId,
            nftData: {
              pendingRequest: PendingRequest.CancelListing,
            },
          },
        },
      });
    } catch (e) {
      console.log(e);
      setLoading(false);
      alert('We had some trouble, please try again later!');
    }
  };

  const onReceipt = () => {
    dispatchShowRemoveListingModal(false, 0, '');
    router.push(router.asPath.replace('edit', ''));
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
                  icon={() => <Logo id="soundchain-wallet" height="20" width="20" />}
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
          <div className="flex flex-col w-full">
            <div className="flex w-full bg-gray-30">
              <div className="flex-1 flex items-center justify-start text-gray-CC font-bold text-xs uppercase px-4 py-3">
                Gas Fees
              </div>
              <div className="flex flex-wrap items-center justify-center uppercase px-4 py-3">
                <span className="my-auto">
                  <Matic />
                </span>
                <span className="mx-1 text-white font-bold text-md leading-tight">{maxGasFee}</span>
                <div className="items-end">
                  <span className="text-gray-80 font-black text-xxs leading-tight">matic</span>
                </div>
              </div>
            </div>
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
