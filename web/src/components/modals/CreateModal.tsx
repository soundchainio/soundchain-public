import axios from 'axios';
import classNames from 'classnames';
import { FormValues, TrackMetadataForm } from 'components/forms/track/TrackMetadataForm';
import { TrackUploader } from 'components/forms/track/TrackUploader';
import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { useMagicContext } from 'hooks/useMagicContext';
import { useMe } from 'hooks/useMe';
import { useUpChunk } from 'hooks/useUpChunk';
import { useUploadTrackMutation } from 'lib/graphql';
import React, { useState } from 'react';

enum Tabs {
  NFT = 'NFT',
  POST = 'Post',
}

export const CreateModal = () => {
  const modalState = useModalState();
  const { dispatchShowCreateModal, dispatchShowPostModal } = useModalDispatch();
  const [tab, setTab] = useState(Tabs.NFT);

  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();

  const [uploadTrack] = useUploadTrackMutation();
  const [startUpload, { uploading, progress, cancelUpload }] = useUpChunk();

  const magic = useMagicContext();
  console.log(magic);

  const me = useMe();

  console.log(me);

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
  };

  const handleSubmit = async (values: FormValues) => {
    console.log(values);

    if (file) {
      const { data } = await uploadTrack({ variables: { input: { fileType: file.type } } });
      console.log({ data });
      if (data) {
        axios.put(data.uploadTrack.track.uploadUrl, file, { headers: { 'Content-Type': file.type } });
        startUpload(data.uploadTrack.track.muxUpload.url, file);
        console.log(data.uploadTrack.track.file);
        // if (setAssetUrl) setAssetUrl(data.uploadTrack.track.file);
      }
    }
  };

  const handleClose = () => {
    dispatchShowCreateModal(false);
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
      <TrackUploader
        onFileChange={handleFileDrop}
        cancelUpload={cancelUpload}
        progress={progress}
        uploading={uploading}
      />
      {file && preview && <TrackMetadataForm handleSubmit={handleSubmit} />}
    </Modal>
  );
};
