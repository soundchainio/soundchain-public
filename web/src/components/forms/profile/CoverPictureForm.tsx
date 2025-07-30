import React, { useCallback, useEffect, useState } from 'react'

import classNames from 'classnames'
import { Button, ButtonProps } from 'components/common/Buttons/Button'
import { ImageUploadField } from 'components/ImageUploadField'
import { Label } from 'components/Label'
import { Form, Formik } from 'formik'
import { useMe } from 'hooks/useMe'
import { useUpdateCoverPictureMutation } from 'lib/graphql'
import Image from 'next/image'
import * as yup from 'yup'

interface CoverPictureFormProps {
  afterSubmit: () => void
  submitProps?: ButtonProps
  submitText: string
  onReward?: (tokens: number) => void // Callback for gamification reward
}

interface FormValues {
  coverPicture: string // Required field
}

const validationSchema: yup.Schema<FormValues> = yup.object().shape({
  coverPicture: yup.string().required('A custom cover picture is required.'),
})

const defaultCoverPictures = [
  '/default-pictures/cover/birds.jpeg',
  '/default-pictures/cover/cells.jpeg',
  '/default-pictures/cover/fog.jpeg',
  '/default-pictures/cover/net.jpeg',
  '/default-pictures/cover/rings.jpeg',
  '/default-pictures/cover/waves.jpeg',
]

export const CoverPictureForm = ({ afterSubmit, submitText, submitProps, onReward }: CoverPictureFormProps) => {
  const me = useMe()
  const [defaultPicture, setDefaultPicture] = useState<string | null>(null)
  const [updateCoverPicture] = useUpdateCoverPictureMutation()
  const [loading, setLoading] = useState(false)
  const [imageUploaded, setImageUploaded] = useState(false) // Track custom image upload

  useEffect(() => {
    const picture = me?.profile.coverPicture
    if (picture && defaultCoverPictures.includes(picture)) {
      setDefaultPicture(picture)
    }
  }, [me?.profile.coverPicture])

  const onUpload = useCallback((uploading: boolean) => {
    setLoading(uploading)
    if (!uploading) setImageUploaded(true) // Set to true when upload completes
  }, [])

  if (!me) return null

  const initialFormValues: FormValues = {
    coverPicture: me?.profile.coverPicture || '', // Default to current or empty
  }

  const onSubmit = async ({ coverPicture }: FormValues) => {
    await updateCoverPicture({
      variables: {
        input: {
          coverPicture: coverPicture, // No default fallback, must be user-uploaded
        },
      },
    })
    afterSubmit()
    // Gamification: Award 1 Ogun token for this step (placeholder)
    if (onReward && imageUploaded) {
      console.log('Awarding 1 Ogun token for cover picture upload')
      onReward(1) // Call reward function if provided
    }
  }

  return (
    <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
      {({ isValid, values: { coverPicture } }) => (
        <Form className="flex flex-1 flex-col space-y-6">
          <div className="flex-grow space-y-8">
            <div className="flex flex-col">
              <Label textSize="base">CUSTOM COVER PHOTO (Required):</Label>
              {loading && !coverPicture ? (
                <ImageUploadField name="coverPicture" className="mt-8">
                  Uploading
                </ImageUploadField>
              ) : (
                <ImageUploadField
                  name="coverPicture"
                  onUpload={onUpload}
                  className={`${coverPicture ? 'h-[150px]' : ''} mt-8 cursor-pointer`}
                >
                  Upload Cover Photo (Required for Account Setup)
                </ImageUploadField>
              )}
              {!imageUploaded && (
                <p className="text-red-500 text-sm mt-2">
                  Please upload a custom image to proceed with account setup.
                </p>
              )}
            </div>
            <div className="flex flex-col space-y-8">
              <Label textSize="base">DEFAULT COVER PHOTOS (Preview Only):</Label>
              <div className="flex flex-col space-y-4">
                {defaultCoverPictures.map(picture => (
                  <button
                    key={picture}
                    className={classNames(
                      'relative flex h-[150px] w-full justify-center justify-self-center p-2',
                      defaultPicture === picture && 'rounded-xl border-2',
                    )}
                    onClick={() => setDefaultPicture(picture)}
                    disabled // Disable selection to enforce custom upload
                  >
                    <div className="relative flex h-full w-full">
                      <Image alt="Default cover picture" src={picture} fill objectFit="cover" className="rounded-lg" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <Button
              type="submit"
              disabled={loading || !isValid || !imageUploaded} // Disable until image is uploaded
              variant="outline"
              className="mt-4 h-12"
              {...submitProps}
            >
              {submitText}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  )
}
