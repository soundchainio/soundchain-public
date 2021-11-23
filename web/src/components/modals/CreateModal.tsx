import ID3Writer from 'browser-id3-writer';
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
  usePinJsonToIpfsMutation,
  usePinToIpfsMutation,
} from 'lib/graphql';
import * as musicMetadata from 'music-metadata-browser';
import Image from 'next/image';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { Metadata } from 'types/NftTypes';
import { genres } from 'utils/Genres';
import { MintingDone } from './MintingDone';

enum Tabs {
  NFT = 'NFT',
  POST = 'Post',
}

export const CreateModal = () => {
  const modalState = useModalState();
  const { asPath } = useRouter();
  const { dispatchShowCreateModal, dispatchShowPostModal } = useModalDispatch();
  const me = useMe();
  const [tab, setTab] = useState(Tabs.NFT);
  const { setIsMintingState } = useHideBottomNavBar();

  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();

  const [newTrack, setNewTrack] = useState<CreateTrackMutation['createTrack']['track']>();

  const { upload } = useUpload();
  const [createTrack] = useCreateTrackMutation();

  const { web3, account } = useWalletContext();
  const [pinToIPFS] = usePinToIpfsMutation();
  const [pinJsonToIPFS] = usePinJsonToIpfsMutation();

  const { mintNftToken } = useBlockchain();
  const [transactionHash, setTransactionHash] = useState<string>();
  const [mintingState, setMintingState] = useState<string>();
  const [mintError, setMintError] = useState<boolean>(false);

  const [initialValues, setInitialValues] = useState<InitialValues>();

  useEffect(() => {
    handleClose();
  }, [asPath]);

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
        copyright: fileMetadata?.license,
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

  const onCloseError = () => {
    setMintError(false);
    setMintingState(undefined);
  };

  const saveID3Tag = (values: FormValues, assetFile: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      try {
        const bufferReader = new FileReader();
        bufferReader.readAsArrayBuffer(assetFile);
        bufferReader.addEventListener('loadend', async () => {
          const id3Writer = new ID3Writer(bufferReader.result);

          id3Writer
            .setFrame('TIT2', values.title)
            .setFrame('TPE1', [values.artist])
            .setFrame('TALB', values.album)
            .setFrame('TYER', values.releaseYear)
            .setFrame('TCON', values.genres)
            .setFrame('WCOP', values.copyright)
            .setFrame('COMM', {
              description: 'Track description made by the author',
              text: values.description,
              language: 'eng',
            });

          if (values.artworkUrl) {
            const artWorkArrayBuffer = values.artworkUrl && (await fetch(values.artworkUrl).then(r => r.arrayBuffer()));
            id3Writer.setFrame('APIC', {
              type: 0,
              data: artWorkArrayBuffer,
              description: 'Artwork',
            });
          }
          id3Writer.addTag();
          const newFile: File = id3Writer.getBlob();
          resolve(newFile);
        });
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleSubmit = async (values: FormValues) => {
    if (file && web3 && account && me) {
      const { title, artworkUrl, description, artist, album, genres, releaseYear, copyright, royalty } = values;
      const artistId = me.id;
      const artistProfileId = me.profile.id;

      setMintingState('Writing data to ID3Tag ');
      const taggedFile = await saveID3Tag(values, file);

      setMintingState('Uploading track file');
      const assetUrl = await upload([taggedFile]);
      const artUrl = artworkUrl;

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

        const onTransactionHash = async (hash: string) => {
          setMintingState('Creating your track');
          const { data } = await createTrack({
            variables: {
              input: {
                assetUrl,
                title,
                album,
                artist,
                artistId,
                artworkUrl,
                description,
                genres,
                releaseYear,
                artistProfileId,
                copyright,
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
          const track = data?.createTrack.track;

          setNewTrack(track);
          dispatchShowCreateModal(true);
          setMintingState(undefined);
          setTransactionHash(hash);
        };

        const onError = () => {
          setTransactionHash(undefined);
          setMintingState('There was an error while minting your NFT');
          setMintError(true);
        };

        setMintingState('Minting NFT');
        mintNftToken(
          web3,
          `ipfs://${metadataPinResult?.pinJsonToIPFS.cid}`,
          account,
          account,
          royalty,
          onTransactionHash,
          onError,
        );
      } catch {
        setTransactionHash(undefined);
        setMintingState('There was an error while minting your NFT');
        setMintError(true);
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
  }, [mintingState, setIsMintingState]);

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
        <MintingDone transactionHash={transactionHash} track={newTrack} />
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
