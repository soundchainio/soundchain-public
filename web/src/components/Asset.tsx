import { useMimeTypeLazyQuery } from 'lib/graphql';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';

interface AssetProps {
  src?: string | null;
}

const Asset = ({ src }: AssetProps) => {
  const [mimeType, setMimeType] = useState<string>();

  const [getMimeType, { data }] = useMimeTypeLazyQuery({
    variables: { url: src as string },
  });

  useEffect(() => {
    if (data) setMimeType(data.mimeType.value);
  }, [data]);

  useEffect(() => {
    if (src) getMimeType();
  }, [src]);

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
        className="w-full object-cover"
        style={{ height: 'inherit' }}
      />
    );
  }

  return (
    <Image
      src={src || '/default-pictures/album-artwork.png'}
      alt=""
      layout="fill"
      className="m-auto object-cover"
      priority
    />
  );
};

export default Asset;
