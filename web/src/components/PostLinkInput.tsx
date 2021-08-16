import { XCircleIcon } from '@heroicons/react/outline';
import { Soundcloud } from 'icons/Soundcloud';
import { Spotify } from 'icons/Spotify';
import { Vimeo } from 'icons/Vimeo';
import { Youtube } from 'icons/Youtube';
import React, { useState } from 'react';

interface PostLinkInputProps {
  type: string;
  handleSetLink: (value: string, type: string) => void;
}

interface MediaType {
  name: string;
  example: string;
  logo?: JSX.Element;
}

const options = [
  { name: 'Spotify', example: 'https://open.spotify.com/track/6MQrN9j', logo: <Spotify /> },
  { name: 'SoundCloud', example: 'https://soundcloud.com/artist/music', logo: <Soundcloud /> },
  { name: 'Youtube', example: 'https://www.youtube.com/watch?v=Ks2Gsdie', logo: <Youtube /> },
  { name: 'Vimeo', example: 'https://vimeo.com/12345', logo: <Vimeo /> },
];

export const PostLinkInput = ({ type, handleSetLink }: PostLinkInputProps) => {
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
    handleSetLink(value, type);
  };

  const onClear = () => {
    setFieldValue('');
  };

  return (
    <div className="text-gray-400 flex items-center mt-4 mb-10">
      <div className="w-20 flex flex-col text-xs items-center transform scale-150">{selectedType.logo}</div>
      <div className="flex-1 flex flex-col">
        <input
          type="text"
          placeholder={`Enter ${selectedType.name} link`}
          className="bg-gray-30 border-gray-700 p-2 text-sm focus:outline-none focus:ring-0"
          onChange={e => onChange(e.target.value)}
          value={fieldValue}
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
