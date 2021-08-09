import { Button } from 'components/Button';
import { BaseEmoji, Picker } from 'emoji-mart';
import 'emoji-mart/css/emoji-mart.css';
import { Field, Form, Formik, FormikHelpers } from 'formik';
import { default as React, useState } from 'react';
import * as yup from 'yup';
import { useCreatePostMutation } from '../lib/graphql';

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

// When we get string.length, emojis are counted as 2 characters
// This functions fixes the input maxLength and adjust to count an emoji as 1 char
const setMaxInputLength = (input: string) => {
  const rawValue = input.length;
  const treatedValue = input.match(/./gu)?.length || 0;

  return maxLength + (rawValue - treatedValue);
};

export const NewPostModal = ({ setShowNewPost, showNewPost }: NewPostModalProps) => {
  const [isEmojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [createPost] = useCreatePostMutation({ refetchQueries: ['Posts'] });

  const cancel = () => {
    setShowNewPost(false);
  };

  const handleSubmit = async (values: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    await createPost({ variables: { input: values } });
    resetForm();
    setEmojiPickerVisible(false);
    setShowNewPost(false);
  };

  const handleSelectEmoji = (emoji: BaseEmoji, values: any, setFieldValue: (val: string, newVal: string) => void) => {
    if ((values.body.match(/./gu)?.length || 0) < maxLength) {
      setFieldValue('body', `${values.body}${emoji.native}`);
    }
  };

  return (
    <div className={`${baseClasses} ${showNewPost ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
      <div className="w-screen h-20" onClick={() => setShowNewPost(false)} />
      <Formik initialValues={{ body: '' }} validationSchema={postSchema} onSubmit={handleSubmit}>
        {({ values, setFieldValue }) => (
          <Form className="flex flex-col max-height-from-menu">
            <div className="flex items-center rounded-tl-3xl rounded-tr-3xl bg-gray-30">
              <div className="p-2 text-gray-400 font-bold flex-1 text-center" onClick={cancel}>
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
            <div className="p-4 flex items-center bg-gray-25">
              <div className="justify-self-start flex-1">
                <span onClick={() => setEmojiPickerVisible(!isEmojiPickerVisible)}>
                  {isEmojiPickerVisible ? '❌' : '😃'}
                </span>
              </div>
              <div className="justify-self-end flex-1 text-right text-gray-400">
                {values.body.match(/./gu)?.length || 0} / {maxLength}
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
