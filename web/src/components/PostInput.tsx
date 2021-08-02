import { ErrorMessage, Field, Form, Formik } from 'formik';
import { BaseEmoji, Picker } from 'emoji-mart';
import 'emoji-mart/css/emoji-mart.css';
import React, { useState } from 'react';
import { useAddPostMutation } from '../lib/graphql';
import * as yup from 'yup';
interface PostFormValues {
  body: string;
}

const postSchema: yup.SchemaOf<PostFormValues> = yup.object().shape({
  body: yup.string().required().max(160),
});

export const PostInput = () => {
  const [text, setText] = useState('');
  const [isEmojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [addPost, { loading, error }] = useAddPostMutation({ refetchQueries: ['Posts'] });

  const handleSubmit = ({ body }: PostFormValues) => {
    addPost({ variables: { input: { body } } }).then(() => {
      setText('');
    });
  };

  return (
    <>
      <div className="border-2 rounded w-8/12 mt-24">
        <Formik initialValues={{ body: '' }} validationSchema={postSchema} onSubmit={handleSubmit}>
          <Form className="w-full">
            <div className="w-full">
              <Field
                component="textarea"
                id="body"
                name="body"
                className="w-full rounded-lg border-2 border-gray-50 h-24 resize-none p-1"
                placeholder="Share your opinion"
              />
              <ErrorMessage name="body" component="div" />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
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
          </Form>
        </Formik>
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
