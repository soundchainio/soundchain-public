import { MusicNoteIcon, VideoCameraIcon } from '@heroicons/react/outline';
import classNames from 'classnames';
import { Button } from 'components/Button';
import { BaseEmoji, Picker } from 'emoji-mart';
import 'emoji-mart/css/emoji-mart.css';
import { PostLinkType } from 'enums/PostLinkType';
import { Field, Form, Formik, FormikHelpers } from 'formik';
import { default as React, useEffect, useState } from 'react';
import * as yup from 'yup';
import { useCreatePostMutation } from '../lib/graphql';
import { getNormalizedLink, hasLink } from '../utils/NormalizeEmbedLinks';
import { LinksModal } from './LinksModal';

interface NewPostModalProps {
  setShowNewPost: (val: boolean) => void;
  showNewPost: boolean;
}

interface FormValues {
  body: string;
  mediaLink?: string;
}

const postSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  body: yup.string().required(),
  mediaLink: yup.string(),
});

const baseClasses =
  'absolute w-screen h-screen bottom-0 duration-500 bg-opacity-75 ease-in-out bg-gray-25 transform-gpu transform';

const maxLength = 160;

const initialValues = { body: '' };

const getBodyCharacterCount = (body: string) => {
  return body.match(/./gu)?.length || 0;
};

// When we get string.length, emojis are counted as 2 characters
// This functions fixes the input maxLength and adjust to count an emoji as 1 char
const setMaxInputLength = (input: string) => {
  const rawValue = input.length;

  return maxLength + (rawValue - getBodyCharacterCount(input));
};

export const NewPostModal = ({ setShowNewPost, showNewPost }: NewPostModalProps) => {
  const [showAddMusicLink, setShowAddMusicLink] = useState(false);
  const [showAddVideoLink, setShowAddVideoLink] = useState(false);
  const [isEmojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [originalLink, setOriginalLink] = useState('');
  const [postLink, setPostLink] = useState('');
  const [createPost] = useCreatePostMutation({ refetchQueries: ['Posts'] });

  const cancel = (setFieldValue: (val: string, newVal: string) => void) => {
    return (event: React.MouseEvent) => {
      setShowNewPost(false);
      setPostLink('');
      setFieldValue('body', '');
      event.preventDefault();
    };
  };

  const handleSubmit = async (values: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    const params: any = { body: values.body };

    if (postLink.length) {
      params.mediaLink = postLink;
    }

    await createPost({ variables: { input: params } });
    setEmojiPickerVisible(false);
    setShowNewPost(false);
    setPostLink('');
    resetForm();
  };

  const onEmojiPickerClick = () => {
    setEmojiPickerVisible(!isEmojiPickerVisible);
  };

  const handleSelectEmoji = (
    emoji: BaseEmoji,
    values: FormValues,
    setFieldValue: (val: string, newVal: string) => void,
  ) => {
    if (getBodyCharacterCount(values.body) < maxLength) {
      setFieldValue('body', `${values.body}${emoji.native}`);
    }
  };

  const normalizeOriginalLink = async () => {
    if (originalLink.length && hasLink(originalLink)) {
      const link = await getNormalizedLink(originalLink);
      setPostLink(link);
    } else {
      setPostLink('');
    }
  };

  const onOpenMusicLink = () => {
    setShowAddMusicLink(true);
  };

  const onOpenVideoLink = () => {
    setShowAddVideoLink(true);
  };

  const onCloseLinks = () => {
    setShowAddVideoLink(false);
    setShowAddMusicLink(false);
  };

  useEffect(() => {
    if (originalLink) {
      normalizeOriginalLink();
      onCloseLinks();
    } else {
      setPostLink('');
    }
  }, [originalLink]);

  return (
    <div
      className={classNames(baseClasses, {
        'translate-y-0 opacity-100': showNewPost,
        'translate-y-full opacity-0': !showNewPost,
      })}
    >
      <div className="w-screen h-20" onClick={() => setShowNewPost(false)} />
      <Formik initialValues={initialValues} validationSchema={postSchema} onSubmit={handleSubmit}>
        {({ values, setFieldValue }) => (
          <Form className="flex flex-col max-height-from-menu">
            <div className="flex items-center rounded-tl-3xl rounded-tr-3xl bg-gray-30">
              <div className="p-2 text-gray-400 font-bold flex-1 text-center" onClick={cancel(setFieldValue)}>
                Cancel
              </div>
              <div className="flex-1 text-center text-white font-bold">New Post</div>
              <div className="flex-1 text-center">
                <Button className="text-sm m-2 rounded-lg" type="submit" variant="rainbow-rounded">
                  Post
                </Button>
              </div>
            </div>
            <Field
              component="textarea"
              name="body"
              className="w-full h-24 resize-none focus:ring-0 bg-gray-20 border-none focus:outline-none outline-none text-white flex-auto"
              placeholder="What's happening?"
              maxLength={setMaxInputLength(values.body)}
            />
            {postLink && <iframe className="w-full bg-gray-20" frameBorder="0" allowFullScreen src={postLink} />}
            <div className="p-4 flex items-center bg-gray-25">
              <div className="text-center w-16" onClick={onEmojiPickerClick}>
                {isEmojiPickerVisible ? '❌' : '😃'}
              </div>
              <div className="text-center w-16" onClick={onOpenMusicLink}>
                <MusicNoteIcon className="text-gray-400 w-5 m-auto" />
              </div>
              <div className="text-center w-16" onClick={onOpenVideoLink}>
                <VideoCameraIcon className="text-gray-400 w-5 m-auto" />
              </div>
              {showNewPost && (
                <>
                  <LinksModal
                    show={showAddMusicLink}
                    setShow={setShowAddMusicLink}
                    setOriginalLink={setOriginalLink}
                    onClose={onCloseLinks}
                    type={PostLinkType.MUSIC}
                  />
                  <LinksModal
                    show={showAddVideoLink}
                    setShow={setShowAddVideoLink}
                    setOriginalLink={setOriginalLink}
                    onClose={onCloseLinks}
                    type={PostLinkType.VIDEO}
                  />
                </>
              )}
              <div className="justify-self-end flex-1 text-right text-gray-400">
                {getBodyCharacterCount(values.body)} / {maxLength}
              </div>
              {isEmojiPickerVisible && (
                <div className="fixed left-16 bottom-0">
                  <Picker
                    theme="dark"
                    perLine={8}
                    onSelect={(e: BaseEmoji) => handleSelectEmoji(e, values, setFieldValue)}
                  />
                </div>
              )}
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};
