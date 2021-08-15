import classNames from 'classnames';
import { Button } from 'components/Button';
import { BaseEmoji, Picker } from 'emoji-mart';
import 'emoji-mart/css/emoji-mart.css';
import { Field, Form, Formik, FormikHelpers } from 'formik';
import { default as React, useState } from 'react';
import * as yup from 'yup';
import { useCreatePostMutation } from '../lib/graphql';
import { getNormalizedLink, hasLink } from '../utils/NormalizeEmbedLinks';

interface NewPostModalProps {
  setShowNewPost: (val: boolean) => void;
  showNewPost: boolean;
}

interface FormValues {
  body: string;
}

const postSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  body: yup.string().required(),
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
  const [isEmojiPickerVisible, setEmojiPickerVisible] = useState(false);
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
    await createPost({ variables: { input: values } });
    resetForm();
    setEmojiPickerVisible(false);
    setShowNewPost(false);
    setPostLink('');
  };

  const onEmojiClick = () => {
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

  const onTextareaChange = async (body: string) => {
    if (body.length && hasLink(body)) {
      setPostLink(await getNormalizedLink(body));
    } else {
      setPostLink('');
    }
  };

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
              validate={onTextareaChange(values.body)}
            />
            {postLink && <iframe className="w-full bg-gray-20" frameBorder="0" allowFullScreen src={postLink} />}
            <div className="p-4 flex items-center bg-gray-25">
              <div className="justify-self-start flex-1">
                <span onClick={onEmojiClick}>{isEmojiPickerVisible ? '❌' : '😃'}</span>
              </div>
              <div className="justify-self-end flex-1 text-right text-gray-400">
                {getBodyCharacterCount(values.body)} / {maxLength}
              </div>
              {isEmojiPickerVisible && (
                <div className="fixed left-12 bottom-0">
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
