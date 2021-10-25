import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import React from 'react';
import { Modal } from 'components/Modal';

export const TransferConfirmationModal = () => {
  const { showTransferConfirmation } = useModalState();
  const { dispatchShowTransferConfirmationModal } = useModalDispatch();

  const handleClose = () => {
    dispatchShowTransferConfirmationModal(false);
  };

  const handleCancel = () => {
    // clear form
    handleClose();
  };

  return (
    <Modal
      show={showTransferConfirmation}
      title="Confirm Transaction"
      onClose={handleClose}
      leftButton={
        <div className="p-2 text-gray-400 font-bold flex-1 text-center text-sm" onClick={handleCancel}>
          Close
        </div>
      }
     >
    </Modal>
  );
};
