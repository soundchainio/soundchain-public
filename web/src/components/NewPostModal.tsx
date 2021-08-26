import classNames from 'classnames';
import { Button } from 'components/Button';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import 'emoji-mart/css/emoji-mart.css';
import { Field, Form, Formik, FormikHelpers } from 'formik';
import GraphemeSplitter from 'grapheme-splitter';
import { CreatePostInput, CreateRepostInput } from 'lib/graphql';
import { default as React, useCallback, useEffect, useState } from 'react';
import * as yup from 'yup';
import { useCreatePostMutation, useCreateRepostMutation } from '../lib/graphql';
import { getNormalizedLink, hasLink } from '../utils/NormalizeEmbedLinks';
import { ModalsPortal } from './ModalsPortal';
import { NewPostBar } from './NewPostBar';
import { RepostPreview } from './RepostPreview';

export interface FormValues {
  body: string;
  mediaLink?: string;
}

const postSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  body: yup.string().required(),
  mediaLink: yup.string(),
});

const baseClasses =
  'fixed w-screen h-screen bottom-0 duration-500 bg-opacity-75 ease-in-out bg-gray-25 transform-gpu transform';

export const maxLength = 160;

const initialValues = { body: '' };

const splitter = new GraphemeSplitter();

export const getBodyCharacterCount = (body: string) => {
  return splitter.splitGraphemes(body).length;
};

// When we get string.length, emojis are counted as 2 characters
// This functions fixes the input maxLength and adjust to count an emoji as 1 char
const setMaxInputLength = (input: string) => {
  const rawValue = input.length;

  return maxLength + (rawValue - getBodyCharacterCount(input));
};

export const NewPostModal = () => {
  const [isEmojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [isRepost, setIsRepost] = useState(false);
  const [originalLink, setOriginalLink] = useState('');
  const [postLink, setPostLink] = useState('');
  const [bodyValue, setBodyValue] = useState('');
  const [createPost] = useCreatePostMutation({ refetchQueries: ['Posts'] });
  const [createRepost] = useCreateRepostMutation({ refetchQueries: ['Posts'] });
  const { showNewPost, repostId } = useModalState();
  const { dispatchShowNewPostModal, dispatchSetRepostId } = useModalDispatch();

  const clearState = () => {
    dispatchShowNewPostModal(false);
    setPostLink('');
    dispatchSetRepostId(undefined);
  };

  const cancel = (setFieldValue: (val: string, newVal: string) => void) => {
    return (event: React.MouseEvent) => {
      setFieldValue('body', '');
      clearState();
      event.preventDefault();
    };
  };

  const handleSubmit = async (values: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    if (repostId) {
      const params: CreateRepostInput = { body: values.body, repostId };

      await createRepost({ variables: { input: params } });
    } else {
      const params: CreatePostInput = { body: values.body };

      if (postLink.length) {
        params.mediaLink = postLink;
      }

      await createPost({ variables: { input: params } });
    }

    setEmojiPickerVisible(false);
    clearState();
    resetForm();
  };

  const onEmojiPickerClick = () => {
    setEmojiPickerVisible(!isEmojiPickerVisible);
  };

  const normalizeOriginalLink = useCallback(async () => {
    if (originalLink.length && hasLink(originalLink)) {
      const link = await getNormalizedLink(originalLink);
      setPostLink(link);
    } else {
      setPostLink('');
    }
  }, [originalLink]);

  const onOutsideClick = () => {
    dispatchShowNewPostModal(false);
  };

  const onTextareaChange = (body: string) => {
    setBodyValue(body);
  };

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (bodyValue.length) {
        const link = await getNormalizedLink(bodyValue);
        if (link) {
          setPostLink(link);
        } else if (!originalLink) {
          setPostLink('');
        }
      } else if (!originalLink) {
        setPostLink('');
      }
    }, 1000);

    return () => clearTimeout(delayDebounce);
  }, [bodyValue]);

  useEffect(() => {
    if (originalLink) {
      const normalizeOriginalLink = async () => {
        if (originalLink.length && hasLink(originalLink)) {
          const link = await getNormalizedLink(originalLink);
          setPostLink(link);
        } else {
          setPostLink('');
        }
      };
      normalizeOriginalLink();
    } else {
      setPostLink('');
    }
  }, [normalizeOriginalLink, originalLink]);

  useEffect(() => {
    if (showNewPost) {
      setOriginalLink('');
    }
  }, [showNewPost]);

  useEffect(() => {
    repostId ? setIsRepost(true) : setIsRepost(false);
  }, [repostId]);

  return (
    <ModalsPortal>
      <div
        className={classNames(baseClasses, {
          'translate-y-0 opacity-100': showNewPost,
          'translate-y-full opacity-0': !showNewPost,
        })}
      >
        <div className="w-screen h-20" onClick={onOutsideClick} />
        <Formik initialValues={initialValues} validationSchema={postSchema} onSubmit={handleSubmit}>
          {({ values, setFieldValue }) => (
            <Form className="flex flex-col max-height-from-menu">
              <div className="flex items-center rounded-tl-3xl rounded-tr-3xl bg-gray-30">
                <div className="p-2 text-gray-400 font-bold flex-1 text-center" onClick={cancel(setFieldValue)}>
                  Cancel
                </div>
                <div className="flex-1 text-center text-white font-bold">{isRepost ? 'Repost' : 'New Post'}</div>
                <div className="flex-1 text-center m-2">
                  <div className="ml-6">
                    <Button className="bg-gray-30 text-sm " type="submit" variant="rainbow-rounded">
                      Post
                    </Button>
                  </div>
                </div>
              </div>
              <Field
                component="textarea"
                name="body"
                className="w-full h-24 resize-none focus:ring-0 bg-gray-20 border-none focus:outline-none outline-none text-white flex-auto"
                placeholder="What's happening?"
                maxLength={setMaxInputLength(values.body)}
                validate={() => onTextareaChange(values.body)}
              />
              {isRepost && (
                <div className="p-4 bg-gray-20">
                  <RepostPreview postId={repostId as string} />
                </div>
              )}
              {postLink && !isRepost && (
                <iframe className="w-full bg-gray-20" frameBorder="0" allowFullScreen src={postLink} />
              )}
              <NewPostBar
                onEmojiPickerClick={onEmojiPickerClick}
                isEmojiPickerVisible={isEmojiPickerVisible}
                isRepost={isRepost}
                showNewPost={showNewPost}
                setOriginalLink={setOriginalLink}
                setFieldValue={setFieldValue}
                values={values}
                postLink={postLink}
              />
            </Form>
          )}
        </Formik>
      </div>
    </ModalsPortal>
  );
};
