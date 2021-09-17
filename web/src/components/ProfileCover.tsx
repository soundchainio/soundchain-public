import classNames from 'classnames';
import { createEffect, EffectName } from 'lib/vanta';
import Image from 'next/image';
import { CoverPictureOptions, getDefaultCoverPicturePath } from 'utils/DefaultPictures';

interface ProfileCoverProps {
  coverPicture: CoverPictureOptions;
  settings?: boolean;
}

export const ProfileCover = ({ coverPicture, settings }: ProfileCoverProps) => {
  const isDefault = coverPicture.startsWith('/');

  return (
    <div className={classNames('relative', settings ? `h-[80px]` : 'h-[125px]')}>
      {!coverPicture && settings && <div className="flex h-full w-full rounded-lg bg-gray-40" />}
      {coverPicture && !isDefault && <Image src={coverPicture} alt="Cover pic" layout="fill" objectFit="cover" />}
      {coverPicture && isDefault && !settings && createEffect(coverPicture as EffectName)}
      {coverPicture && isDefault && settings && (
        <Image
          src={getDefaultCoverPicturePath(coverPicture)}
          alt="Cover pic"
          layout="fill"
          objectFit="cover"
          className="rounded-lg"
        />
      )}
    </div>
  );
};
