import { Picker } from 'emoji-mart';
import 'emoji-mart/css/emoji-mart.css';
import React, { useState } from 'react';
type PostInputProps = {
  onCreatePost: (text: string) => void;
};
export function PostInput({ onCreatePost }: PostInputProps) {
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
              onCreatePost(text);
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
