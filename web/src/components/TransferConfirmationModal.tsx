import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import React, { useEffect, useState } from 'react';
import { Form, Formik } from 'formik';
import { Modal } from 'components/Modal';
import useBlockchain from 'hooks/useBlockchain';
import { TransactionReceipt } from 'web3-core/types'
import { useMagicContext } from 'hooks/useMagicContext';
import { Matic } from 'icons/Matic';
import { Logo } from 'icons/Logo';
import { Account, Wallet } from './Wallet';
import { Label } from './Label';
import { Button } from './Button';
import router from 'next/router';

export const TransferConfirmationModal = () => {
  const { showTransferConfirmation, walletRecipient, amountToTransfer } = useModalState();
  const { dispatchShowTransferConfirmationModal } = useModalDispatch();
  const [loading, setLoading] = useState(false);
  const { getMaxGasFee, transfer } = useBlockchain();
  const { web3, account, balance } = useMagicContext();

  const [maxGasFee, setMaxGasFee] = useState<string>();

  useEffect(() => {
    const gasCheck = () => {
      if (web3) {
        getMaxGasFee(web3).then(setMaxGasFee);
      }
    };
    gasCheck();
    const interval = setInterval(() => {
      gasCheck();
    }, 5 * 1000);
    return () => clearInterval(interval);
  }, [web3, getMaxGasFee]);

  const handleClose = () => {
    dispatchShowTransferConfirmationModal(false);
  };

  const handleCancel = () => {
    handleClose();
  };

  const initialValues = {
    recipient: '',
    amount: '0.00',
    totalGasFee: maxGasFee,
  };

  const hasEnoughFunds = () => {
    if(balance && maxGasFee && amountToTransfer) {
      return (+balance > +maxGasFee + +amountToTransfer)
    } return false;
  }

  const handleSubmit = () => {
    if (hasEnoughFunds()) {
      try {
        setLoading(true)
        const onTransactionHash = (hash:string) => {
          console.log(hash);
        }

        const onReceipt = (receipt: TransactionReceipt) => {
          console.log(receipt)
          alert('Transaction completed!')
          setLoading(false)
          handleClose();
          router.push('/wallet')
        }
        if(account && walletRecipient && amountToTransfer) {
          transfer(web3, account, walletRecipient, amountToTransfer, onTransactionHash, onReceipt);
        }
      } catch(e) { 
        console.log(e)
        setLoading(false)
        alert('We had some trouble, please try again later!');
      } 
    } else {
        alert("Uh-oh, it seems you don't have enough funds for this transaction. Please select an appropriate amount")
        handleClose();
    }
  }

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
                  <div className="px-4"><Label className="uppercase font-bold" textSize="xs">FROM: </Label></div>
                  <Wallet account={account} icon={() => <Logo id="soundchain-wallet" height="20" width="20" />} title="SoundChain Wallet" correctNetwork={true} defaultWallet={true} />
                </div>
                <div className="space-y-2">
                  <div className="px-4"><Label className="uppercase font-bold" textSize="xs">TO: </Label></div>
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
                  <span className="mx-1 text-white font-bold text-md leading-tight">{parseFloat(maxGasFee || '0') + parseFloat(amountToTransfer || '0')}</span>
                  <div className="items-end">
                    <span className="text-gray-80 font-black text-xxs leading-tight">matic</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <Button type="submit" loading={loading}>Confirm Transaction</Button>
          </div>
        </Form>
      </Formik>
    </Modal>
  );
};
