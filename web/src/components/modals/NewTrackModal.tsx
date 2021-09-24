import classNames from 'classnames';
import { TrackForm } from 'components/forms/track/TrackForm';
import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import React, { useState } from 'react';

enum Tabs {
  NFT = 'NFT',
  POST = 'Post',
}

export const NewTrackModal = () => {
  const modalState = useModalState();
  const { dispatchShowNewTrackModal } = useModalDispatch();
  const [tab, setTab] = useState(Tabs.NFT);

  const isOpen = modalState.showNewTrack;

  const tabs = (
    <div className="flex bg-gray-10 rounded-lg">
      <div
        onClick={() => setTab(Tabs.NFT)}
        className={classNames(
          'flex-1 rounded-lg font-bold text-sm py-1.5',
          tab === Tabs.NFT ? 'text-white bg-gray-30' : 'text-gray-80 cursor-pointer',
        )}
      >
        Mint NFT
      </div>
      <div
        onClick={() => setTab(Tabs.POST)}
        className={classNames(
          'flex-1 rounded-lg font-bold text-sm py-1.5',
          tab === Tabs.POST ? 'text-white bg-gray-30' : 'text-gray-80 cursor-pointer',
        )}
      >
        Post
      </div>
    </div>
  );

  return (
    <Modal
      show={isOpen}
      title={tabs}
      onClose={() => dispatchShowNewTrackModal(false)}
      leftButton={
        <div
          className="p-2 text-gray-400 font-bold flex-1 text-center text-sm"
          onClick={() => dispatchShowNewTrackModal(false)}
        >
          Cancel
        </div>
      }
    >
      <TrackForm
        afterSubmit={() => {
          dispatchShowNewTrackModal(false);
        }}
      />
    </Modal>
  );
};
