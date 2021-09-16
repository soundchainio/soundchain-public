import classNames from 'classnames';
import Image from 'next/image';
import { CoverPictureOptions, coverPictures, getDefaultCoverPicturePath } from 'utils/DefaultPictures';

interface CoverProps {
  coverPicture: CoverPictureOptions;
  settings?: boolean;
}

export const Cover = ({ coverPicture, settings }: CoverProps) => {
  return (
    <div className={classNames('relative', settings ? `h-[80px]` : 'h-[125px]')}>
      {!coverPicture && settings && <div className="flex h-full w-full rounded-lg bg-gray-40" />}
      {coverPicture && !coverPicture.startsWith('default-') && (
        <Image src={coverPicture} alt="Cover pic" layout="fill" objectFit="cover" />
      )}
      {coverPicture && coverPicture.startsWith('default-') && !settings && coverPictures[coverPicture]}
      {coverPicture && coverPicture.startsWith('default-') && settings && (
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
