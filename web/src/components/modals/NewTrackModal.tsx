import { MintingRequestForm } from 'components/forms/track/MintingRequestForm';
import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import React from 'react';

export const NewTrackModal = () => {
  const modalState = useModalState();
  const { dispatchShowNewTrackModal } = useModalDispatch();

  const isOpen = modalState.showNewTrack;

  return (
    <Modal
      show={isOpen}
      title="Mint NFT"
      onClose={() => dispatchShowNewTrackModal(false)}
      leftButton={
        <div
          className="p-2 text-gray-400 font-bold flex-1 text-center"
          onClick={() => dispatchShowNewTrackModal(false)}
        >
          Close
        </div>
      }
    >
      <MintingRequestForm
        to=""
        afterSubmit={() => {
          dispatchShowNewTrackModal(false);
        }}
      />
    </Modal>
  );
};
