import { Form, Formik } from 'formik';
import { useRouter } from 'next/dist/client/router';
import React from 'react';
import { handleRegex } from 'utils/Validation';
import * as yup from 'yup';
import { UpdateSocialMediasInput, useUpdateSocialMediasMutation } from '../lib/graphql';
import { Button } from './Button';
import { InputField } from './InputField';

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
      <Form className="flex flex-col items-left space-y-6 w-full">
        <InputField type="text" name="twitter" placeholder="Twitter @username" />
        <InputField type="text" name="facebook" placeholder="Facebook @username" />
        <InputField type="text" name="instagram" placeholder="Instagram @username" />
        <InputField type="text" name="soundcloud" placeholder="SoundCloud @username" />
        {error && <p>{error.message}</p>}
        <Button type="submit" disabled={loading}>
          UPDATE PROFILE
        </Button>
      </Form>
    </Formik>
  );
};
