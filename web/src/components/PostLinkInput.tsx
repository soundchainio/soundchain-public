import { XCircleIcon } from '@heroicons/react/outline';
import { MediaProvider } from 'enums/MediaProvider';
import { Soundcloud } from 'icons/Soundcloud';
import { Spotify } from 'icons/Spotify';
import { Vimeo } from 'icons/Vimeo';
import { Youtube } from 'icons/Youtube';
import React, { useEffect, useState } from 'react';

export interface MediaLink {
  value: string;
  type: MediaProvider;
}

interface MediaType {
  name: string;
  example: string;
  logo?: JSX.Element;
}

interface PostLinkInputProps {
  type: MediaProvider;
  handleSetLink: (value: string, type: MediaProvider) => void;
  link: MediaLink;
}

const options = [
  { name: 'Spotify', example: 'https://open.spotify.com/track/6MQrN9j', logo: <Spotify /> },
  { name: 'SoundCloud', example: 'https://soundcloud.com/artist/music', logo: <Soundcloud /> },
  { name: 'Youtube', example: 'https://www.youtube.com/watch?v=Ks2Gsdie', logo: <Youtube /> },
  { name: 'Vimeo', example: 'https://vimeo.com/12345', logo: <Vimeo /> },
];

export const PostLinkInput = ({ type, handleSetLink, link }: PostLinkInputProps) => {
  const [fieldValue, setFieldValue] = useState('');
  let selectedType: MediaType = {
    name: '',
    example: '',
  };

  options.map(opt => {
    if (opt.name.toLowerCase() == type.toLowerCase()) {
      selectedType = opt;
    }
  });

  const onChange = (value: string) => {
    setFieldValue(value);
  };

  const onClear = () => {
    setFieldValue('');
    handleSetLink('', MediaProvider.INITIAL);
  };

  const isDisabled = () => {
    return link.type != type && link.value != '';
  };

  useEffect(() => {
    const timer = setTimeout(() => handleSetLink(fieldValue, type), 500);

    return () => {
      clearTimeout(timer);
    };
  }, [fieldValue]);

  return (
    <div className="text-gray-400 flex items-center mt-4 mb-10">
      <div className="w-20 flex flex-col text-xs items-center transform scale-150">{selectedType.logo}</div>
      <div className="flex-1 flex flex-col">
        <input
          type="text"
          placeholder={`Enter ${selectedType.name} link`}
          className="bg-gray-30 border-gray-700 p-2 text-sm focus:outline-none focus:ring-0 disabled:opacity-50"
          onChange={e => onChange(e.target.value)}
          value={fieldValue}
          disabled={isDisabled()}
        />
        <div className="relative">
          <span className="absolute top-2 left-0 text-xs">({selectedType.example})</span>
        </div>
      </div>
      <div className="w-16" onClick={onClear}>
        <XCircleIcon className="w-6 m-auto" />
      </div>
    </div>
  );
};
