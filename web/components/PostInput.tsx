import { Picker } from 'emoji-mart';
import 'emoji-mart/css/emoji-mart.css';
import Image from 'next/image';
import React, { useState } from 'react';
import ProfilePic from "../public/profile.jpg";
type PostInputProps = {
  onShareClick: (text: string) => void;
};
export function PostInput({ onShareClick }: PostInputProps) {
  const [text, setText] = useState('');
  const [enableEmoji, setEnableEmoji] = useState(false);
  return (
    <>
      <div className="border-2 rounded w-8/12 mt-24">
        <div className="w-full">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full rounded-lg border-2 border-gray-50 h-24 resize-none p-1"
            placeholder="Share your opinion"
          ></textarea>
        </div>
        <div>
          <button
            onClick={() => {
              onShareClick(text);
              setText('');
            }}
            className="bg-blue-600 text-white font-semibold w-24 h-10 rounded mt-2 mb-2 float-right mr-2"
          >
            Share
          </button>

          <button
            onClick={() => {
              setEnableEmoji(!enableEmoji);
            }}
            className="bg-blue-600 text-white font-semibold w-24 h-10 rounded mt-2 mb-2 float-right mr-2"
          >
            {enableEmoji ? 'Close' : 'Emoji'}
          </button>
        </div>
      </div>
      {enableEmoji && (
        <div className="h-1 z-30 w-8/12">
          <Picker
            onSelect={emojiData => {
              setText(text + emojiData.native); // Fake error
            }}
          />
        </div>
      )}
    </>
  );
}

type PostProps = {
  key: string;
  author: string;
  body:string;
};

export function PostBox({ body,  author, key }: PostProps) {
  return (
    <>
      <div key={key} className="border-2  w-8/12 mt-2">
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
