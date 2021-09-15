import classNames from 'classnames';
import { useMountedState } from 'hooks/useMountedState';
import Image from 'next/image';
import { defaultProfilePictures, getDefaultProfilePicturePath } from 'utils/DefaultProfilePictures';

interface DefaultProfilePictureSelectorProps {
  onSelect: (picture: string) => void;
}

export const DefaultProfilePictureSelector = ({ onSelect }: DefaultProfilePictureSelectorProps) => {
  const [selected, setSelected] = useMountedState<string | undefined>(undefined);

  const onClick = (picture: string) => {
    setSelected(picture);
    onSelect(picture);
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      {defaultProfilePictures.map(picture => (
        <div
          key={picture}
          className={classNames(
            'flex justify-center justify-self-center rounded-full w-[60px] h-[60px] cursor-pointer',
            selected === picture && 'ring-4 ring-white',
          )}
          onClick={() => onClick(picture)}
        >
          <Image alt="Profile picture red" src={getDefaultProfilePicturePath(picture)} width={60} height={60} />
        </div>
      ))}
    </div>
  );
};
