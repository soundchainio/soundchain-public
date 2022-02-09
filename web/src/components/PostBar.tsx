import { MusicNoteIcon, VideoCameraIcon } from '@heroicons/react/outline';
import { BaseEmoji, Picker } from 'emoji-mart';
import { useState } from 'react';
import { PostLinkType } from 'types/PostLinkType';
import { LinksModal } from './LinksModal';
import { FormValues } from './PostForm';
import { getBodyCharacterCount, maxLength } from './PostModal';

interface PostBarProps {
  onEmojiPickerClick: () => void;
  isEmojiPickerVisible: boolean;
  isRepost: boolean;
  showNewPost: boolean;
  setOriginalLink: (val: string) => void;
  setFieldValue: (field: string, value: string) => void;
  values: FormValues;
  postLink: string;
  setPostLink: (val: string) => void;
}

export const PostBar = ({
  onEmojiPickerClick,
  isEmojiPickerVisible,
  isRepost,
  showNewPost,
  setOriginalLink,
  setFieldValue,
  values,
  postLink,
  setPostLink,
}: PostBarProps) => {
  const [showAddMusicLink, setShowAddMusicLink] = useState(false);
  const [showAddVideoLink, setShowAddVideoLink] = useState(false);
  const charCounter = `${getBodyCharacterCount(values.body)} / ${maxLength}`;

  const handleSelectEmoji = (
    emoji: BaseEmoji,
    values: FormValues,
    setFieldValue: (val: string, newVal: string) => void,
  ) => {
    if (getBodyCharacterCount(values.body) < maxLength) {
      setFieldValue('body', `${values.body}${emoji.native}`);
    }
  };

  const onAddMusicClick = () => {
    setShowAddMusicLink(!showAddMusicLink);
  };

  const onAddVideoClick = () => {
    setShowAddVideoLink(!showAddVideoLink);
  };

  return (
    <div className="p-4 flex items-center bg-gray-15">
      <div className="text-center w-16 cursor-pointer" onClick={onEmojiPickerClick}>
        {isEmojiPickerVisible ? '❌' : '😃'}
      </div>
      {!isRepost && (
        <>
          <button
            className="text-center w-16 cursor-pointer"
            aria-label="Embed a song to your post"
            onClick={onAddMusicClick}
          >
            <MusicNoteIcon className="text-gray-400 w-5 m-auto" />
          </button>
          <button
            className="text-center w-16 cursor-pointer"
            aria-label="Embed a video to your post"
            onClick={onAddVideoClick}
          >
            <VideoCameraIcon className="text-gray-400 w-5 m-auto" />
          </button>
        </>
      )}
      {showNewPost && !isRepost && (
        <>
          <LinksModal
            show={showAddMusicLink}
            setShow={setShowAddMusicLink}
            setOriginalLink={setOriginalLink}
            onClose={onAddMusicClick}
            type={PostLinkType.MUSIC}
            postLink={postLink}
            setPostLink={setPostLink}
          />
          <LinksModal
            show={showAddVideoLink}
            setShow={setShowAddVideoLink}
            setOriginalLink={setOriginalLink}
            onClose={onAddVideoClick}
            type={PostLinkType.VIDEO}
            postLink={postLink}
            setPostLink={setPostLink}
          />
        </>
      )}
      <div className="justify-self-end flex-1 text-right text-gray-400">{charCounter}</div>
      {isEmojiPickerVisible && (
        <div className="fixed left-16 bottom-0">
          <Picker theme="dark" perLine={8} onSelect={(e: BaseEmoji) => handleSelectEmoji(e, values, setFieldValue)} />
        </div>
      )}
    </div>
  );
};
