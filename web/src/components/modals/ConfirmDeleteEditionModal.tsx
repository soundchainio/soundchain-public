import { Button } from 'components/common/Buttons/Button'
import { Modal } from 'components/Modal'
import { Track as TrackComponent } from 'components/Track'
import { TrackListItemSkeleton } from 'components/TrackListItemSkeleton'
import { useModalDispatch, useModalState } from 'contexts/ModalContext'
import {
  ExploreTracksDocument,
  ExploreTracksQuery,
  useDeleteTrackEditionMutation,
  useTrackEditionLazyQuery,
  useTrackLazyQuery,
} from 'lib/graphql'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'

export const ConfirmDeleteEditionModal = () => {
  const modalState = useModalState() || {}
  const { showConfirmDeleteEdition, trackId, trackEditionId } = modalState
  const { dispatchShowConfirmDeleteEditionModal } = useModalDispatch()
  const [loading, setLoading] = useState(false)
  const [getTrack, { data: trackData }] = useTrackLazyQuery()
  const [getTrackEdition, { data, error }] = useTrackEditionLazyQuery()

  const trackEdition = data?.trackEdition
  const track = trackData?.track

  const [deleteTrackEdition] = useDeleteTrackEditionMutation({
    update: (cache, { data }) => {
      if (!data?.deleteTrackEdition) {
        return
      }

      const deletedIds = data.deleteTrackEdition.map(deletedTrack => {
        const identify = cache.identify(deletedTrack)
        cache.evict({ id: identify })

        return deletedTrack.id
      })

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
            nodes: cachedData.exploreTracks.nodes.filter(({ id }) => !deletedIds.includes(id)),
          },
        },
      })
    },
  })
  const [disabled, setDisabled] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (showConfirmDeleteEdition && trackEditionId) {
      getTrackEdition({ variables: { id: trackEditionId } })
    }
  }, [showConfirmDeleteEdition, trackEditionId, getTrackEdition])

  useEffect(() => {
    if (showConfirmDeleteEdition && trackId) {
      getTrack({ variables: { id: trackId } })
    }
  }, [showConfirmDeleteEdition, trackId, getTrack])

  useEffect(() => {
    if (error) {
      setDisabled(true)
    } else setDisabled(false)
  }, [error])

  useEffect(() => {
    if (trackEdition?.editionId != null && trackEdition?.editionId != undefined) {
      setDisabled(false)
    }
  }, [trackEdition])

  const handleClose = () => {
    dispatchShowConfirmDeleteEditionModal({ show: false, trackEditionId: '', trackId: '' })
  }

  const handleCancel = () => {
    handleClose()
  }

  const handleDeleteOnly = () => {
    if (trackEditionId) {
      setLoading(true)
      deleteTrackEdition({
        variables: { trackEditionId },
      })
      handleClose()
      router.push('/wallet')
      toast.success('Editions successfully deleted')
      setLoading(false)
    }
  }

  return (
    <Modal
      show={showConfirmDeleteEdition}
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
                <span className="leading-tight">Are you sure you want to delete this Edition?</span>
              </p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="flex w-full flex-col space-y-6 py-6">
              {track && <TrackComponent track={track} />}
              {!track && <TrackListItemSkeleton />}
            </div>
          </div>
        </div>
        <Button variant="approve" type="button" loading={loading} onClick={handleDeleteOnly} disabled={disabled}>
          Delete Edition
        </Button>
      </div>
    </Modal>
  )
}
export default ConfirmDeleteEditionModal