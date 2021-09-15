import classNames from 'classnames';
import { useMountedState } from 'hooks/useMountedState';
import Image from 'next/image';

interface DefaultProfilePictureSelectorProps {
  onSelect: (picture: string) => void;
}

const pictures = ['red', 'orange', 'yellow', 'green', 'light-blue', 'blue', 'purple', 'pink'];

export const DefaultProfilePictureSelector = ({ onSelect }: DefaultProfilePictureSelectorProps) => {
  const [selected, setSelected] = useMountedState<string | undefined>(undefined);

  const onClick = (picture: string) => {
    setSelected(picture);
    onSelect(`default-${picture}`);
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      {pictures.map(picture => (
        <div
          key={picture}
          className={classNames(
            'flex justify-center justify-self-center rounded-full w-[60px] h-[60px] cursor-pointer',
            selected === picture && 'ring-4 ring-white',
          )}
          onClick={() => onClick(picture)}
        >
          <Image
            alt="Profile picture red"
            src={`/defaultPictures/profile/default-${picture}.png`}
            width={60}
            height={60}
          />
        </div>
      ))}
    </div>
  );
};
