import { ErrorMessage, Field, Form, Formik } from 'formik';
import { useRouter } from 'next/dist/client/router';
import React from 'react';
import { handleRegex } from 'utils/Validation';
import * as yup from 'yup';
import { UpdateSocialMediasInput, useUpdateSocialMediasMutation } from '../lib/graphql';

export interface ProfileFormProps {
  twitter: string;
  facebook: string;
  instagram: string;
  soundcloud: string;
}

const validationSchema: yup.SchemaOf<ProfileFormProps> = yup.object().shape({
  twitter: yup.string().default('').max(100).matches(handleRegex, 'Invalid Twitter username'),
  facebook: yup.string().default('').max(100).matches(handleRegex, 'Invalid Facebook username'),
  instagram: yup.string().default('').max(100).matches(handleRegex, 'Invalid Instagram username'),
  soundcloud: yup.string().default('').max(100).matches(handleRegex, 'Invalid Soundcloud username'),
});

export const ProfileForm = ({ twitter, facebook, instagram, soundcloud }: ProfileFormProps) => {
  const router = useRouter();
  const [updateSocialMedias, { loading, error }] = useUpdateSocialMediasMutation();
  const initialFormValues = {
    twitter,
    facebook,
    instagram,
    soundcloud,
  };

  const handleSubmit = async (values: ProfileFormProps) => {
    const { twitter, facebook, instagram, soundcloud } = values;
    const input: UpdateSocialMediasInput = {};
    if (twitter) input.twitter = twitter;
    if (facebook) input.facebook = facebook;
    if (instagram) input.instagram = instagram;
    if (soundcloud) input.soundcloud = soundcloud;
    try {
      await updateSocialMedias({ variables: { input } });
      router.push('/');
    } catch (error) {}
  };

  return (
    <Formik
      initialValues={initialFormValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      <Form className="flex flex-col items-left space-y-6 w-full px-6">
        <div className="flex flex-col">
          <span className="mr-1">Twitter @username</span>
          <Field type="text" name="twitter" />
          <ErrorMessage name="twitter" component="div" />
        </div>
        <div className="flex flex-col">
          <span className="mr-1">Facebook @username</span>
          <Field type="text" name="facebook" />
          <ErrorMessage name="facebook" component="div" />
        </div>
        <div className="flex flex-col">
          <span className="mr-1">Instagram @username</span>
          <Field type="text" name="instagram" />
          <ErrorMessage name="instagram" component="div" />
        </div>
        <div className="flex flex-col">
          <span className="mr-1">Soundcloud @username</span>
          <Field type="text" name="soundcloud" />
          <ErrorMessage name="soundcloud" component="div" />
        </div>
        {error && <p>{error.message}</p>}
        <button type="submit" disabled={loading} className="p-3 border-2 w-full">
          Update profile
        </button>
      </Form>
    </Formik>
  );
};
