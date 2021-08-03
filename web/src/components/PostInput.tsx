import { BaseEmoji, Picker } from 'emoji-mart';
import 'emoji-mart/css/emoji-mart.css';
import { ErrorMessage, Field, Form, Formik, FormikHelpers } from 'formik';
import React, { useState } from 'react';
import * as yup from 'yup';
import { useCreatePostMutation } from '../lib/graphql';
import Button from './Button';

interface FormValues {
  body: string;
}

const postSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  body: yup.string().required().max(160),
});

export const PostInput = () => {
  const [isEmojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [createPost, { loading, error }] = useCreatePostMutation({ refetchQueries: ['Posts'] });

  const handleSubmit = (values: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    setEmojiPickerVisible(false);
    createPost({ variables: { input: values } }).then(() => resetForm());
  };

  return (
    <>
      <Formik initialValues={{ body: '' }} validationSchema={postSchema} onSubmit={handleSubmit}>
        {({ values, setFieldValue }) => (
          <Form className="flex flex-col">
            <Field
              component="textarea"
              name="body"
              className="w-full h-24 resize-none"
              placeholder="Share your opinion"
            />

            <div className="relative mt-4 flex justify-end">
              <ErrorMessage name="body" className="flex-1" />
              {error && <p className="flex-1">{error.message}</p>}

              <Button onClick={() => setEmojiPickerVisible(!isEmojiPickerVisible)}>
                {isEmojiPickerVisible ? 'Close' : 'Emoji'}
              </Button>

              <Button type="submit" disabled={loading} className="ml-4">
                Share
              </Button>

              {isEmojiPickerVisible && (
                <div className="absolute right-0 top-14">
                  <Picker onSelect={(emoji: BaseEmoji) => setFieldValue('body', `${values.body}${emoji.native}`)} />
                </div>
              )}
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
};
