import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { Form, Formik } from 'formik';
import useBlockchain from 'hooks/useBlockchain';
import { useMagicContext } from 'hooks/useMagicContext';
import { useMaxGasFee } from 'hooks/useMaxGasFee';
import { Logo } from 'icons/Logo';
import { Matic } from 'icons/Matic';
import router from 'next/router';
import React, { useState } from 'react';
import { TransactionReceipt } from 'web3-core/types';
import { Button } from './Button';
import { Label } from './Label';
import { Account, Wallet } from './Wallet';

export const TransferConfirmationModal = () => {
  const { showTransferConfirmation, walletRecipient, amountToTransfer } = useModalState();
  const { dispatchShowTransferConfirmationModal } = useModalDispatch();
  const [loading, setLoading] = useState(false);
  const { transfer } = useBlockchain();
  const { web3, account, balance, refetchBalance } = useMagicContext();

  const maxGasFee = useMaxGasFee();

  const handleClose = () => {
    dispatchShowTransferConfirmationModal(false);
  };

  const handleCancel = () => {
    handleClose();
  };

  const initialValues = {
    recipient: '',
    amount: '0.00',
    totalGasFee: '',
  };

  const hasEnoughFunds = () => {
    if (balance && maxGasFee && amountToTransfer) {
      return +balance > +maxGasFee + +amountToTransfer;
    }
    return false;
  };

  const handleSubmit = () => {
    if (hasEnoughFunds()) {
      try {
        setLoading(true);
        const onTransactionHash = (hash: string) => {
          console.log(hash);
        };

        const onReceipt = (receipt: TransactionReceipt) => {
          console.log(receipt);
          alert('Transaction completed!');
          setLoading(false);
          handleClose();
          refetchBalance();
          router.push('/wallet');
        };
        if (account && walletRecipient && amountToTransfer) {
          transfer(web3, walletRecipient, account, amountToTransfer, onTransactionHash, onReceipt);
        }
      } catch (e) {
        console.log(e);
        setLoading(false);
        alert('We had some trouble, please try again later!');
      }
    } else {
      alert("Uh-oh, it seems you don't have enough funds for this transaction. Please select an appropriate amount");
      handleClose();
    }
  };

  return (
    <Modal
      show={showTransferConfirmation}
      title="Confirm Transaction"
      onClose={handleClose}
      leftButton={
        <div className="p-2 text-gray-400 font-bold flex-1 text-center text-sm" onClick={handleCancel}>
          Cancel
        </div>
      }
    >
      <Formik initialValues={initialValues} onSubmit={handleSubmit}>
        <Form className="flex flex-col w-full h-full justify-between" autoComplete="off">
          <div className="flex flex-col mb-auto space-y-6 h-full justify-between">
            <div className="flex flex-col h-full justify-around">
              <div className="px-4 text-sm text-gray-80 font-bold text-center">
                <p className="flex flex-wrap items-end justify-center text-center py-6">
                  <span className="leading-tight">Are you sure you want to send</span>
                  <span className="my-auto mx-1">
                    <Matic />
                  </span>
                  <span className="mx-1 text-white text-md leading-tight">{amountToTransfer}</span>
                  <span className="text-gray-80 font-bold text-xxs uppercase leading-tight">matic</span>
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
                      TO:{' '}
                    </Label>
                  </div>
                  <Account account={walletRecipient} defaultWallet={true} />
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
              <div className="flex w-full bg-gray-20">
                <div className="flex-1 flex items-center justify-start text-gray-CC font-bold text-xs uppercase px-4 py-3">
                  Total
                </div>
                <div className="flex flex-wrap items-center justify-center uppercase px-4 py-3">
                  <span className="my-auto">
                    <Matic />
                  </span>
                  <span className="mx-1 text-white font-bold text-md leading-tight">
                    {Number(maxGasFee || '0') + Number(amountToTransfer || '0')}
                  </span>
                  <div className="items-end">
                    <span className="text-gray-80 font-black text-xxs leading-tight">matic</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <Button type="submit" loading={loading}>
              Confirm Transaction
            </Button>
          </div>
        </Form>
      </Formik>
    </Modal>
  );
};
