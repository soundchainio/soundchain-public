import classNames from 'classnames';
import { AudioPlayer } from 'components/AudioPlayer';
import { TrackMetadataForm } from 'components/forms/track/TrackMetadataForm';
import { TrackUploader } from 'components/forms/track/TrackUploader';
import { Modal } from 'components/Modal';
import { Track } from 'components/Track';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import React, { useState } from 'react';

enum Tabs {
  NFT = 'NFT',
  POST = 'Post',
}

export const CreateModal = () => {
  const modalState = useModalState();
  const { dispatchShowCreateModal, dispatchShowPostModal } = useModalDispatch();
  const [tab, setTab] = useState(Tabs.NFT);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);

  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();

  const handleFileDrop = (file: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.addEventListener('loadend', () => {
      setPreview(reader.result as string);
      setFile(file);
    });
  };

  const isOpen = modalState.showCreate;

  const handlePostTabClick = () => {
    dispatchShowCreateModal(false);
    dispatchShowPostModal(true);
    setTrackId(null);
  };

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
        onClick={handlePostTabClick}
        className={classNames(
          'flex-1 rounded-lg font-bold text-sm py-1.5',
          tab === Tabs.POST ? 'text-white bg-gray-30' : 'text-gray-80 cursor-pointer',
        )}
      >
        Post
      </div>
    </div>
  );

  const handleClose = () => {
    dispatchShowCreateModal(false);
    setTrackId(null);
  };

  console.log('olha o bonitao aqui', file);

  return (
    <Modal
      show={isOpen}
      title={tabs}
      onClose={handleClose}
      leftButton={
        <div className="p-2 text-gray-400 font-bold flex-1 text-center text-sm" onClick={handleClose}>
          Cancel
        </div>
      }
    >
      {!trackId && <TrackUploader onSuccess={handleFileDrop} setAssetUrl={setAssetUrl} />}
      {file && preview && <AudioPlayer trackId={'1'} title={file.name} src={preview} />}
      {trackId && <Track trackId={trackId} coverPhotoUrl={coverPhotoUrl || undefined} />}
      {trackId && (
        <TrackMetadataForm
          trackId={trackId}
          assetUrl={assetUrl || ''}
          setCoverPhotoUrl={setCoverPhotoUrl}
          afterSubmit={handleClose}
        />
      )}
    </Modal>
  );
};
