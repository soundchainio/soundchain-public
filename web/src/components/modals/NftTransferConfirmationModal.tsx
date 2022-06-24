import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import useBlockchainV2 from 'hooks/useBlockchainV2';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import Asset from '../Asset';
import { ShowTransferNftConfirmationPayload } from '../../contexts/payloads/modal';
import { Matic } from '../Matic';
import { Label } from '../Label';
import { WalletSelected } from '../WalletSelected';
import { DefaultWallet } from '../../lib/graphql';
import { ConnectedNetwork } from '../ConnectedNetwork';
import { CopyWalletAddress } from '../CopyWalletAddress';
import MaxGasFee from '../MaxGasFee';
import { useMaxGasFee } from '../../hooks/useMaxGasFee';
import { Button } from '../Button';
import { toast } from 'react-toastify';
import Image from 'next/image';

export const NftTransferConfirmationModal = () => {
  const modalState = useModalState();
  const { asPath, query, push } = useRouter();
  const { address: account } = query;
  const { dispatchShowNftTransferConfirmationModal } = useModalDispatch();
  const me = useMe();
  const isSoundchain = account === me?.magicWalletAddress;
  const { web3, balance, refetchBalance } = useWalletContext();
  const { transferNftToken } = useBlockchainV2();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [transactionHash, setTransactionHash] = useState<string>();
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    handleClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asPath]);

  const isOpen = modalState.showTransferNftConfirmation;
  const {
    walletRecipient,
    artist = '',
    title = '',
    tokenId,
    artworkUrl
  } = modalState as unknown as ShowTransferNftConfirmationPayload;

  const maxGasFee = useMaxGasFee(isOpen);

  const handleClose = () => {
    dispatchShowNftTransferConfirmationModal({
      show: false,
    });

    if (!loading) {
      setTransactionHash(undefined);
    }
  };

  const hasEnoughFunds = () => {
    if (balance && maxGasFee) {
      return +balance > +maxGasFee;
    }
    return false;
  };

  const onTransfer = () => {
    console.log({
      tokenId,
      walletRecipient,
      account
    })
    if (!tokenId || !walletRecipient || !account) return;

    setLoading(true)
    if (hasEnoughFunds() && web3 && refetchBalance) {
      transferNftToken(tokenId, account as string, walletRecipient)
        .onReceipt(receipt => {
          toast.success('Your nft has been transferred successfully!')
          setTransactionHash(receipt.transactionHash)
          setLoading(false)

          push('/wallet')
        })
        .onError(() => toast.error(`We had some trouble, please try again later!`))
        .finally(() => {
          setLoading(false)
        })
        .execute(web3);
    }
  };

  return (
    <Modal
      show={isOpen}
      title={
        <div className="flex justify-center">
          <span>Confirm Transfer</span>
        </div>
      }
      onClose={handleClose}
      leftButton={
        <button className="w-full flex-1 p-2 text-center text-sm font-bold text-gray-400" onClick={handleClose}>
          Cancel
        </button>
      }
    >
      <div className="px-4 text-center text-sm font-bold text-gray-80">
        <p className="py-3 text-center">Are you sure you want to send</p>
        <div className="mt-3 flex justify-center">
          <div className="relative ml-3 flex h-14 w-14 flex-shrink-0 items-center bg-gray-80">
            <Asset src={artworkUrl} sizes="5rem" />
          </div>
          <div className={'ml-2 flex flex-col items-start'}>
            <p className={'font-semibold text-white'}>{title}</p>
            <p className={'text-gray-80'}>{artist}</p>
          </div>
        </div>
        <p className="pt-6">This transaction cannot be undone.</p>
      </div>

      <div className="flex flex-col space-y-6 py-6">
        <div className="space-y-2">
          <div className="px-4">
            <Label className="font-bold uppercase" textSize="xs">
              FROM:
            </Label>
          </div>
          <div className="flex flex-col items-center gap-2 px-3">
            <WalletSelected wallet={isSoundchain ? DefaultWallet.Soundchain : DefaultWallet.MetaMask} />
            <ConnectedNetwork />
          </div>
          {account && <CopyWalletAddress walletAddress={account as string} />}
        </div>
        <div className="space-y-2">
          <div className="px-4">
            <Label className="font-bold uppercase" textSize="xs">
              TO:
            </Label>
          </div>
          {walletRecipient && <CopyWalletAddress walletAddress={walletRecipient} />}
        </div>
      </div>

      <div className="flex-1" />
      <div className="flex flex-col pt-4">
        <div className="flex flex-col bg-gray-20">
          <div className="flex flex-col p-4">
            <MaxGasFee text={'Gas fee'} />
          </div>
        </div>
        <div className="flex w-full items-center justify-between bg-black p-5">
          <div className="text-xs">
            <Matic value={Number(maxGasFee || '0')} variant="currency" />
          </div>

          <div className="w-7/12 md:w-3/12">
            <Button className="" onClick={onTransfer} type="submit" variant="approve">
              Confirm Transfer
            </Button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="absolute top-0 left-0 flex flex-col items-center justify-center h-full w-full bg-gray-20 bg-opacity-80">
          <Image
            height={200}
            width={200}
            src={'/nyan-cat-rainbow.gif' }
            alt="Loading"
            priority
          />
          <div className="font-bold text-lg text-white text-center mt-4">Transfering nft...</div>
        </div>
      )}
    </Modal>
  );
};

export default NftTransferConfirmationModal;