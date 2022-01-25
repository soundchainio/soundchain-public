import classNames from 'classnames';
import Image from 'next/image';
import { VantaEffectContainer } from './VantaEffectContainer';

interface ProfileCoverProps extends React.ComponentPropsWithoutRef<'div'> {
  coverPicture: string;
}

export const ProfileCover = ({ coverPicture, className }: ProfileCoverProps) => {
  const isDefault = coverPicture.startsWith('/');
  const effectName = coverPicture.split('/').pop()?.split('.').shift();

  return (
    <div className={classNames('relative', className)}>
      {isDefault ? (
        <VantaEffectContainer effectName={effectName as string} />
      ) : (
        <Image
          src={coverPicture || '/default-pictures/cover/fog.jpeg'}
          alt="Cover pic"
          layout="fill"
          objectFit="cover"
        />
      )}
    </div>
  );
};
