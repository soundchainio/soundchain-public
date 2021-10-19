import classNames from 'classnames';
import { FormValues, InitialValues, TrackMetadataForm } from 'components/forms/track/TrackMetadataForm';
import { TrackUploader } from 'components/forms/track/TrackUploader';
import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { useUpload } from 'hooks/useUpload';
import { useWallet } from 'hooks/useWallet';
import { mintNftToken } from 'lib/blockchain';
import {
  CreateTrackMutation,
  FeedDocument,
  useCreateTrackMutation,
  usePinJsonToIpfsMutation,
  usePinToIpfsMutation,
  useUpdateTrackMutation,
} from 'lib/graphql';
import * as musicMetadata from 'music-metadata-browser';
import Image from 'next/image';
import React, { useState } from 'react';
import { Metadata, Receipt } from 'types/NftTypes';
import { MiningState, MintingDone } from './MintingDone';

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

  const [newTrack, setNewTrack] = useState<CreateTrackMutation['createTrack']['track']>();

  const { upload } = useUpload();
  const [createTrack] = useCreateTrackMutation();
  const [updateTrack] = useUpdateTrackMutation();

  const { web3, account } = useWallet();
  const [pinToIPFS] = usePinToIpfsMutation();
  const [pinJsonToIPFS] = usePinJsonToIpfsMutation();

  const [transactionHash, setTransactionHash] = useState<string>();
  const [mintingState, setMintingState] = useState<string>();
  const [miningState, setMiningState] = useState<MiningState>(MiningState.IN_PROGRESS);

  const [initialValues, setInitialValues] = useState<InitialValues>();

  const handleFileDrop = (file: File) => {
    musicMetadata.parseBlob(file).then(({ common: fileMetadata }) => {
      let artworkFile;
      if (fileMetadata?.picture?.length) {
        const type = fileMetadata.picture[0].format;
        const blob = new Blob([fileMetadata.picture[0].data], {
          type,
        });
        artworkFile = new File([blob], 'artwork', { type });
      }

      setInitialValues({
        title: fileMetadata?.title,
        artist: fileMetadata?.artist,
        description: fileMetadata?.comment && fileMetadata.comment[0],
        album: fileMetadata?.album,
        releaseYear: fileMetadata?.year,
        artworkFile: artworkFile,
      });
    });

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
    if (file && web3 && account) {
      const { title, artworkUrl, description, quantity, album, artist, genres, releaseYear } = values;

      setMintingState('Uploading track file');
      const assetUrl = await upload([file]);
      const artUrl = artworkUrl;

      setMintingState('Creating streaming from track');
      const { data } = await createTrack({
        variables: { input: { assetUrl, title, album, artist, artworkUrl, description, genres, releaseYear } },
      });
      const track = data?.createTrack.track;

      if (!track) {
        setMintingState(undefined);
        alert('We had some trouble, please try again later!');
        return;
      }

      setNewTrack(track);

      const assetKey = assetUrl.substring(assetUrl.lastIndexOf('/') + 1);
      setMintingState('Pinning track to IPFS');
      const { data: assetPinResult } = await pinToIPFS({
        variables: {
          input: {
            fileKey: assetKey,
            fileName: values.title,
          },
        },
      });

      const metadata: Metadata = {
        description,
        name: title,
        asset: `ipfs://${assetPinResult?.pinToIPFS.cid}`,
        album,
        artist,
        releaseYear,
        genres,
      };

      if (artUrl) {
        const artPin = artUrl.substring(artUrl.lastIndexOf('/') + 1);
        setMintingState('Pinning artwork to IPFS');
        const { data: artPinResult } = await pinToIPFS({
          variables: {
            input: {
              fileKey: artPin,
              fileName: `${title}-art`,
            },
          },
        });
        metadata.art = `ipfs://${artPinResult?.pinToIPFS.cid}`;
      }

      const { data: metadataPinResult } = await pinJsonToIPFS({
        variables: {
          input: {
            fileName: `${title}-metadata`,
            json: metadata,
          },
        },
      });
      setMintingState('Minting NFT');

      const onTransactionHash = (hash: string) => {
        updateTrack({
          variables: {
            input: {
              trackId: track.id,
              nftData: {
                transactionHash: hash,
              },
            },
          },
          refetchQueries: [FeedDocument],
        });

        setMintingState(undefined);
        setTransactionHash(hash);
      };

      const onReceipt = (receipt: Receipt) => {
        if (receipt.status) {
          updateTrack({
            variables: {
              input: {
                trackId: track.id,
                nftData: {
                  minter: account,
                  contract: receipt.to,
                  tokenId: receipt.events.TransferSingle.returnValues.id,
                  quantity: parseInt(receipt.events.TransferSingle.returnValues.value),
                },
              },
            },
          });
          setMiningState(MiningState.DONE);
        } else {
          setMiningState(MiningState.ERROR);
        }
      };
      mintNftToken(
        web3,
        `ipfs://${metadataPinResult?.pinJsonToIPFS.cid}`,
        account,
        account,
        quantity,
        onTransactionHash,
        onReceipt,
      );
    }
  };

  const handleClose = () => {
    dispatchShowCreateModal(false);
    setTransactionHash(undefined);
    setFile(undefined);
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
        <button className="p-2 w-full text-gray-400 font-bold flex-1 text-center text-sm" onClick={handleClose}>
          Close
        </button>
      }
    >
      {transactionHash && newTrack ? (
        <MintingDone transactionHash={transactionHash} track={newTrack} miningState={miningState} />
      ) : (
        <>
          <div className="px-4 py-4">
            <TrackUploader onFileChange={handleFileDrop} />
          </div>
          {file && preview && <TrackMetadataForm handleSubmit={handleSubmit} initialValues={initialValues} />}
          {mintingState && (
            <div className="absolute top-0 left-0 flex flex-col items-center justify-center h-full w-full bg-gray-20 bg-opacity-80">
              <Image height={200} width={200} src="/nyan-cat-rainbow.gif" alt="Loading" priority />
              <div className="font-bold text-lg text-white">{mintingState}</div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};
