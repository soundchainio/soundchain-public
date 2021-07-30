import { ErrorMessage, Field, Form, Formik } from 'formik';
import { useRouter } from 'next/dist/client/router';
import React from 'react';
import * as yup from 'yup';
import { SocialMedia, SocialMediaName, useUpdateProfileMutation } from '../lib/graphql';

const handleRegex = /[A-z0-9_\-\.]/;

export interface ProfileFormProps {
  twitter: string | undefined;
  facebook: string | undefined;
  instagram: string | undefined;
  soundcloud: string | undefined;
}

const validationSchema: yup.SchemaOf<ProfileFormProps> = yup.object().shape({
  twitter: yup.string().matches(handleRegex, 'Invalid Twitter username'),
  facebook: yup.string().matches(handleRegex, 'Invalid Facebook username'),
  instagram: yup.string().matches(handleRegex, 'Invalid Instagram username'),
  soundcloud: yup.string().matches(handleRegex, 'Invalid Soundcloud username'),
});

export const ProfileForm = ({ twitter, facebook, instagram, soundcloud }: ProfileFormProps) => {
  const router = useRouter();
  const [updateProfile, { loading, error }] = useUpdateProfileMutation({ refetchQueries: ['MyProfile'] });
  const initialFormValues = {
    twitter,
    facebook,
    instagram,
    soundcloud,
  };

  const getSocialMediaLiks = (values: ProfileFormProps): SocialMedia[] => {
    const { twitter, facebook, instagram, soundcloud } = values;
    const socialMediaLinks: SocialMedia[] = [];
    if (twitter) socialMediaLinks.push({ name: SocialMediaName.Twitter, handle: twitter });
    if (facebook) socialMediaLinks.push({ name: SocialMediaName.Facebook, handle: facebook });
    if (instagram) socialMediaLinks.push({ name: SocialMediaName.Instagram, handle: instagram });
    if (soundcloud) socialMediaLinks.push({ name: SocialMediaName.Soundcloud, handle: soundcloud });
    return socialMediaLinks;
  };

  const handleSubmit = async (values: ProfileFormProps) => {
    const socialMediaLinks = getSocialMediaLiks(values);
    try {
      await updateProfile({ variables: { input: { socialMediaLinks } } });
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
