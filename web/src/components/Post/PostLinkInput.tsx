import { XCircleIcon } from '@heroicons/react/24/outline'
import { Bandcamp } from 'icons/Bandcamp'
import { Soundcloud } from 'icons/Soundcloud'
import { Spotify } from 'icons/Spotify'
import { Vimeo } from 'icons/Vimeo'
import { Youtube } from 'icons/Youtube'
import React, { useEffect, useState } from 'react'
import { MediaProvider } from 'types/MediaProvider'

export interface MediaLink {
  value: string
  type?: MediaProvider
}

interface PostLinkInputProps {
  type: MediaProvider
  setLink: (value: MediaLink | undefined) => void
  link?: MediaLink
  setPostLink: (value: string) => void
}

const mediaProviderOptions = {
  [MediaProvider.SPOTIFY]: { name: 'Spotify', example: 'https://open.spotify.com/track/6MQrN9j', logo: <Spotify /> },
  [MediaProvider.SOUNDCLOUD]: {
    name: 'SoundCloud',
    example: 'https://soundcloud.com/artist/music',
    logo: <Soundcloud color="#FF7A00" className="scale-150" />,
  },
  [MediaProvider.YOUTUBE]: { name: 'Youtube', example: 'https://www.youtube.com/watch?v=Ks2Gsdie', logo: <Youtube /> },
  [MediaProvider.VIMEO]: { name: 'Vimeo', example: 'https://vimeo.com/12345', logo: <Vimeo /> },
  [MediaProvider.BANDCAMP]: {
    name: 'Bandcamp',
    example: 'https://colleengreen.bandcamp.com/album/cool',
    logo: <Bandcamp />,
  },
}

export const PostLinkInput = ({ type, setLink, link, setPostLink }: PostLinkInputProps) => {
  const [fieldValue, setFieldValue] = useState('')

  const onChange = (value: string) => {
    setFieldValue(value)
  }

  const onClear = () => {
    setFieldValue('')
    setLink(undefined)
    setPostLink('')
  }

  const isDisabled = () => {
    if (link) {
      return link.type != type && link.value != ''
    }

    return false
  }

  const onBlur = () => {
    setLink({ type, value: fieldValue })
  }

  useEffect(() => {
    link && link.type == type ? setFieldValue(link.value) : setFieldValue('')
  }, [link])

  return (
    <div className="mt-4 mb-10 flex items-center text-gray-400">
      <div className="flex w-20 flex-col items-center text-xs">{mediaProviderOptions[type].logo}</div>
      <div className="flex flex-1 flex-col">
        <input
          type="text"
          aria-label={`Enter ${mediaProviderOptions[type].name} link`}
          placeholder={`Enter ${mediaProviderOptions[type].name} link`}
          className="border-gray-700 bg-gray-30 p-2 text-sm focus:outline-none focus:ring-0 disabled:opacity-50"
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          value={fieldValue}
          disabled={isDisabled()}
        />
        <div className="relative">
          <span className="absolute top-2 left-0 text-xs">({mediaProviderOptions[type].example})</span>
        </div>
      </div>
      <button className="w-16" onClick={onClear} aria-label="Close">
        <XCircleIcon className="m-auto w-6" />
      </button>
    </div>
  )
}
