import React, { useCallback, useEffect, useState } from 'react'

import classNames from 'classnames'
import { Button, ButtonProps } from 'components/common/Buttons/Button'
import { getGuestAvatarForMigration, clearGuestAvatarAfterMigration } from 'components/GuestAvatar'
import { ImageUploadField } from 'components/ImageUploadField'
import { Label } from 'components/Label'
import { Form, Formik } from 'formik'
import { useMe } from 'hooks/useMe'
import { useMagicContext } from 'hooks/useMagicContext'
import { useUpdateProfilePictureMutation } from 'lib/graphql'
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

const validationSchema: yup.Schema<FormValues> = yup.object().shape({
  profilePicture: yup.string(),
})

const defaultProfilePictures = [
  '/default-pictures/profile/avatar1.jpeg',
  '/default-pictures/profile/avatar2.jpeg',
  '/default-pictures/profile/avatar3.jpeg',
  '/default-pictures/profile/avatar4.jpeg',
]

export const ProfilePictureForm = ({ afterSubmit, submitText, submitProps }: ProfilePictureFormProps) => {
  const me = useMe()
  const { account: walletAddress } = useMagicContext()
  const [defaultPicture, setDefaultPicture] = useState<string | null>(null)
  const [guestAvatar, setGuestAvatar] = useState<string | null>(null)
  const [updateProfilePicture] = useUpdateProfilePictureMutation()
  const [loading, setLoading] = useState(false)

  // Check for guest avatar migration
  useEffect(() => {
    if (walletAddress) {
      const storedAvatar = getGuestAvatarForMigration(walletAddress)
      if (storedAvatar) {
        setGuestAvatar(storedAvatar)
      }
    }
  }, [walletAddress])

  useEffect(() => {
    const picture = me?.profile.profilePicture
    if (picture && defaultProfilePictures.includes(picture)) {
      setDefaultPicture(picture)
    }
  }, [me?.profile.profilePicture])

  const onUpload = useCallback((uploading: boolean) => {
    setLoading(uploading)
  }, [])

  if (!me) return null

  const initialFormValues: FormValues = {
    profilePicture: me?.profile.profilePicture || '',
  }

  const onSubmit = async ({ profilePicture }: FormValues) => {
    await updateProfilePicture({
      variables: {
        input: {
          profilePicture: profilePicture || defaultPicture,
        },
      },
    })
    // Clear guest avatar after successful migration
    if (walletAddress && guestAvatar && profilePicture === guestAvatar) {
      clearGuestAvatarAfterMigration(walletAddress)
    }
    afterSubmit()
  }

  const useGuestAvatarForProfile = () => {
    if (guestAvatar) {
      setDefaultPicture(null)
      // Note: The guest avatar is a base64 string, we can use it directly
      // The form will submit this to the profile picture update
    }
  }

  return (
    <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
      {({ values: { profilePicture }, setFieldValue }) => (
        <Form className="flex flex-1 flex-col">
          <div className="flex-grow space-y-8">
            {/* Guest Avatar Migration Section */}
            {guestAvatar && (
              <div className="flex flex-col space-y-4 p-4 bg-gradient-to-r from-cyan-900/20 to-purple-900/20 rounded-xl border border-cyan-500/30">
                <Label textSize="base" className="text-cyan-400">YOUR GUEST AVATAR:</Label>
                <p className="text-sm text-neutral-400">
                  We found the avatar you used as a guest! Would you like to use it for your profile?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFieldValue('profilePicture', guestAvatar)
                    setDefaultPicture(null)
                  }}
                  className={classNames(
                    'relative flex h-[100px] w-[100px] justify-center justify-self-center p-2 mx-auto',
                    profilePicture === guestAvatar && 'rounded-xl border-2 border-cyan-400',
                  )}
                >
                  <img
                    alt="Your guest avatar"
                    src={guestAvatar}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </button>
                {profilePicture === guestAvatar && (
                  <p className="text-xs text-cyan-400 text-center">Selected! Click NEXT to use this avatar.</p>
                )}
              </div>
            )}

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
