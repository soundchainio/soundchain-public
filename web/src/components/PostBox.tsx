import Image from 'next/image';
import React from 'react';
import ProfilePic from '../../public/profile.jpg';

type PostProps = {
  author: string;
  body: string;
};

export function PostBox({ body, author }: PostProps) {
  return (
    <>
      <div className="border-2  w-8/12 mt-2">
        <div className="flex justify-start">
          <div className="rounded-full w-8 h-8 border mt-2 ml-2 border-gray-400">
            <Image className="rounded-full" alt="profile" src={ProfilePic} />
          </div>
          <p className="p-1 font-semibold text-xl mt-1 ml-1 text-blue-700">{author}</p>
        </div>
        <div className="w-full rounded-lg  border-gray-50 h-16 resize-none p-1 ml-2 ">{body}</div>

        <div></div>
        <div className="ml-5"></div>
      </div>
    </>
  );
}
