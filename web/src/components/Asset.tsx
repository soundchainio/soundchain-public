import { useMimeTypeQuery } from 'lib/graphql';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { videoMimeTypes } from 'utils/mimeTypes';

const Asset = ({ src }: { src: string }) => {
  const [mimeType, setMimeType] = useState<string>();
  const { data } = useMimeTypeQuery({ variables: { url: src } });

  useEffect(() => {
    if (data) {
      setMimeType(data.mimeType.value);
    }
  }, [data]);

  if (!mimeType) return null;

  if (videoMimeTypes.includes(mimeType)) {
    return (
      <video
        src={src}
        controls={false}
        loop
        muted
        autoPlay
        className="w-full object-cover"
        style={{ height: 'inherit' }}
      />
    );
  }

  return <Image src={src} alt="" layout="fill" className="m-auto object-cover" priority />;
};

export default Asset;
