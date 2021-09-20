import classNames from 'classnames';
import { DefaultCoverPicture } from 'lib/graphql';
import { createEffect } from 'lib/vanta';
import Image from 'next/image';

interface ProfileCoverProps extends React.ComponentPropsWithoutRef<'div'> {
  coverPicture: string;
  defaultCoverPicture: DefaultCoverPicture;
}

export const ProfileCover = ({ coverPicture, defaultCoverPicture, className }: ProfileCoverProps) => {
  const isDefault = coverPicture.startsWith('/');

  return (
    <div className={classNames('relative', className)}>
      {isDefault ? (
        <>
          {createEffect(defaultCoverPicture)}
          <Image src={coverPicture} alt="Cover pic" layout="fill" objectFit="cover" className="rounded-lg" />
        </>
      ) : (
        <Image src={coverPicture} alt="Cover pic" layout="fill" objectFit="cover" />
      )}
    </div>
  );
};
