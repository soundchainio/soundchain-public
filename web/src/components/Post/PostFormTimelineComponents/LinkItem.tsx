import { ClearInputButton } from 'components/common/Buttons/ClearInputButton'
import { Bandcamp } from 'icons/Bandcamp'
import { CustomHTML } from 'icons/CustomHTML'
import { Soundcloud } from 'icons/Soundcloud'
import { Spotify } from 'icons/Spotify'
import { Vimeo } from 'icons/Vimeo'
import { Youtube } from 'icons/Youtube'
import { Instagram } from 'icons/social/Instagram'
import { TikTok } from 'icons/social/TikTok'
import { X } from 'icons/social/X'
import { useState } from 'react'
import { MediaProvider } from 'types/MediaProvider'
import { MediaLink } from '../PostLinkInput'

interface LinkItemProps {
  setLink: (value: MediaLink | undefined) => void
  link: MediaLink | undefined
  linkItemType: MediaProvider
}

export const LinkItem = ({ setLink, link, linkItemType }: LinkItemProps) => {
  const initialFieldValue = link?.type === linkItemType ? link.value : ''
  const [fieldValue, setFieldValue] = useState<string>(initialFieldValue)
  const mediaProviderOptions = {
    [MediaProvider.CUSTOM_HTML]: {
      example: '<iframe src="..." />',
      logo: <CustomHTML className="mx-1 h-6 w-6 text-gray-400" />,
    },
    [MediaProvider.SPOTIFY]: {
      example: 'https://open.spotify.com/track/6MQrN9j',
      logo: <Spotify className="mx-1 h-7 w-7" />,
    },
    [MediaProvider.SOUNDCLOUD]: {
      example: 'https://soundcloud.com/artist/music',
      logo: <Soundcloud color="#FF7A00" className="mx-2 mt-2 scale-150" />,
    },
    [MediaProvider.YOUTUBE]: {
      example: 'https://www.youtube.com/watch?v=Ks2Gsdie',
      logo: <Youtube className="mx-1 h-7 w-7" />,
    },
    [MediaProvider.VIMEO]: { example: 'https://vimeo.com/12345', logo: <Vimeo className="mx-1 h-7 w-7" /> },
    [MediaProvider.INSTAGRAM]: {
      example: 'https://www.instagram.com/p/ABC123',
      logo: <Instagram className="mx-1 h-6 w-6" />,
    },
    [MediaProvider.TIKTOK]: {
      example: 'https://www.tiktok.com/@user/video/123',
      logo: <TikTok className="mx-1 h-6 w-6" />,
    },
    [MediaProvider.X]: {
      example: 'https://x.com/user/status/123',
      logo: <X className="mx-1 h-5 w-5 mt-1" />,
    },
    [MediaProvider.BANDCAMP]: {
      example: 'https://colleengreen.bandcamp.com/album/cool',
      logo: (
        <div className="mt-[-13px] flex w-[35px] flex-col items-center text-xs">
          <Bandcamp className="scale-[.35]" />
        </div>
      ),
    },
  }

  const resetLink = () => {
    setLink({ type: undefined, value: '' })
    setFieldValue('')
  }

  const onLinkChange = (value: string) => {
    if (!value) {
      resetLink()
      return
    }
    setLink({ value, type: linkItemType })
    setFieldValue(value)
  }

  return (
    <>
      {mediaProviderOptions[linkItemType].logo}
      <input
        type="text"
        className="mx-[8px] h-8 w-full rounded border border-neutral-700 bg-neutral-900 text-xs text-white placeholder-neutral-500 focus:ring-0"
        placeholder={mediaProviderOptions[linkItemType].example}
        onChange={e => onLinkChange(e.target.value)}
        disabled={link?.type && link?.type !== linkItemType}
        value={fieldValue}
      />
      <ClearInputButton resetLink={resetLink} />
    </>
  )
}
