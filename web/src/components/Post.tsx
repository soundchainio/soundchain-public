import Image from 'next/image';
import React from 'react';
import ProfilePic from '../../public/profile.jpg';
import { PostActions } from './PostActions';
import { PostStats } from './PostStats';

interface PostProps {
  body: string;
  name: string;
  date: string;
}

export const Post = ({ body, name, date }: PostProps) => {
  return (
    <>
      <div className="mt-2 p-4 bg-gray-700">
        <div className="flex items-center">
          <div className="rounded-full w-8 h-8 border overflow-hidden">
            <Image alt="Profile picture" src={ProfilePic} />
          </div>
          <p className="ml-4 text-lg font-bold text-gray-100">{name}</p>
          <p className="text-base text-gray-400 flex-1 text-right">{date}</p>
        </div>
        <div className="mt-4 text-gray-100">{body}</div>
        <PostStats likes={503} comments={150} reposts={12} />
      </div>
      <PostActions />
    </>
  );
};
