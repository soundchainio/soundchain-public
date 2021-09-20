import classNames from 'classnames';
import { useField } from 'formik';
import { DefaultCoverPicture } from 'lib/graphql';
import Image from 'next/image';

const pictures = Object.values(DefaultCoverPicture);

export const DefaultCoverPictureField = () => {
  const [{ value }, , { setValue }] = useField('defaultCoverPicture');

  return (
    <div className="flex flex-col space-y-4">
      {pictures.map(picture => (
        <div
          key={picture}
          className={classNames(
            'relative flex justify-center justify-self-center rounded-full w-full h-[150px] p-2 cursor-pointer',
            value === picture && 'rounded-xl border-2',
          )}
          onClick={() => setValue(picture)}
        >
          <div className="relative flex w-full h-full">
            <Image
              alt={`Default cover picture ${picture}`}
              src={`/default-pictures/cover/${picture}.jpeg`}
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
