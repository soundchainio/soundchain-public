import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import React, { useEffect, useState } from 'react';
import { Form, Formik } from 'formik';
import { Modal } from 'components/Modal';
import useBlockchain from 'hooks/useBlockchain';
import { FormValues } from './forms/transfer/transferForm';
import { useMagicContext } from 'hooks/useMagicContext';

export const TransferConfirmationModal = () => {
  const { showTransferConfirmation, walletRecipient, amountToTransfer } = useModalState();
  const { dispatchShowTransferConfirmationModal } = useModalDispatch();
  const { getMaxGasFee } = useBlockchain();
  const { web3, balance } = useMagicContext();

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
    // clear form
    handleClose();
  };

  const initialValues = {
    recipient: '',
    amount: '0.00',
    totalGasFee: maxGasFee,
  };

  const handleSubmit = (values: FormValues) => {
    const {recipient, amount} = values
    // dispatchSetRecipientWalletAddress(recipient)
    // dispatchSetAmountToTransfer(amount)
    // dispatchShowTransferConfirmationModal(true)
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
         <Form>
            <p className="text-xs text-gray-400 text-center">{`Are you sure you want to send ${amountToTransfer} This transaction cannot be undone.`}</p>
         </Form>
       </Formik>
    </Modal>
  );
};
