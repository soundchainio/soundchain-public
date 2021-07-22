import React, { useState } from 'react';
import 'emoji-mart/css/emoji-mart.css';
import { YoutubeIframe } from '../../iframes';

import { Picker } from 'emoji-mart';

type CommentInputProps = {
  onShare: (text: string) => void;
};
export function CommentInput({ onShare }: CommentInputProps) {
  const [text, setText] = useState('');
  const [enableEmoji, setEnableEmoji] = useState(false);
  return (
    <>
      <div className="border-2 rounded w-8/12 mt-24">
        <div className="w-full">
          <textarea
            value={text}
            onChange={e => {
              setText(e.target.value);
            }}
            className="w-full rounded-lg border-2 border-gray-50 h-24 resize-none p-1"
            placeholder="Share your opinion"
          ></textarea>
        </div>
        <div>
          <button
            onClick={() => {
              onShare(text);
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
              setText(text + emojiData.native);
            }}
          />
        </div>
      )}
    </>
  );
}

type CommentProps = {
  key: string;
  owner: string;
  textContent: string;
  replies: Array<CommentProps>;
  videoUrl: string;
};

export function CommentBox({ textContent,  owner, key, videoUrl }: CommentProps) {
  return (
    <>
      <div key={key} className="border-2  w-8/12 mt-2">
        <p className="p-1 font-semibold text-xl text-blue-700">{owner}</p>
        <div className="w-full rounded-lg border-2 border-gray-50 h-16 resize-none p-1 ">{textContent}</div>
        {videoUrl && (
          <div className="flex justify-center mb-6">
            <YoutubeIframe videoUrl={videoUrl} width={'90%'} height={'300px'} />
          </div>
        )}
        <div></div>
        <div className="ml-5">
          
        </div>
      </div>
    </>
  );
}
