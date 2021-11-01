import classNames from 'classnames';
import { Button } from 'components/Button';
import { FormValues, InitialValues, TrackMetadataForm } from 'components/forms/track/TrackMetadataForm';
import { TrackUploader } from 'components/forms/track/TrackUploader';
import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import useBlockchain from 'hooks/useBlockchain';
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar';
import { useMe } from 'hooks/useMe';
import { useUpload } from 'hooks/useUpload';
import { useWalletContext } from 'hooks/useWalletContext';
import {
  CreateTrackMutation,
  FeedDocument,
  PendingRequest,
  useCreateTrackMutation,
  useDeleteTrackOnErrorMutation,
  usePinJsonToIpfsMutation,
  usePinToIpfsMutation,
  useUpdateTrackMutation,
} from 'lib/graphql';
import * as musicMetadata from 'music-metadata-browser';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { Metadata } from 'types/NftTypes';
import { genres } from 'utils/Genres';
import { MiningState, MintingDone } from './MintingDone';

enum Tabs {
  NFT = 'NFT',
  POST = 'Post',
}

export const CreateModal = () => {
  const modalState = useModalState();
  const { dispatchShowCreateModal, dispatchShowPostModal } = useModalDispatch();
  const me = useMe();
  const [tab, setTab] = useState(Tabs.NFT);
  const { setIsMintingState } = useHideBottomNavBar();

  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();

  const [newTrack, setNewTrack] = useState<CreateTrackMutation['createTrack']['track']>();

  const { upload } = useUpload();
  const [createTrack] = useCreateTrackMutation();
  const [updateTrack] = useUpdateTrackMutation();
  const [deleteTrackOnError] = useDeleteTrackOnErrorMutation();

  const { web3, account } = useWalletContext();
  const [pinToIPFS] = usePinToIpfsMutation();
  const [pinJsonToIPFS] = usePinJsonToIpfsMutation();

  const { mintNftToken } = useBlockchain();
  const [transactionHash, setTransactionHash] = useState<string>();
  const [mintingState, setMintingState] = useState<string>();
  const [miningState, setMiningState] = useState<MiningState>(MiningState.IN_PROGRESS);
  const [mintError, setMintError] = useState<boolean>(false);

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

      let initialGenres;
      if (fileMetadata.genre && fileMetadata.genre.length) {
        initialGenres = genres.filter(genre => fileMetadata.genre?.includes(genre.label)).map(genre => genre.key);
      }

      setInitialValues({
        title: fileMetadata?.title,
        artist: me?.handle,
        description: fileMetadata?.comment && fileMetadata.comment[0],
        album: fileMetadata?.album,
        releaseYear: fileMetadata?.year,
        artworkFile: artworkFile,
        genres: initialGenres,
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

  const onMintError = async (trackId: string) => {
    await deleteTrackOnError({
      variables: {
        input: {
          trackId,
        },
      },
    });

    setMintError(true);
    setMintingState('There was an error while minting your NFT');
    setTransactionHash(undefined);
  };

  const onCloseError = () => {
    setMintError(false);
    setMintingState(undefined);
  };

  const handleSubmit = async (values: FormValues) => {
    if (file && web3 && account && me) {
      const { title, artworkUrl, description, artist, album, genres, releaseYear, copyright } = values;
      const artistId = me.id;
      const artistProfileId = me.profile.id;

      setMintingState('Uploading track file');
      const assetUrl = await upload([file]);
      const artUrl = artworkUrl;

      setMintingState('Creating streaming from track');
      const { data } = await createTrack({
        variables: {
          input: {
            assetUrl,
            title,
            album,
            artist,
            artistId,
            artistProfileId,
            artworkUrl,
            description,
            genres,
            releaseYear,
            copyright,
          },
        },
      });
      const track = data?.createTrack.track;

      if (!track) {
        setMintingState(undefined);
        alert('We had some trouble, please try again later!');
        return;
      }

      setNewTrack(track);

      try {
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
                  minter: account,
                  ipfsCid: metadataPinResult?.pinJsonToIPFS.cid,
                  pendingRequest: PendingRequest.Mint,
                  owner: account,
                },
              },
            },
            refetchQueries: [FeedDocument],
          });
          dispatchShowCreateModal(true);
          setMintingState(undefined);
          setTransactionHash(hash);
        };

        mintNftToken(web3, `ipfs://${metadataPinResult?.pinJsonToIPFS.cid}`, account, account, 1, onTransactionHash);
      } catch (e) {
        setMiningState(MiningState.ERROR);
        if (e) await onMintError(track.id);
      }
    }
  };

  const handleClose = () => {
    dispatchShowCreateModal(false);
    if (!mintingState) {
      setTransactionHash(undefined);
      setFile(undefined);
    }
  };

  useEffect(() => {
    mintingState?.length ? setIsMintingState(true) : setIsMintingState(false);
  }, [mintingState]);

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
              <Image
                height={200}
                width={200}
                src={mintError ? '/nyan-cat-dead.png' : '/nyan-cat-rainbow.gif'}
                alt="Loading"
                priority
              />
              <div className="font-bold text-lg text-white text-center mt-4">{mintingState}</div>
              {mintError && (
                <Button variant="rainbow-xs" onClick={onCloseError} className="mt-4">
                  CANCEL
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
};
