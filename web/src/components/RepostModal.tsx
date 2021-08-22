import classNames from 'classnames';
import { Button } from 'components/Button';
import { useModalsContext } from 'contexts/Modals';
import { useRepostModalContext } from 'contexts/RepostModal';
import { BaseEmoji, Picker } from 'emoji-mart';
import 'emoji-mart/css/emoji-mart.css';
import { Field, Form, Formik, FormikHelpers } from 'formik';
import { CreatePostInput } from 'lib/graphql';
import React, { useEffect, useState } from 'react';
import * as yup from 'yup';
import { useCreatePostMutation } from '../lib/graphql';
import { RepostPreview } from './RepostPreview';

interface FormValues {
  body: string;
}

const postSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  body: yup.string().required(),
});

const baseClasses =
  'fixed w-screen h-screen left-0 z-10 bottom-0 duration-500 bg-opacity-75 ease-in-out bg-gray-25 transform-gpu transform';

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

export const RepostModal = () => {
  const [isEmojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const { setAnyModalOpened } = useModalsContext();
  const { repostId, setShowRepostModal, showRepostModal } = useRepostModalContext();
  const [createPost] = useCreatePostMutation({ refetchQueries: ['Posts'] });

  const cancel = (setFieldValue: (val: string, newVal: string) => void) => {
    return (event: React.MouseEvent) => {
      setShowRepostModal(false);
      setFieldValue('body', '');
      event.preventDefault();
    };
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

  const handleSubmit = async (values: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    const params: CreatePostInput = { body: values.body };

    params.repostId = repostId;

    await createPost({ variables: { input: params } });
    setEmojiPickerVisible(false);
    setShowRepostModal(false);
    resetForm();
  };

  useEffect(() => {
    setAnyModalOpened(showRepostModal);
  }, [showRepostModal]);

  return (
    <div
      className={classNames(baseClasses, {
        'translate-y-0 opacity-100': showRepostModal,
        'translate-y-full opacity-0': !showRepostModal,
      })}
    >
      <div className="w-screen h-20" onClick={() => setShowRepostModal(false)} />
      <Formik initialValues={initialValues} validationSchema={postSchema} onSubmit={handleSubmit}>
        {({ values, setFieldValue }) => (
          <Form className="flex flex-col max-height-from-menu">
            <div className="flex items-center rounded-tl-3xl rounded-tr-3xl bg-gray-30">
              <div className="p-2 text-gray-400 font-bold flex-1 text-center" onClick={cancel(setFieldValue)}>
                Cancel
              </div>
              <div className="flex-1 text-center text-white font-bold">Repost</div>
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
            />
            <div className="p-4 bg-gray-20">
              <RepostPreview postId={repostId} />
            </div>
            <div className="p-4 flex items-center bg-gray-25">
              <div className="text-center w-16" onClick={onEmojiPickerClick}>
                {isEmojiPickerVisible ? '❌' : '😃'}
              </div>
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
