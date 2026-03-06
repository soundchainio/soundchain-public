import React, { useCallback, useEffect, useMemo, useState } from 'react'

import classNames from 'classnames'
import { Button, ButtonProps } from 'components/common/Buttons/Button'
import { getGuestAvatarForMigration, clearGuestAvatarAfterMigration } from 'components/GuestAvatar'
import { GifPicker } from 'components/GifPicker'
import { ImageUploadField } from 'components/ImageUploadField'
import { Label } from 'components/Label'
import { Form, Formik } from 'formik'
import { useMe } from 'hooks/useMe'
import { useMagicContext } from 'hooks/useMagicContext'
import { useUpdateProfilePictureMutation } from 'lib/graphql'
import Image from 'next/image'
import * as yup from 'yup'
import { createAvatar } from '@dicebear/core'
import * as shapes from '@dicebear/shapes'
import * as glass from '@dicebear/glass'
import * as rings from '@dicebear/rings'
import * as identicon from '@dicebear/identicon'
import * as pixelArt from '@dicebear/pixel-art'
import Avatar from 'boring-avatars'

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

type TabId = 'upload' | 'gif' | 'generate'

const DICEBEAR_STYLES = [
  { id: 'shapes', label: 'Shapes', collection: shapes },
  { id: 'glass', label: 'Glass', collection: glass },
  { id: 'rings', label: 'Rings', collection: rings },
  { id: 'identicon', label: 'Identicon', collection: identicon },
  { id: 'pixel-art', label: 'Pixel', collection: pixelArt },
] as const

const BORING_VARIANTS = ['marble', 'beam', 'pixel', 'sunset', 'ring', 'bauhaus'] as const

const SC_PALETTE = ['#06b6d4', '#a855f7', '#ec4899', '#8b5cf6', '#0b141a']

export const ProfilePictureForm = ({ afterSubmit, submitText, submitProps }: ProfilePictureFormProps) => {
  const me = useMe()
  const { account: walletAddress } = useMagicContext()
  const [defaultPicture, setDefaultPicture] = useState<string | null>(null)
  const [guestAvatar, setGuestAvatar] = useState<string | null>(null)
  const [updateProfilePicture] = useUpdateProfilePictureMutation()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('generate')
  const [generativeSeed, setGenerativeSeed] = useState('')

  // Seed for generative avatars
  useEffect(() => {
    const seed = me?.profile?.userHandle || walletAddress || me?.profile?.displayName || 'soundchain'
    setGenerativeSeed(seed)
  }, [me?.profile?.userHandle, me?.profile?.displayName, walletAddress])

  // Check for guest avatar migration
  useEffect(() => {
    if (walletAddress) {
      const storedAvatar = getGuestAvatarForMigration(walletAddress)
      if (storedAvatar) setGuestAvatar(storedAvatar)
    }
  }, [walletAddress])

  useEffect(() => {
    const picture = me?.profile.profilePicture
    if (picture) setDefaultPicture(picture)
  }, [me?.profile.profilePicture])

  const onUpload = useCallback((uploading: boolean) => {
    setLoading(uploading)
  }, [])

  // Pre-generate DiceBear avatars
  const diceBearAvatars = useMemo(() => {
    return DICEBEAR_STYLES.map(style => {
      const seeds = Array.from({ length: 6 }, (_, i) => `${generativeSeed}-${style.id}-${i}`)
      return {
        ...style,
        avatars: seeds.map(seed => {
          const avatar = createAvatar(style.collection as any, { seed, size: 200 })
          return { seed, dataUri: avatar.toDataUri() }
        }),
      }
    })
  }, [generativeSeed])

  if (!me) return null

  const initialFormValues: FormValues = {
    profilePicture: me?.profile.profilePicture || '',
  }

  const onSubmit = async ({ profilePicture }: FormValues) => {
    await updateProfilePicture({
      variables: { input: { profilePicture: profilePicture || defaultPicture } },
    })
    if (walletAddress && guestAvatar && profilePicture === guestAvatar) {
      clearGuestAvatarAfterMigration(walletAddress)
    }
    afterSubmit()
  }

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'upload', label: 'Upload', icon: '📷' },
    { id: 'gif', label: 'GIF', icon: '🎬' },
    { id: 'generate', label: 'Generate', icon: '✨' },
  ]

  return (
    <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
      {({ values: { profilePicture }, setFieldValue }) => (
        <Form className="flex flex-1 flex-col">
          <div className="flex-grow space-y-4">
            {/* Guest Avatar Migration */}
            {guestAvatar && (
              <div className="flex flex-col space-y-4 p-4 bg-gradient-to-r from-cyan-900/20 to-purple-900/20 rounded-xl border border-cyan-500/30">
                <Label textSize="base" className="text-cyan-400">YOUR GUEST AVATAR:</Label>
                <p className="text-sm text-neutral-400">
                  We found the avatar you used as a guest! Would you like to use it for your profile?
                </p>
                <button
                  type="button"
                  onClick={() => { setFieldValue('profilePicture', guestAvatar); setDefaultPicture(null) }}
                  className={classNames(
                    'relative flex h-[100px] w-[100px] justify-center justify-self-center p-2 mx-auto',
                    profilePicture === guestAvatar && 'rounded-xl border-2 border-cyan-400',
                  )}
                >
                  <img alt="Your guest avatar" src={guestAvatar} className="w-full h-full object-cover rounded-lg" />
                </button>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/5">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={classNames(
                    'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all',
                    activeTab === tab.id
                      ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5',
                  )}
                >
                  <span className="mr-1">{tab.icon}</span> {tab.label}
                </button>
              ))}
            </div>

            {/* Selected preview */}
            {profilePicture && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/30">
                <img src={profilePicture} alt="Selected" className="w-16 h-16 rounded-full object-cover ring-2 ring-cyan-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-cyan-400 font-medium">Selected Profile Picture</p>
                  <p className="text-[10px] text-gray-500 truncate">{profilePicture.startsWith('data:') ? 'Generated avatar' : profilePicture.includes('giphy') ? 'GIPHY GIF' : 'Custom upload'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setFieldValue('profilePicture', ''); setDefaultPicture(null) }}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Upload Tab */}
            {activeTab === 'upload' && (
              <div className="space-y-4">
                <div className="flex flex-col">
                  <Label textSize="base">UPLOAD PHOTO:</Label>
                  {loading && !profilePicture ? (
                    <ImageUploadField name="profilePicture" className="mt-4">Uploading</ImageUploadField>
                  ) : (
                    <ImageUploadField
                      name="profilePicture"
                      onUpload={onUpload}
                      className={`${profilePicture ? 'h-[150px]' : ''} mt-4 cursor-pointer`}
                    >
                      Upload Profile Photo
                    </ImageUploadField>
                  )}
                </div>
              </div>
            )}

            {/* GIF Tab */}
            {activeTab === 'gif' && (
              <div className="space-y-3">
                <Label textSize="base">PICK A GIF:</Label>
                <GifPicker
                  onSelect={(gifUrl) => {
                    setFieldValue('profilePicture', gifUrl)
                    setDefaultPicture(null)
                  }}
                  theme="dark"
                />
              </div>
            )}

            {/* Generate Tab */}
            {activeTab === 'generate' && (
              <div className="space-y-5">
                {/* Seed input */}
                <div>
                  <Label textSize="base">SEED (tap to randomize):</Label>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={generativeSeed}
                      onChange={(e) => setGenerativeSeed(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 text-white text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="Enter any text..."
                    />
                    <button
                      type="button"
                      onClick={() => setGenerativeSeed(`${Date.now()}-${Math.random().toString(36).slice(2)}`)}
                      className="px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/30 transition-colors ring-1 ring-cyan-500/30"
                    >
                      Shuffle
                    </button>
                  </div>
                </div>

                {/* Boring Avatars — marble/ring/sunset */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-2">Marble & Abstract</p>
                  <div className="grid grid-cols-6 gap-2">
                    {BORING_VARIANTS.map(variant => (
                      <button
                        key={variant}
                        type="button"
                        onClick={(e) => {
                          // Grab the SVG from the rendered button's DOM
                          const svg = (e.currentTarget as HTMLElement).querySelector('svg')
                          if (svg) {
                            const clone = svg.cloneNode(true) as SVGElement
                            clone.setAttribute('width', '400')
                            clone.setAttribute('height', '400')
                            const svgString = new XMLSerializer().serializeToString(clone)
                            const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`
                            setFieldValue('profilePicture', dataUri)
                            setDefaultPicture(null)
                          }
                        }}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all hover:bg-white/10"
                      >
                        <div className="w-14 h-14 rounded-full overflow-hidden">
                          <Avatar
                            size={80}
                            name={generativeSeed}
                            variant={variant}
                            colors={SC_PALETTE}
                          />
                        </div>
                        <span className="text-[8px] text-gray-500 capitalize">{variant}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* DiceBear Styles */}
                {diceBearAvatars.map(style => (
                  <div key={style.id}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-2">{style.label}</p>
                    <div className="grid grid-cols-6 gap-2">
                      {style.avatars.map(({ seed, dataUri }) => (
                        <button
                          key={seed}
                          type="button"
                          onClick={() => {
                            setFieldValue('profilePicture', dataUri)
                            setDefaultPicture(null)
                          }}
                          className={classNames(
                            'p-1.5 rounded-xl transition-all hover:bg-white/10',
                            profilePicture === dataUri && 'ring-2 ring-cyan-400 bg-cyan-500/10',
                          )}
                        >
                          <img src={dataUri} alt={seed} className="w-full aspect-square rounded-lg" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
