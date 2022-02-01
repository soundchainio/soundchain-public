import { useMimeTypeQuery } from 'lib/graphql';
import Image from 'next/image';
import React from 'react';

interface AssetProps {
  src?: string | null;
  sizes?: string;
}

const Asset = ({ src, sizes }: AssetProps) => {
  const { data } = useMimeTypeQuery({
    variables: { url: src as string },
    skip: !src,
  });

  const mimeType = data?.mimeType.value;

  if (src && !mimeType) return null;

  if (src && mimeType?.startsWith('video')) {
    return (
      <video
        src={src}
        loop
        muted
        autoPlay
        playsInline
        disablePictureInPicture
        disableRemotePlayback
        poster="/animations/bg-video.gif"
        className="w-full object-cover"
        style={{ height: 'inherit' }}
      />
    );
  }

  return (
    <div className="h-full w-full animate-wave bg-wave-size bg-gradient-to-r from-black to-gray-70 via-gray-40 bg-opacity-80">
      <Image
        src={src || '/default-pictures/album-artwork.png'}
        alt=""
        layout="fill"
        className="m-auto object-cover"
        priority
        sizes={sizes}
      />
    </div>
  );
};

export default Asset;
