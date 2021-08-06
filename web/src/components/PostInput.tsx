import { BaseEmoji, Picker } from 'emoji-mart';
import 'emoji-mart/css/emoji-mart.css';
import { ErrorMessage, Field, Form, Formik } from 'formik';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import * as yup from 'yup';
import { useCreatePostMutation } from '../lib/graphql';
import { Button } from './Button';

interface FormValues {
  body: string;
}

const postSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  body: yup.string().required().max(160),
});

export const PostInput = () => {
  const router = useRouter();
  const [isEmojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [createPost, { loading, error }] = useCreatePostMutation({ refetchQueries: ['Posts'] });

  const handleSubmit = async (values: FormValues) => {
    setEmojiPickerVisible(false);
    await createPost({ variables: { input: values } });
    router.push('/');
  };

  return (
    <Formik initialValues={{ body: '' }} validationSchema={postSchema} onSubmit={handleSubmit}>
      {({ values, setFieldValue }) => (
        <Form className="flex flex-col flex-1">
          <Field
            component="textarea"
            name="body"
            className="w-full h-24 resize-none border-0 bg-custom-black-10 text-white"
            placeholder="What's happening?"
          />
          <div className="relative mt-4 flex justify-end mb-auto">
            <ErrorMessage name="body" className="flex-1" />
            {error && <p className="flex-1">{error.message}</p>}

            <Button onClick={() => setEmojiPickerVisible(!isEmojiPickerVisible)} className="w-24" variant="raibow-xs">
              {isEmojiPickerVisible ? 'Close' : 'Emoji'}
            </Button>
            {isEmojiPickerVisible && (
              <div className="absolute right-0 top-14">
                <Picker
                  onSelect={(emoji: BaseEmoji) => setFieldValue('body', `${values.body}${emoji.native}`)}
                  theme="dark"
                />
              </div>
            )}
          </div>
          <Button type="submit" disabled={loading}>
            Share
          </Button>
        </Form>
      )}
    </Formik>
  );
};
