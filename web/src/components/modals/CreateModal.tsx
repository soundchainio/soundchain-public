import classNames from 'classnames';
import { AudioPlayer } from 'components/AudioPlayer';
import { FormValues, TrackMetadataForm } from 'components/forms/track/TrackMetadataForm';
import { TrackUploader } from 'components/forms/track/TrackUploader';
import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { useMagicContext } from 'hooks/useMagicContext';
import { useUpload } from 'hooks/useUpload';
import { Anchor } from 'icons/Anchor';
import { Polygon } from 'icons/Polygon';
import { mintNftToken } from 'lib/blockchain';
import {
  CreateTrackMutation,
  FeedDocument,
  useCreateTrackMutation,
  usePinJsonToIpfsMutation,
  usePinToIpfsMutation,
  useUpdateTrackMutation
} from 'lib/graphql';
import * as musicMetadata from 'music-metadata-browser';
import Image from 'next/image';
import React, { useState } from 'react';
import { Metadata, Receipt } from 'types/NftTypes';

enum Tabs {
  NFT = 'NFT',
  POST = 'Post',
}

enum MiningState {
  IN_PROGRESS = 'In progress...',
  DONE = 'Done!',
  ERROR = 'Error :(',
}

export const CreateModal = () => {
  const modalState = useModalState();
  const { dispatchShowCreateModal, dispatchShowPostModal } = useModalDispatch();
  const [tab, setTab] = useState(Tabs.NFT);

  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [fileMetadata, setFileMetadata] = useState<musicMetadata.IAudioMetadata['common']>();

  const [newTrack, setNewTrack] = useState<CreateTrackMutation['createTrack']['track']>();

  const { upload } = useUpload();
  const [createTrack] = useCreateTrackMutation();
  const [updateTrack] = useUpdateTrackMutation();

  const { web3, account } = useMagicContext();
  const [pinToIPFS] = usePinToIpfsMutation();
  const [pinJsonToIPFS] = usePinJsonToIpfsMutation();

  const [transactionHash, setTransactionHash] = useState<string>();
  const [mintingState, setMintingState] = useState<string>();
  const [miningState, setMiningState] = useState<MiningState>(MiningState.IN_PROGRESS);

  const handleFileDrop = (file: File) => {
    musicMetadata.parseBlob(file).then(result => setFileMetadata(result.common));

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
          tab === Tabs.NFT ? 'text-white bg-gray-20' : 'text-gray-80 cursor-pointer',
        )}
      >
        Mint NFT
      </div>
      <div
        onClick={handlePostTabClick}
        className={classNames(
          'flex-1 rounded-lg font-bold text-sm py-1.5',
          tab === Tabs.POST ? 'text-white bg-gray-20' : 'text-gray-80 cursor-pointer',
        )}
      >
        Post
      </div>
    </div>
  );

  if (transactionHash) {
    return (
      <Modal
        show={isOpen}
        title={tabs}
        onClose={handleClose}
        leftButton={
          <div className="p-2 text-gray-400 font-bold flex-1 text-center text-sm" onClick={handleClose}>
            Close
          </div>
        }
      >
        <div className="h-full w-full" style={{ backgroundColor: '#101010' }}>
          {newTrack && (
            <AudioPlayer
              title={newTrack.title}
              src={newTrack.playbackUrl}
              art={newTrack.artworkUrl}
              artist={newTrack.artist}
            />
          )}
          <div
            className="h-96 p-4 flex flex-col justify-center items-center	bg-no-repeat text-center text-xl text-white font-black uppercase"
            style={{ backgroundImage: 'url(/congratulations.gif)', backgroundSize: '100% 100%' }}
          >
            <div style={{ color: '#808080' }}>Congrats,</div>
            <div>you created an NFT!</div>
          </div>
          <div className="flex">
            <div className="uppercase mr-auto text-xs font-bold py-3 px-4" style={{ color: '#CCCCCC' }}>
              Mining Status
            </div>
            <div
              className="flex gap-2 items-center py-3 px-4 text-white font-bold text-xs"
              style={{ backgroundColor: '#252525' }}
            >
              {miningState === MiningState.IN_PROGRESS ? (
                <>
                  <Image width={16} height={16} priority src="/loading.gif" alt="" /> {miningState}
                </>
              ) : (
                <>{miningState}</>
              )}
            </div>
          </div>
          <div className="flex gap-4 items-center text-xs text-white py-3 px-4" style={{ backgroundColor: '#151515' }}>
            <div className="flex items-center whitespace-nowrap font-bold">
              <Polygon />
              Token ID:
            </div>
            <div className="flex items-center gap-1 truncate">
              <Anchor style={{ minWidth: '8px' }} />
              <a
                className="truncate font-black "
                style={{ fontSize: '9px', lineHeight: '9px', borderBottom: '1px solid gray', color: '#808080' }}
                href={`https://mumbai.polygonscan.com/tx/${transactionHash}`}
                rel="noreferrer"
                target="_blank"
              >
                {transactionHash}
              </a>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  const initialValues: FormValues = {
    title: fileMetadata?.title || '',
    artist: fileMetadata?.artist || '',
    description: fileMetadata?.comment ? fileMetadata.comment[0] : '',
    album: fileMetadata?.album,
    releaseYear: fileMetadata?.year,
    quantity: 1,
  };

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
    </Modal>
  );
};
