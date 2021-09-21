import classNames from 'classnames';
import { DefaultCoverPicture } from 'lib/graphql';
import Image from 'next/image';
import { VantaEffectContainer } from './VantaEffectContainer';

interface ProfileCoverProps extends React.ComponentPropsWithoutRef<'div'> {
  coverPicture: string;
  defaultCoverPicture: DefaultCoverPicture;
}

export const ProfileCover = ({ coverPicture, defaultCoverPicture, className }: ProfileCoverProps) => {
  const isDefault = coverPicture.startsWith('/');

  return (
    <div className={classNames('relative', className)}>
      {isDefault ? (
        <VantaEffectContainer effectName={defaultCoverPicture} />
      ) : (
        <Image src={coverPicture} alt="Cover pic" layout="fill" objectFit="cover" />
      )}
    </div>
  );
};
