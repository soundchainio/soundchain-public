import { MusicianType } from 'lib/graphql';
import React, { useEffect, useState } from 'react';
import { Badge } from './Badge';
import { Label } from './Label';
import { musicianTypes } from 'utils/MusicianTypes';

interface MusicianTypeSelectorProps {
  onSelect: (selectedMusicianTypes: MusicianType[]) => void;
  maxSelections?: number;
  initialValue?: MusicianType[];
}

export const MusicianTypeSelector = ({ onSelect, maxSelections = 5, initialValue }: MusicianTypeSelectorProps) => {
  const [selectedMusicianTypes, setSelectedMusicianTypes] = useState<MusicianType[]>(initialValue || []);

  useEffect(() => {
    onSelect(selectedMusicianTypes);
  }, [onSelect, selectedMusicianTypes]);

  const isMusicianTypeSelected = (key: MusicianType): boolean => {
    return selectedMusicianTypes.some(selectedMusicianType => selectedMusicianType === key);
  };

  const onMusicianTypeClick = (key: MusicianType) => {
    if (selectedMusicianTypes.length < maxSelections) {
      if (isMusicianTypeSelected(key))
        setSelectedMusicianTypes(selectedMusicianTypes.filter(selectedMusicianType => selectedMusicianType !== key));
      else setSelectedMusicianTypes([...selectedMusicianTypes, key]);
    }
  };

  return (
    <div className="flex flex-col">
      <Label>
        What type of musician you are?{' '}
        {selectedMusicianTypes.length ? `(${selectedMusicianTypes.length} Selected)` : ''}
      </Label>
      <div className="pb-6 space-y-2">
        {musicianTypes.map(({ label, key }) => (
          <Badge
            key={key}
            label={label}
            selected={isMusicianTypeSelected(key)}
            onClick={() => onMusicianTypeClick(key)}
          />
        ))}
      </div>
    </div>
  );
};
