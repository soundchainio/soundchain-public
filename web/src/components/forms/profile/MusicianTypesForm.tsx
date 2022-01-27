import { Badge } from 'components/Badge';
import { Button, ButtonProps } from 'components/Button';
import { Label } from 'components/Label';
import { useMe } from 'hooks/useMe';
import { MusicianType, useUpdateMusicianTypeMutation } from 'lib/graphql';
import React, { useEffect, useState } from 'react';
import { musicianTypes } from 'utils/MusicianTypes';

interface MusicianTypesFormProps {
  afterSubmit: () => void;
  submitProps?: ButtonProps;
  submitText: string;
  maxSelections?: number;
}

export const MusicianTypesForm = ({
  afterSubmit,
  submitProps,
  submitText,
  maxSelections = musicianTypes.length,
}: MusicianTypesFormProps) => {
  const [types, setTypes] = useState<MusicianType[]>([]);
  const [updateMusicianType, { loading }] = useUpdateMusicianTypeMutation();
  const me = useMe();

  useEffect(() => {
    if (me?.profile.musicianTypes) {
      setTypes(me.profile.musicianTypes);
    }
  }, [me?.profile.musicianTypes]);

  const onSubmit = async () => {
    if (musicianTypes.length) {
      await updateMusicianType({ variables: { input: { musicianTypes: types } } });
    }
    afterSubmit();
  };

  const onTypeClick = (key: MusicianType) => {
    if (types.length <= maxSelections) {
      if (types.includes(key)) {
        setTypes(types.filter(type => type !== key));
      } else {
        setTypes([...types, key]);
      }
    }
  };

  return (
    <>
      <div className="flex flex-col flex-grow">
        <Label grayScale="80">What type of musician are you? {types.length ? `(${types.length} Selected)` : ''}</Label>
        <div className="pb-6 space-y-2">
          {musicianTypes.map(({ label, key }) => (
            <Badge
              key={key}
              label={label}
              selected={types.includes(key)}
              onClick={() => onTypeClick(key)}
              className="mr-2"
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col">
        <Button type="submit" disabled={loading} variant="outline" className="h-12" onClick={onSubmit} {...submitProps}>
          {submitText}
        </Button>
      </div>
    </>
  );
};
