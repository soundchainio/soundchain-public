import React from 'react'

import { useMimeTypeQuery } from 'lib/graphql'; // Relative to ./src 
import Image from 'next/image'
import tw from 'tailwind-styled-components'

interface AssetProps {
  src?: string | null
  sizes?: string
  objectFit?: 'contain' | 'cover'
  disableImageWave?: boolean
}

const Asset = (props: AssetProps) => {
  const { src, sizes, objectFit = 'cover', disableImageWave } = props

  const isLocalFile = src?.startsWith('blob:')
  const { data } = useMimeTypeQuery({
    variables: { url: src as string },
    skip: !src || isLocalFile,
  })

  const mimeType = data?.mimeType.value

  if (src && !mimeType && !isLocalFile) return null

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
        src={src || '/default-pictures/album-artwork.png'}
        alt=""
        fill
        className="m-auto object-cover"
        priority
        sizes={sizes}
        objectFit={objectFit}
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
