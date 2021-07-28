import { BaseEmoji, Picker } from 'emoji-mart';
import 'emoji-mart/css/emoji-mart.css';
import React, { useState } from 'react';
import { useAddPostMutation } from '../lib/graphql';

export const PostInput = () => {
  const [text, setText] = useState('');
  const [isEmojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [addPost, { loading, error }] = useAddPostMutation({ refetchQueries: ['Posts'] });

  const onShareClick = () => {
    addPost({ variables: { input: { body: text } } }).then(() => {
      setText('');
    });
  };

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
            disabled={loading}
            onClick={() => {
              onShareClick();
            }}
            className="bg-blue-600 text-white font-semibold w-24 h-10 rounded mt-2 mb-2 float-right mr-2"
          >
            Share
          </button>

          <button
            onClick={() => {
              setEmojiPickerVisible(!isEmojiPickerVisible);
            }}
            className="bg-blue-600 text-white font-semibold w-24 h-10 rounded mt-2 mb-2 float-right mr-2"
          >
            {isEmojiPickerVisible ? 'Close' : 'Emoji'}
          </button>
        </div>
      </div>
      {error && <p>{error.message}</p>}
      {isEmojiPickerVisible && (
        <div className="h-1 z-30 w-8/12">
          <Picker
            onSelect={(emojiData: BaseEmoji) => {
              setText(`${text}${emojiData.native}`);
            }}
          />
        </div>
      )}
    </>
  );
};
