import { Button } from 'components/Button';
import { Modal } from 'components/Modal';
import { Track as TrackComponent } from 'components/Track';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import useBlockchain from 'hooks/useBlockchain';
import { useMagicContext } from 'hooks/useMagicContext';
import { useMaxGasFee } from 'hooks/useMaxGasFee';
import { Matic } from 'icons/Matic';
import { TrackQuery, useDeleteTrackMutation, useTrackLazyQuery } from 'lib/graphql';
import React, { useEffect, useState } from 'react';

export const ConfirmDeleteNFTModal = () => {
  const { showConfirmDeleteNFT, trackId, burn } = useModalState();
  const { dispatchShowConfirmDeleteNFTModal } = useModalDispatch();
  const [loading, setLoading] = useState(false);
  const [track, setTrack] = useState<TrackQuery['track']>();
  const { web3, account, balance } = useMagicContext();
  const [deleteTrack] = useDeleteTrackMutation();
  const { burnNftToken } = useBlockchain();
  const [disabled, setDisabled] = useState(true);

  const maxGasFee = useMaxGasFee(showConfirmDeleteNFT);

  const [getTrack, { data, error }] = useTrackLazyQuery();

  useEffect(() => {
    if (showConfirmDeleteNFT && trackId) {
      console.log({ trackId });
      getTrack({ variables: { id: trackId } });
    }
  }, [showConfirmDeleteNFT, trackId, getTrack]);

  useEffect(() => {
    if (data?.track) {
      console.log({ data });
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

  const handleDelete = () => {
    if (track?.id) {
      deleteTrack({
        variables: {
          trackId: track.id,
        },
      });
    }
  };

  const handleBurn = () => {
    const tokenId = track?.nftData?.tokenId;
    if (hasEnoughFunds() && tokenId && account) {
      try {
        setLoading(true);
        burnNftToken(web3, tokenId, account);
      } catch (e) {
        console.log(e);
        setLoading(false);
        alert('We had some trouble, please try again later!');
      } finally {
        handleDelete();
      }
    } else {
      alert("Uh-oh, it seems you don't have enough funds to pay for the gas fee of this operation");
      handleClose();
    }
  };

  const handleSubmit = () => {
    if (burn) {
      handleBurn();
    } else {
      handleDelete();
    }
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
                <span className="leading-tight">Are you sure you want to burn this NFT?</span>
              </p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="flex flex-col w-full space-y-6 py-6">
              {track && <TrackComponent track={track} />}
              {/* to do add a loader while !track */}
            </div>
          </div>
          <div className="flex flex-col w-full">
            <div className="flex w-full bg-gray-30">
              <div className="flex-1 flex items-center justify-start text-gray-CC font-bold text-xs uppercase px-4 py-3">
                Gas Fees
              </div>
              <div className="flex flex-wrap items-center justify-center uppercase px-4 py-3">
                <span className="my-auto">
                  <Matic />
                </span>
                <span className="mx-1 text-white font-bold text-md leading-tight">{maxGasFee}</span>
                <div className="items-end">
                  <span className="text-gray-80 font-black text-xxs leading-tight">matic</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <Button variant="approve" type="button" loading={loading} onClick={handleSubmit} disabled={disabled}>
            Burn NFT
          </Button>
        </div>
      </div>
    </Modal>
  );
};
