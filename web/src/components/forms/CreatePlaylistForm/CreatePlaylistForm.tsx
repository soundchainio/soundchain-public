import { Formik } from 'formik'
import { FormEvent } from 'react'
import tw from 'tailwind-styled-components'
import { ArtworkUploader } from '../track/ArtworkUploader'
import { InputField } from 'components/InputField'
import { Button } from 'components/common/Button'
import { SearchWithDropdown } from 'components/common/SearchWithDropdown/SearchWithDropdown'
import { usePlaylistContext } from 'hooks/usePlaylistContext'
import Asset from 'components/Asset/Asset'
import { createPlaylist } from 'repositories/playlist/playlist'
import { toast } from 'react-toastify'
import { useUpload } from 'hooks/useUpload'

const initialValues = {
  playlistName: '',
  artworkFile: null,
  description: '',
}

export const CreatePlaylistForm = () => {
  const { temporaryTracks, setTemporaryTracks } = usePlaylistContext()
  const { upload } = useUpload()
  const handleOnSubmit = async (values: typeof initialValues, event?: FormEvent) => {
    event?.preventDefault()
    if (!values.artworkFile) return

    const trackEditionIds = temporaryTracks.map(track => track.trackEditionId || '')
    const assetUrl = await upload([values.artworkFile])

    const params = {
      title: values.playlistName,
      description: values.description,
      artworkUrl: assetUrl,
      trackEditionIds: trackEditionIds,
    }

    try {
      await createPlaylist(params)

      toast.success('Playlist created successfully.')
    } catch (error) {
      console.log(error)
    }
  }

  const removeTrackFromTemporaryTracks = (trackId: string) => {
    const removedTrack = temporaryTracks.filter(track => track.id !== trackId)
    setTemporaryTracks(removedTrack)
  }

  return (
    <Container>
      <h3 className="mb-4 font-bold text-white">Playlist</h3>
      <Formik initialValues={initialValues} onSubmit={(values, { setSubmitting }) => handleOnSubmit(values)}>
        {({ values, errors, setFieldValue }) => (
          <Form onSubmit={event => handleOnSubmit(values, event)}>
            <InputField name="playlistName" type="text" label="Playlist Name" maxLength={50} />
            <ArtworkUploader
              name="artworkFile"
              error={errors.artworkFile}
              initialValue={initialValues?.artworkFile || undefined}
              onFileChange={file => setFieldValue('artworkFile', file)}
            />
            <InputField name="description" type="text" label="Description" maxLength={250} />
            <SearchWithDropdown />
            <div className="flex max-h-[200px] w-full flex-col gap-2 overflow-scroll px-2">
              {temporaryTracks &&
                temporaryTracks.map((track, index) => {
                  return (
                    <div className="flex w-full items-center justify-between rounded-lg bg-neutral-900 p-4" key={index}>
                      <div className="flex grow items-center gap-2">
                        <div className="h-14 w-14">
                          <Asset src={track.artworkUrl} sizes="5rem" disableImageWave />
                        </div>
                        <h3 className="text-md font-semibold text-white">{track.title}</h3>
                      </div>
                      <Button
                        color="pink"
                        text="Remove"
                        buttonType="text"
                        width="contain"
                        onClick={() => removeTrackFromTemporaryTracks(track.id)}
                      />
                    </div>
                  )
                })}
            </div>
            <Button color="green" buttonType="text" text="Create Playlist" />
          </Form>
        )}
      </Formik>
    </Container>
  )
}

const Container = tw.div`
  p-4
  h-screen
  flex
  flex-col
  items-center
  justify-start
`
const Form = tw.form`
  flex
  flex-col
  items-center
  gap-4
  w-full
`
