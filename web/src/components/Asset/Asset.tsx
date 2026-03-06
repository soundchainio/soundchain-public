import React, { useState } from 'react'

import { useMimeTypeQuery } from 'lib/graphql'; // Relative to ./src
import Image from 'next/image'
import tw from 'tailwind-styled-components'

// Default fallback artwork
const DEFAULT_ARTWORK = '/default-pictures/album-artwork.png'

interface AssetProps {
  src?: string | null
  sizes?: string
  objectFit?: 'contain' | 'cover'
  disableImageWave?: boolean
}

const Asset = (props: AssetProps) => {
  const { src, sizes, objectFit = 'cover', disableImageWave } = props
  const [imgError, setImgError] = useState(false)

  const isLocalFile = src?.startsWith('blob:')
  const { data } = useMimeTypeQuery({
    variables: { url: src as string },
    skip: !src || isLocalFile,
  })

  const mimeType = data?.mimeType?.value
  const isLoading = !isLocalFile && src && !data

  // Handle image load error - fallback to default
  const handleImageError = () => {
    setImgError(true)
  }

  // Use fallback if src is empty/null or if image failed to load
  const imageSrc = (!src || imgError) ? DEFAULT_ARTWORK : src

  // Show video if detected as video type
  if (src && mimeType?.startsWith('video')) {
    return (
      <video
        src={src}
        loop
        muted
        autoPlay
        playsInline
        disablePictureInPicture
        disableRemotePlayback
        poster="/animations/bg-video.gif"
        className="w-full object-cover"
        style={{ height: 'inherit' }}
      />
    )
  }

  return (
    <ImageContainer disableImageWave={disableImageWave}>
      <Image
        src={imageSrc}
        alt=""
        fill
        className={`m-auto ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
        style={{ objectFit: objectFit }}
        priority
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
        onError={handleImageError}
      />
    </ImageContainer>
  )
}

export default Asset

const ImageContainer = tw.div<{ disableImageWave?: boolean }>`
  to-gray-70 
  relative 
  h-full 
  w-full 

  ${({ disableImageWave }) =>
    disableImageWave ? '' : 'animate-wave  bg-opacity-80 bg-gradient-to-r from-black via-gray-40 bg-wave-size'}
`
