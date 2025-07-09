import React, { useCallback, useEffect, useState } from 'react'

import classNames from 'classnames'
import { Button, ButtonProps } from 'components/common/Buttons/Button'
import { ImageUploadField } from 'components/ImageUploadField'
import { Label } from 'components/Label'
import { Form, Formik } from 'formik'
import { useMe } from 'hooks/useMe'
import { useUpdateProfilePictureMutation } from 'lib/graphql' // Adjusted mutation
import Image from 'next/image'
import * as yup from 'yup'

interface ProfilePictureFormProps {
  afterSubmit: () => void
  submitProps?: ButtonProps
  submitText: string
}

interface FormValues {
  profilePicture?: string | undefined
}

const defaultProfilePictures = [
  '/default-pictures/profile/avatar1.jpeg',
  '/default-pictures/profile/avatar2.jpeg',
  '/default-pictures/profile/avatar3.jpeg',
  '/default-pictures/profile/avatar4.jpeg',
]

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  profilePicture: yup.string(),
})

export const ProfilePictureForm = ({ afterSubmit, submitText, submitProps }: ProfilePictureFormProps) => {
  const me = useMe()
  const [defaultPicture, setDefaultPicture] = useState<string | null>(null)
  const [updateProfilePicture] = useUpdateProfilePictureMutation() // Adjusted mutation
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const picture = me?.profile.profilePicture

    if (picture && defaultProfilePictures.includes(picture)) {
      setDefaultPicture(picture)
    }
  }, [me?.profile.profilePicture])

  const onUpload = useCallback((uploading: boolean) => { // Fixed type to boolean
    setLoading(uploading)
  }, [])

  if (!me) return null

  const initialFormValues: FormValues = {
    profilePicture: '',
  }

  const onSubmit = async ({ profilePicture }: FormValues) => {
    await updateProfilePicture({
      variables: {
        input: {
          profilePicture: profilePicture || defaultPicture,
        },
      },
    })

    afterSubmit()
  }

  return (
    <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
      {({ values: { profilePicture } }) => (
        <Form className="flex flex-1 flex-col" placeholder="" onPointerEnterCapture={() => {}} onPointerLeaveCapture={() => {}}>
          <div className="flex-grow space-y-8">
            <div className="flex flex-col">
              <Label textSize="base">CUSTOM PROFILE PHOTO:</Label>
              {loading && !profilePicture ? (
                <ImageUploadField name="profilePicture" className="mt-8">
                  Uploading
                </ImageUploadField>
              ) : (
                <ImageUploadField
                  name="profilePicture"
                  onUpload={onUpload}
                  className={`${profilePicture ? 'h-[150px]' : ''} mt-8 cursor-pointer`}
                >
                  Upload Profile Photo
                </ImageUploadField>
              )}
            </div>
            <div className="flex flex-col space-y-8">
              <Label textSize="base">DEFAULT PROFILE PHOTOS:</Label>
              <div className="flex flex-col space-y-4">
                {defaultProfilePictures.map(picture => (
                  <button
                    key={picture}
                    className={classNames(
                      'relative flex h-[150px] w-full justify-center justify-self-center p-2',
                      defaultPicture === picture && 'rounded-xl border-2',
                    )}
                    onClick={() => setDefaultPicture(picture)}
                  >
                    <div className="relative flex h-full w-full">
                      <Image alt="Default profile picture" src={picture} fill objectFit="cover" className="rounded-lg" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <Button type="submit" disabled={loading} variant="outline" className="mt-4 h-12" {...submitProps}>
              {submitText}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  )
}
