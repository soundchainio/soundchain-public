import { Formik } from 'formik'
import { FormEvent } from 'react'
import tw from 'tailwind-styled-components'
import { ArtworkUploader } from '../track/ArtworkUploader'
import { InputField } from 'components/InputField'
import { Button } from 'components/common/Button'
import { SearchWithDropdown } from 'components/common/SearchWithDropdown/SearchWithDropdown'

const initialValues = {
  playlistname: '',
  artworkFile: null,
  description: '',
}

export const CreatePlaylistForm = () => {
  const handleOnSubmit = (values: typeof initialValues, event?: FormEvent) => {
    event?.preventDefault()
    console.log(values)
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
            <Button color="green" buttonType="text" text="Create Playlist" />
          </Form>
        )}
      </Formik>
    </Container>
  )
}

const Container = tw.div`
  p-4
  min-h-[320px]
  flex
  flex-col
  items-center
  justify-center
`
const Form = tw.form`
  flex
  flex-col
  items-center
  gap-4
  w-full
`
