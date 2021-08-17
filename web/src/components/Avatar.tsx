import Image from 'next/image';
import React from 'react';
import ProfilePic from '../../public/profile.jpg';

interface AvatarProps {
  pic: string | null | undefined;
  pixels?: number;
  className?: string;
}

export const Avatar = ({ pic, pixels = 30, className }: AvatarProps) => {
  const src: string | StaticImport = pic ?? ProfilePic;

  return (
    <div className={className}>
      <Image alt="Profile picture" src={src} width={pixels} height={pixels} className="rounded-full" />
    </div>
  );
};
