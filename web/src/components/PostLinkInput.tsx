import { XCircleIcon } from '@heroicons/react/outline';
import { Soundcloud } from 'icons/Soundcloud';
import { Spotify } from 'icons/Spotify';
import { Vimeo } from 'icons/Vimeo';
import { Youtube } from 'icons/Youtube';
import { Bandcamp } from 'icons/Bandcamp';
import React, { useEffect, useState } from 'react';
import { MediaProvider } from 'types/MediaProvider';

export interface MediaLink {
  value: string;
  type?: MediaProvider;
}

interface PostLinkInputProps {
  type: MediaProvider;
  setLink: (value: MediaLink | undefined) => void;
  link?: MediaLink;
  setPostLink: (value: string) => void;
}

const mediaProviderOptions = {
  [MediaProvider.SPOTIFY]: { name: 'Spotify', example: 'https://open.spotify.com/track/6MQrN9j', logo: <Spotify /> },
  [MediaProvider.SOUNDCLOUD]: {
    name: 'SoundCloud',
    example: 'https://soundcloud.com/artist/music',
    logo: <Soundcloud />,
  },
  [MediaProvider.YOUTUBE]: { name: 'Youtube', example: 'https://www.youtube.com/watch?v=Ks2Gsdie', logo: <Youtube /> },
  [MediaProvider.VIMEO]: { name: 'Vimeo', example: 'https://vimeo.com/12345', logo: <Vimeo /> },
  [MediaProvider.BANDCAMP]: { name: 'Bandcamp', example: 'https://colleengreen.bandcamp.com/album/cool', logo: <Bandcamp /> },
};

export const PostLinkInput = ({ type, setLink, link, setPostLink }: PostLinkInputProps) => {
  const [fieldValue, setFieldValue] = useState('');

  const onChange = (value: string) => {
    setFieldValue(value);
  };

  const onClear = () => {
    setFieldValue('');
    setLink(undefined);
    setPostLink('');
  };

  const isDisabled = () => {
    if (link) {
      return link.type != type && link.value != '';
    }

    return false;
  };

  const onBlur = () => {
    setLink({ type, value: fieldValue });
  };

  useEffect(() => {
    link && link.type == type ? setFieldValue(link.value) : setFieldValue('');
  }, [link]);

  return (
    <div className="text-gray-400 flex items-center mt-4 mb-10">
      <div className="w-20 flex flex-col text-xs items-center">
        {mediaProviderOptions[type].logo}
      </div>
      <div className="flex-1 flex flex-col">
        <input
          type="text"
          placeholder={`Enter ${mediaProviderOptions[type].name} link`}
          className="bg-gray-30 border-gray-700 p-2 text-sm focus:outline-none focus:ring-0 disabled:opacity-50"
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          value={fieldValue}
          disabled={isDisabled()}
        />
        <div className="relative">
          <span className="absolute top-2 left-0 text-xs">({mediaProviderOptions[type].example})</span>
        </div>
      </div>
      <div className="w-16" onClick={onClear}>
        <XCircleIcon className="w-6 m-auto" />
      </div>
    </div>
  );
};
