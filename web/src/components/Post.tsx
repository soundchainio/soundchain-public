import { formatDistance } from 'date-fns';
import Image from 'next/image';
import NextLink from 'next/link';
import React from 'react';
import ProfilePic from '../../public/profile.jpg';
import { PostActions } from './PostActions';
import { PostStats } from './PostStats';

interface PostProps {
  id: string;
  body: string;
  name: string;
  date: string;
}

const generateRandomNumber = () => {
  return Math.round(Math.random() * 100);
};

export const Post = ({ id, body, name, date }: PostProps) => {
  return (
    <div>
      <NextLink href={`/posts/${id}`}>
        <div className="p-4 bg-gray-20">
          <div className="flex items-center">
            <div className="rounded-full w-8 h-8 border overflow-hidden">
              <Image alt="Profile picture" src={ProfilePic} />
            </div>
            <p className="ml-4 text-lg font-bold text-gray-100">{name}</p>
            <p className="text-base text-gray-400 flex-1 text-right">{formatDistance(new Date(date), new Date())}</p>
          </div>
          <div className="mt-4 text-gray-100">{body}</div>
          <PostStats
            likes={generateRandomNumber()}
            comments={generateRandomNumber()}
            reposts={generateRandomNumber()}
          />
        </div>
      </NextLink>
      <PostActions />
    </div>
  );
};
