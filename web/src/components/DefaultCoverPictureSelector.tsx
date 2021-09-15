import classNames from 'classnames';
import { useMountedState } from 'hooks/useMountedState';
import Image from 'next/image';
import { coverPictures, getDefaultCoverPicturePath } from 'utils/DefaultPictures';

interface DefaultCoverPictureSelectorProps {
  onSelect: (picture: string) => void;
}

export const DefaultCoverPictureSelector = ({ onSelect }: DefaultCoverPictureSelectorProps) => {
  const [selected, setSelected] = useMountedState<string | undefined>(undefined);

  const onClick = (picture: string) => {
    setSelected(picture);
    onSelect(picture);
  };

  return (
    <div className="flex flex-col space-y-4">
      {coverPictures.map(picture => (
        <div
          key={picture}
          className={classNames(
            'relative flex justify-center justify-self-center rounded-full w-full h-[150px] p-2 cursor-pointer',
            selected === picture && 'rounded-xl border-2',
          )}
          onClick={() => onClick(picture)}
        >
          <div className="relative flex w-full h-full">
            <Image
              alt={`Cover Picture ${picture}`}
              src={getDefaultCoverPicturePath(picture)}
              layout="fill"
              objectFit="cover"
              className="rounded-lg"
            />
          </div>
        </div>
      ))}
    </div>
  );
};
