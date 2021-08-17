import Image from 'next/image';
import React from 'react';
import ProfilePic from '../../public/profile.jpg';

interface AvatarProps {
  src: string | null | undefined;
  pixels?: number;
  className?: string;
}

export const Avatar = ({ src, pixels = 30, className }: AvatarProps) => {
  return (
    <div className={className}>
      {src ? (
        <Image alt="Profile picture" src={src} width={pixels} height={pixels} className="rounded-full" />
      ) : (
        <Image alt="Profile picture" src={ProfilePic} width={pixels} height={pixels} className="rounded-full" />
      )}
    </div>
  );
};
