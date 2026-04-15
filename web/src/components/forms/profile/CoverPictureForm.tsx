import React, { useCallback, useEffect, useMemo, useState } from 'react'

import classNames from 'classnames'
import { Button, ButtonProps } from 'components/common/Buttons/Button'
import { GifPicker } from 'components/GifPicker'
import { ImageUploadField } from 'components/ImageUploadField'
import { Label } from 'components/Label'
import { Form, Formik } from 'formik'
import { useMe } from 'hooks/useMe'
import { useMagicContext } from 'hooks/useMagicContext'
import Image from 'next/image'
import * as yup from 'yup'
import { createAvatar } from '@dicebear/core'
import * as shapes from '@dicebear/shapes'
import * as glass from '@dicebear/glass'
import * as rings from '@dicebear/rings'
import Avatar from 'boring-avatars'

interface CoverPictureFormProps {
  afterSubmit: () => void
  submitProps?: ButtonProps
  submitText: string
  onReward?: (tokens: number) => void
}

interface FormValues {
  coverPicture: string
}

const validationSchema: yup.Schema<FormValues> = yup.object().shape({
  coverPicture: yup.string().required('A cover picture is required.'),
})

const defaultCoverPictures = [
  '/default-pictures/cover/birds.jpeg',
  '/default-pictures/cover/cells.jpeg',
  '/default-pictures/cover/fog.jpeg',
  '/default-pictures/cover/net.jpeg',
  '/default-pictures/cover/rings.jpeg',
  '/default-pictures/cover/waves.jpeg',
]

type TabId = 'upload' | 'gif' | 'generate' | 'defaults'

const COVER_STYLES = [
  { id: 'shapes', label: 'Shapes', collection: shapes },
  { id: 'glass', label: 'Glass', collection: glass },
  { id: 'rings', label: 'Rings', collection: rings },
] as const

const SC_PALETTE = ['#06b6d4', '#a855f7', '#ec4899', '#8b5cf6', '#0b141a']
const BORING_COVER_VARIANTS = ['marble', 'sunset', 'ring', 'bauhaus'] as const

export const CoverPictureForm = ({ afterSubmit, submitText, submitProps, onReward }: CoverPictureFormProps) => {
  const me = useMe()
  const { account: walletAddress } = useMagicContext()
  const [loading, setLoading] = useState(false)
  const [imageUploaded, setImageUploaded] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('generate')
  const [generativeSeed, setGenerativeSeed] = useState('')

  useEffect(() => {
    const seed = me?.profile?.userHandle || walletAddress || me?.profile?.displayName || 'soundchain-cover'
    setGenerativeSeed(seed)
  }, [me?.profile?.userHandle, me?.profile?.displayName, walletAddress])

  const onUpload = useCallback((uploading: boolean) => {
    setLoading(uploading)
    if (!uploading) setImageUploaded(true)
  }, [])

  // Pre-generate DiceBear covers (wide aspect)
  const diceBearCovers = useMemo(() => {
    return COVER_STYLES.map(style => {
      const seeds = Array.from({ length: 4 }, (_, i) => `${generativeSeed}-cover-${style.id}-${i}`)
      return {
        ...style,
        avatars: seeds.map(seed => {
          const avatar = createAvatar(style.collection as any, { seed, size: 400 })
          return { seed, dataUri: avatar.toDataUri() }
        }),
      }
    })
  }, [generativeSeed])

  if (!me) return null

  const initialFormValues: FormValues = {
    coverPicture: me?.profile.coverPicture || '',
  }

  const onSubmit = async ({ coverPicture }: FormValues) => {
    setLoading(true)
    try {
      await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { coverPicture } }),
      })
      afterSubmit()
      if (onReward && (imageUploaded || coverPicture)) {
        onReward(1)
      }
    } finally {
      setLoading(false)
    }
  }

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'upload', label: 'Upload', icon: '📷' },
    { id: 'gif', label: 'GIF', icon: '🎬' },
    { id: 'generate', label: 'Generate', icon: '✨' },
    { id: 'defaults', label: 'Presets', icon: '🎨' },
  ]

  return (
    <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
      {({ values: { coverPicture }, setFieldValue }) => {
        const hasSelection = !!coverPicture

        return (
          <Form className="flex flex-1 flex-col space-y-4">
            <div className="flex-grow space-y-4">
              {/* Tab Navigation */}
              <div className="flex gap-1 p-1 rounded-xl bg-white/5">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={classNames(
                      'flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all',
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
              {coverPicture && (
                <div className="relative rounded-xl overflow-hidden ring-1 ring-cyan-500/30">
                  <img src={coverPicture} alt="Selected cover" className="w-full h-24 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-3 flex items-center gap-2">
                    <span className="text-xs text-cyan-400 font-medium">Selected Cover</span>
                    <button
                      type="button"
                      onClick={() => setFieldValue('coverPicture', '')}
                      className="text-[10px] text-gray-400 hover:text-red-400 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Tab */}
              {activeTab === 'upload' && (
                <div className="space-y-4">
                  <Label textSize="base">UPLOAD COVER:</Label>
                  {loading && !coverPicture ? (
                    <ImageUploadField name="coverPicture" maxFileSize={1024 * 1024 * 500} className="mt-4">
                      Uploading
                    </ImageUploadField>
                  ) : (
                    <ImageUploadField
                      name="coverPicture"
                      onUpload={onUpload}
                      maxFileSize={1024 * 1024 * 500}
                      className={`${coverPicture ? 'h-[150px]' : ''} mt-4 cursor-pointer`}
                    >
                      Upload Cover Photo or Video
                    </ImageUploadField>
                  )}
                </div>
              )}

              {/* GIF Tab */}
              {activeTab === 'gif' && (
                <div className="space-y-3">
                  <Label textSize="base">PICK A COVER GIF:</Label>
                  <GifPicker
                    onSelect={(gifUrl) => {
                      setFieldValue('coverPicture', gifUrl)
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
                    <Label textSize="base">SEED:</Label>
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

                  {/* Boring Avatars (wide banners) */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-2">Abstract Banners</p>
                    <div className="grid grid-cols-2 gap-2">
                      {BORING_COVER_VARIANTS.map(variant => (
                        <button
                          key={variant}
                          type="button"
                          onClick={(e) => {
                            const svg = (e.currentTarget as HTMLElement).querySelector('svg')
                            if (svg) {
                              const clone = svg.cloneNode(true) as SVGElement
                              clone.setAttribute('width', '1200')
                              clone.setAttribute('height', '400')
                              const svgString = new XMLSerializer().serializeToString(clone)
                              const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`
                              setFieldValue('coverPicture', dataUri)
                            }
                          }}
                          className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all hover:bg-white/10"
                        >
                          <div className="w-full h-16 rounded-lg overflow-hidden">
                            <Avatar size={300} name={generativeSeed} variant={variant} colors={SC_PALETTE} square />
                          </div>
                          <span className="text-[8px] text-gray-500 capitalize">{variant}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DiceBear Cover Patterns */}
                  {diceBearCovers.map(style => (
                    <div key={style.id}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-2">{style.label}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {style.avatars.map(({ seed, dataUri }) => (
                          <button
                            key={seed}
                            type="button"
                            onClick={() => setFieldValue('coverPicture', dataUri)}
                            className={classNames(
                              'p-1.5 rounded-xl transition-all hover:bg-white/10',
                              coverPicture === dataUri && 'ring-2 ring-cyan-400 bg-cyan-500/10',
                            )}
                          >
                            <img src={dataUri} alt={seed} className="w-full h-16 rounded-lg object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Defaults Tab */}
              {activeTab === 'defaults' && (
                <div className="space-y-4">
                  <Label textSize="base">PRESET COVERS:</Label>
                  <div className="flex flex-col space-y-3">
                    {defaultCoverPictures.map(picture => (
                      <button
                        key={picture}
                        type="button"
                        className={classNames(
                          'relative flex h-[100px] w-full justify-center p-1 rounded-xl transition-all hover:ring-2 hover:ring-white/30',
                          coverPicture === picture && 'ring-2 ring-cyan-400',
                        )}
                        onClick={() => setFieldValue('coverPicture', picture)}
                      >
                        <div className="relative flex h-full w-full">
                          <Image alt="Cover option" src={picture} fill objectFit="cover" className="rounded-lg" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <Button
                type="submit"
                disabled={loading || !hasSelection}
                variant="outline"
                className="mt-4 h-12"
                {...submitProps}
              >
                {submitText}
              </Button>
            </div>
          </Form>
        )
      }}
    </Formik>
  )
}
