import Image from 'next/image';
import React from 'react';
import ProfilePic from '../../public/profile.jpg';

interface PostProps {
  profileId: string;
  body: string;
}

export const Post = ({ body, profileId }: PostProps) => {
  return (
    <div className="border mt-4 p-4">
      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 border overflow-hidden">
          <Image alt="Profile picture" src={ProfilePic} />
        </div>
        <p className="ml-4 text-xl font-bold">{profileId}</p>
      </div>
      <div className="mt-4">{body}</div>
    </div>
  );
};
