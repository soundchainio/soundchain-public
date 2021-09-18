import classNames from 'classnames';
import { useField } from 'formik';
import { DefaultProfilePicture } from 'lib/graphql';
import Image from 'next/image';

const pictures = Object.values(DefaultProfilePicture);

export const DefaultProfilePictureField = () => {
  const [{ value }, , { setValue }] = useField('defaultProfilePicture');

  return (
    <div className="grid grid-cols-4 gap-4">
      {pictures.map(picture => (
        <div
          key={picture}
          className={classNames(
            'flex justify-center justify-self-center rounded-full w-[60px] h-[60px] cursor-pointer',
            value === picture && 'ring-4 ring-white',
          )}
          onClick={() => setValue(picture)}
        >
          <Image alt="Profile picture red" src={`/default-pictures/profile/${picture}.png`} width={60} height={60} />
        </div>
      ))}
    </div>
  );
};
