import { MusicianType } from 'lib/graphql';
import React, { useEffect, useState } from 'react';
import { Badge } from './Badge';
import { Label } from './Label';

type MusicianTypeLabels = {
  key: MusicianType;
  label: string;
};

const musicianTypes: MusicianTypeLabels[] = [
  { key: MusicianType.Singer, label: 'Singer' },
  { key: MusicianType.Drummer, label: 'Drummer' },
  { key: MusicianType.Guitarist, label: 'Guitarist' },
  { key: MusicianType.Producer, label: 'Producer' },
];

interface MusicianTypeSelectorProps {
  onSelect: (selectedMusicianTypes: MusicianType[]) => void;
}

export const MusicianTypeSelector = ({ onSelect }: MusicianTypeSelectorProps) => {
  const [selectedMusicianTypes, setSelectedMusicianTypes] = useState<MusicianType[]>([]);

  useEffect(() => {
    onSelect(selectedMusicianTypes);
  }, [onSelect, selectedMusicianTypes]);

  const isMusicianTypeSelected = (key: MusicianType): boolean => {
    return musicianTypes.some(selectedGenre => selectedGenre === key);
  };

  const onClick = (key: MusicianType) => {
    if (isMusicianTypeSelected(key)) setSelectedMusicianTypes(musicianTypes.filter(selectedGenre => selectedGenre !== key));
    else setSelectedMusicianTypes([...musicianTypes, key]);
  };

  return (
    <div className="flex flex-col">
      <Label>What are your favorite genres? {musicianTypes.length ? `(${musicianTypes.length} Selected)` : ''}</Label>
      <div className="pb-6 space-y-2">
        {musicianTypes.map(({ label, key }) => (
          <Badge key={key} label={label} selected={isMusicianTypeSelected(key)} onClick={() => onClick(key)} />
        ))}
      </div>
    </div>
  );
};
