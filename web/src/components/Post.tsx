import { formatDistance } from 'date-fns';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import ProfilePic from '../../public/profile.jpg';
import { getNormalizedLink } from '../utils/NormalizeEmbedLinks';
import { PostActions } from './PostActions';
import { PostStats } from './PostStats';

interface PostProps {
  body: string;
  name: string;
  date: string;
}

const generateRandomNumber = () => {
  return Math.round(Math.random() * 100);
};

export const Post = ({ body, name, date }: PostProps) => {
  const [postLink, setPostLink] = useState('');

  useEffect(() => {
    if (body.length) {
      extractEmbedLink();
    }
  }, [body]);

  const extractEmbedLink = async () => {
    const link = await getNormalizedLink(body);
    setPostLink(link || '');
  };

  return (
    <div>
      <div className="p-4 bg-gray-20">
        <div className="flex items-center">
          <div className="rounded-full w-8 h-8 border overflow-hidden">
            <Image alt="Profile picture" src={ProfilePic} />
          </div>
          <p className="ml-4 text-lg font-bold text-gray-100">{name}</p>
          <p className="text-base text-gray-400 flex-1 text-right">{formatDistance(new Date(date), new Date())}</p>
        </div>
        <div className="mt-4 text-gray-100 break-words">{body}</div>
        {postLink && <iframe frameBorder="0" className="mt-4 w-full bg-gray-20" allowFullScreen src={postLink} />}
        <PostStats likes={generateRandomNumber()} comments={generateRandomNumber()} reposts={generateRandomNumber()} />
      </div>
      <PostActions />
    </div>
  );
};
