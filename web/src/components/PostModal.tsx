import classNames from 'classnames';
import { Button } from 'components/Button';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import 'emoji-mart/css/emoji-mart.css';
import { Field, Form, Formik, FormikHelpers } from 'formik';
import GraphemeSplitter from 'grapheme-splitter';
import { PostBodyField } from 'components/PostBodyField';
import {
  CreatePostInput,
  CreateRepostInput,
  UpdatePostInput,
  useCreatePostMutation,
  useCreateRepostMutation,
  usePostLazyQuery,
  useUpdatePostMutation
} from 'lib/graphql';
import { default as React, useCallback, useEffect, useState } from 'react';
import { getNormalizedLink, hasLink } from '../utils/NormalizeEmbedLinks';
import { ModalsPortal } from './ModalsPortal';
import { PostForm, FormValues } from './PostForm';
import { PostBar } from './PostBar';
import { RepostPreview } from './RepostPreview';
import { PostFormType } from 'types/PostFormType';

const baseClasses =
  'fixed top-0 w-screen bottom-0 duration-500 bg-opacity-75 ease-in-out bg-black transform-gpu transform';

export const maxLength = 160;

const splitter = new GraphemeSplitter();

export const getBodyCharacterCount = (body?: string) => {
  return splitter.splitGraphemes(body || '').length;
};

// When we get string.length, emojis are counted as 2 characters
// This functions fixes the input maxLength and adjust to count an emoji as 1 char
export const setMaxInputLength = (input: string) => {
  const rawValue = input.length;

  return maxLength + (rawValue - getBodyCharacterCount(input));
};

export const PostModal = () => {
  const [postType, setPostType] = useState<PostFormType>(PostFormType.NEW);
  const [isEmojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [isRepost, setIsRepost] = useState(false);
  const [isEditPost, setIsEditPost] = useState(false);
  const [originalLink, setOriginalLink] = useState('');
  const [postLink, setPostLink] = useState('');
  const [bodyValue, setBodyValue] = useState('');
  const [createPost] = useCreatePostMutation({ refetchQueries: ['Posts', 'Feed'] });
  const [createRepost] = useCreateRepostMutation({ refetchQueries: ['Posts', 'Feed'] });
  const [editPost] = useUpdatePostMutation({ refetchQueries: ['Post'] });

  const { showNewPost, repostId, editPostId } = useModalState();
  const { dispatchShowPostModal, dispatchSetRepostId, dispatchSetEditPostId } = useModalDispatch();

  const [getPost, { data: editingPost }] = usePostLazyQuery({
    variables: { id: editPostId! },
  });

  const initialValues = { body: editingPost?.post.body || '' };

  const clearState = () => {
    dispatchShowPostModal(false);
    setPostLink('');
    dispatchSetRepostId(undefined);
    dispatchSetEditPostId(undefined);
  };

  const cancel = (setFieldValue: (val: string, newVal: string) => void) => {
    setFieldValue('body', '');
    clearState();
  };

  const handleSubmit = async (values: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    if (repostId) {
      const params: CreateRepostInput = { body: values.body, repostId };

      await createRepost({ variables: { input: params } });
    } else if (editPostId) {
      const params: UpdatePostInput = { body: values.body, postId: editPostId };

      if (postLink.length) {
        params.mediaLink = postLink;
      }

      await editPost({ variables: { input: params } });
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

  const onTextareaChange = (body: string) => {
    setBodyValue(body);
  };

  useEffect(() => {
    if (editPostId) {
      getPost();
    }
  }, [editPostId]);

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (bodyValue.length) {
        const link = await getNormalizedLink(bodyValue);
        if (link) {
          setPostLink(link);
        } else if (!originalLink && !isEditPost) {
          setPostLink('');
        }
      } else if (!originalLink && !isEditPost) {
        setPostLink('');
      }
    }, 1000);

    return () => clearTimeout(delayDebounce);
  }, [bodyValue]);

  useEffect(() => {
    if (originalLink) {
      normalizeOriginalLink();
    } else if (!isEditPost) {
      setPostLink('');
    }
  }, [normalizeOriginalLink, originalLink]);

  useEffect(() => {
    if (showNewPost) {
      setOriginalLink('');
    }
  }, [showNewPost]);

  useEffect(() => {
    if (repostId) {
      setPostType(PostFormType.REPOST);
    }

    if (editPostId) {
      setPostType(PostFormType.EDIT);
    }

    if ((!editPostId && !repostId)) {
      setPostType(PostFormType.NEW);
    }

    repostId ? setIsRepost(true) : setIsRepost(false);
    editPostId ? setIsEditPost(true) : setIsEditPost(false);
    !(editPostId || repostId) ? setIsEditPost(true) : setIsEditPost(false);
  }, [repostId, editPostId]);

  useEffect(() => {
    if (editingPost) {
      setPostLink(editingPost.post.mediaLink || '');
      setBodyValue(editingPost.post.body);
    }
  }, [editingPost]);

  return (
    <ModalsPortal>
      <div
        className={classNames(baseClasses, {
          'translate-y-0 opacity-100': showNewPost,
          'translate-y-full opacity-0': !showNewPost,
        })}
      >
        <PostForm
          type={postType}
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onCancel={cancel}
        />

        {postType === PostFormType.REPOST && (
          <div className="p-4 bg-gray-20">
            <RepostPreview postId={repostId as string} />
          </div>
        )}
        {postLink && postType !== PostFormType.REPOST && (
          <iframe className="w-full bg-gray-20" frameBorder="0" allowFullScreen src={postLink} />
        )}
        {/* <PostBar
          onEmojiPickerClick={onEmojiPickerClick}
          isEmojiPickerVisible={isEmojiPickerVisible}
          isRepost={isRepost}
          showNewPost={showNewPost}
          setFieldValue={setFieldValue}
          values={values}
          postLink={postLink}
          setPostLink={setPostLink}
        /> */}
      </div>
    </ModalsPortal>
  );
};
