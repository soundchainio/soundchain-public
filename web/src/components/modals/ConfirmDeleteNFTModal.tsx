import { Button } from 'components/common/Buttons/Button'
import MaxGasFee from 'components/MaxGasFee'
import { Modal } from 'components/Modal'
import { Track as TrackComponent } from 'components/Track'
import { TrackListItemSkeleton } from 'components/TrackListItemSkeleton'
import { useModalDispatch, useModalState } from 'contexts/ModalContext'
import useBlockchainV2 from 'hooks/useBlockchainV2'
import { useMaxGasFee } from 'hooks/useMaxGasFee'
import { useWalletContext } from 'hooks/useWalletContext'
import {
  ExploreTracksDocument,
  ExploreTracksQuery,
  TrackQuery,
  useDeleteTrackMutation,
  useTrackLazyQuery,
} from 'lib/graphql'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'

export const ConfirmDeleteNFTModal = () => {
  const { showConfirmDeleteNFT, trackId, burn } = useModalState()
  const { dispatchShowConfirmDeleteNFTModal } = useModalDispatch()
  const [loading, setLoading] = useState(false)
  const [track, setTrack] = useState<TrackQuery['track']>()
  const { web3, account, balance } = useWalletContext()
  const [deleteTrack] = useDeleteTrackMutation({
    update: (cache, { data }) => {
      if (!data?.deleteTrack) {
        return
      }

      const identify = cache.identify(data.deleteTrack)
      cache.evict({ id: identify })

      const cachedData = cache.readQuery<ExploreTracksQuery>({
        query: ExploreTracksDocument,
        variables: { search: '' },
      })

      if (!cachedData) {
        return
      }

      cache.writeQuery({
        query: ExploreTracksDocument,
        variables: { search: '' },
        overwrite: true,
        data: {
          exploreTracks: {
            ...cachedData.exploreTracks,
            nodes: cachedData.exploreTracks.nodes.filter(({ id }) => id !== data?.deleteTrack.id),
          },
        },
      })
    },
  })
  const { burnNftToken } = useBlockchainV2()
  const [disabled, setDisabled] = useState(true)
  const router = useRouter()

  const maxGasFee = useMaxGasFee(showConfirmDeleteNFT)

  const [getTrack, { data, error }] = useTrackLazyQuery()

  useEffect(() => {
    if (showConfirmDeleteNFT && trackId) {
      getTrack({ variables: { id: trackId } })
    }
  }, [showConfirmDeleteNFT, trackId, getTrack])

  useEffect(() => {
    if (data?.track) {
      setTrack(data.track)
    }
  }, [data])

  useEffect(() => {
    if (error) {
      setDisabled(true)
    } else setDisabled(false)
  }, [error])

  useEffect(() => {
    if (track?.nftData?.tokenId && account && web3) {
      setDisabled(false)
    }
  }, [track, account, web3])

  const handleClose = () => {
    dispatchShowConfirmDeleteNFTModal(false, '', false)
  }

  const handleCancel = () => {
    handleClose()
  }

  const hasEnoughFunds = () => {
    if (balance && maxGasFee) {
      return +balance > +maxGasFee
    }
    return false
  }

  const onBurnConfirmation = () => {
    if (track) {
      deleteTrack({
        variables: { trackId: track.id },
      })
      handleClose()
      router.push('/wallet')
      toast.success('Track successfully deleted')
    }
  }

  const handleBurn = () => {
    const tokenId = track?.nftData?.tokenId
    if (hasEnoughFunds() && tokenId && account && web3) {
      setLoading(true)
      burnNftToken(tokenId, account, { nft: track.nftData?.contract })
        .onReceipt(onBurnConfirmation)
        .onError(cause => toast.error(cause.message))
        .finally(() => setLoading(false))
        .execute(web3)
    } else {
      toast.warn("Uh-oh, it seems you don't have enough funds to pay for the gas fee of this operation")
      handleClose()
    }
  }

  const handleDeleteOnly = () => {
    if (trackId) {
      setLoading(true)
      deleteTrack({
        variables: { trackId: trackId },
      })
      handleClose()
      router.push('/wallet')
      toast.success('Track successfully deleted')
    }
  }

  const handleSubmit = () => {
    burn ? handleBurn() : handleDeleteOnly()
  }

  return (
    <Modal
      show={showConfirmDeleteNFT}
      title="Confirm Transaction"
      onClose={handleClose}
      leftButton={
        <button className="flex-1 p-2 text-center text-sm font-bold text-gray-400" onClick={handleCancel}>
          Cancel
        </button>
      }
    >
      <div className="flex h-full w-full flex-col justify-between">
        <div className="mb-auto flex h-full flex-col justify-between space-y-6">
          <div className="flex h-full flex-col justify-around">
            <div className="px-4 text-center text-sm font-bold text-gray-80">
              <p className="flex flex-wrap items-end justify-center py-6 text-center">
                <span className="leading-tight">Are you sure you want to {burn ? 'burn' : 'delete'} this NFT?</span>
              </p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="flex w-full flex-col space-y-6 py-6">
              {track && <TrackComponent track={track} />}
              {!track && <TrackListItemSkeleton />}
            </div>
          </div>
          {burn && (
            <div className="flex flex-col bg-gray-20 p-4">
              <MaxGasFee />
            </div>
          )}
        </div>
        <Button variant="approve" type="button" loading={loading} onClick={handleSubmit} disabled={disabled}>
          {burn ? 'Burn NFT' : 'Delete NFT'}
        </Button>
      </div>
    </Modal>
  )
}
export default ConfirmDeleteNFTModal
