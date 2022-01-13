import { Button } from 'components/Button';
import MaxGasFee from 'components/MaxGasFee';
import { Modal } from 'components/Modal';
import { Track as TrackComponent } from 'components/Track';
import { TrackListItemSkeleton } from 'components/TrackListItemSkeleton';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import useBlockchainV2 from 'hooks/useBlockchainV2';
import { useMagicContext } from 'hooks/useMagicContext';
import { useMaxGasFee } from 'hooks/useMaxGasFee';
import { TrackQuery, useDeleteTrackMutation, useTrackLazyQuery } from 'lib/graphql';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

export const ConfirmDeleteNFTModal = () => {
  const { showConfirmDeleteNFT, trackId, burn } = useModalState();
  const { dispatchShowConfirmDeleteNFTModal } = useModalDispatch();
  const [loading, setLoading] = useState(false);
  const [track, setTrack] = useState<TrackQuery['track']>();
  const { web3, account, balance } = useMagicContext();
  const [deleteTrack] = useDeleteTrackMutation({ refetchQueries: ['Posts', 'Tracks', 'Track'] });
  const { burnNftToken } = useBlockchainV2();
  const [disabled, setDisabled] = useState(true);
  const router = useRouter();

  const maxGasFee = useMaxGasFee(showConfirmDeleteNFT);

  const [getTrack, { data, error }] = useTrackLazyQuery();

  useEffect(() => {
    if (showConfirmDeleteNFT && trackId) {
      getTrack({ variables: { id: trackId } });
    }
  }, [showConfirmDeleteNFT, trackId, getTrack]);

  useEffect(() => {
    if (data?.track) {
      setTrack(data.track);
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      setDisabled(true);
    } else setDisabled(false);
  }, [error]);

  useEffect(() => {
    if (track?.nftData?.tokenId && account && web3) {
      setDisabled(false);
    }
  }, [track, account, web3]);

  const handleClose = () => {
    dispatchShowConfirmDeleteNFTModal(false, '', false);
  };

  const handleCancel = () => {
    handleClose();
  };

  const hasEnoughFunds = () => {
    if (balance && maxGasFee) {
      return +balance > +maxGasFee;
    }
    return false;
  };

  const onBurnConfirmation = () => {
    if (track) {
      deleteTrack({
        variables: { trackId: track.id },
      });
      router.push('/');
    }
  };

  const handleBurn = () => {
    const tokenId = track?.nftData?.tokenId;
    if (hasEnoughFunds() && tokenId && account) {
      setLoading(true);
      burnNftToken(tokenId, account)
        .onReceipt(onBurnConfirmation)
        .onError(cause => toast.error(cause.message))
        .finally(() => setLoading(false))
        .execute(web3);
    } else {
      alert("Uh-oh, it seems you don't have enough funds to pay for the gas fee of this operation");
      handleClose();
    }
  };

  const handleDeleteOnly = () => {
    if (trackId) {
      setLoading(true);
      deleteTrack({
        variables: { trackId: trackId },
      });
      handleClose();
      router.push('/');
    }
  };

  const handleSubmit = () => {
    burn ? handleBurn() : handleDeleteOnly();
  };

  return (
    <Modal
      show={showConfirmDeleteNFT}
      title="Confirm Transaction"
      onClose={handleClose}
      leftButton={
        <div className="p-2 text-gray-400 font-bold flex-1 text-center text-sm" onClick={handleCancel}>
          Cancel
        </div>
      }
    >
      <div className="flex flex-col w-full h-full justify-between">
        <div className="flex flex-col mb-auto space-y-6 h-full justify-between">
          <div className="flex flex-col h-full justify-around">
            <div className="px-4 text-sm text-gray-80 font-bold text-center">
              <p className="flex flex-wrap items-end justify-center text-center py-6">
                <span className="leading-tight">Are you sure you want to {burn ? 'burn' : 'delete'} this NFT?</span>
              </p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="flex flex-col w-full space-y-6 py-6">
              {track && <TrackComponent track={track} />}
              {!track && <TrackListItemSkeleton />}
            </div>
          </div>
          {burn && (
            <div className="flex flex-col p-4 bg-gray-20">
              <MaxGasFee />
            </div>
          )}
        </div>
        <Button variant="approve" type="button" loading={loading} onClick={handleSubmit} disabled={disabled}>
          {burn ? 'Burn NFT' : 'Delete NFT'}
        </Button>
      </div>
    </Modal>
  );
};
