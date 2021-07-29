import { ErrorMessage, Field, Form, Formik } from 'formik';
import { useRouter } from 'next/dist/client/router';
import React from 'react';
import * as yup from 'yup';
import { SocialMedia, SocialMediaName, useUpdateProfileMutation } from '../lib/graphql';

export interface ProfileFormProps {
  twitter: string | undefined;
  facebook: string | undefined;
  instagram: string | undefined;
}

const validationSchema: yup.SchemaOf<ProfileFormProps> = yup.object().shape({
  twitter: yup
    .string()
    .matches(
      /(?:https?:)?\/\/(?:www\.)?twitter\.com\/@?(?!home|share|privacy|tos)([A-z0-9_]+)\/?/,
      'Invalid Twitter profile link',
    ),
  facebook: yup
    .string()
    .matches(
      /(?:https?:)?\/\/(?:www\.)?(?:facebook|fb)\.com\/((?![A-z]+\.php)(?!marketplace|gaming|watch|me|messages|help|search|groups)[A-z0-9_\-\.]+)\/?/,
      'Invalid Facebook profile link',
    ),
  instagram: yup
    .string()
    .matches(
      /(?:https?:)?\/\/(?:www\.)?(?:instagram\.com|instagr\.am)\/([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)/,
      'Invalid Instagram link',
    ),
});

export const ProfileForm = ({ twitter, facebook, instagram }: ProfileFormProps) => {
  const router = useRouter();
  const [updateProfile, { loading, error }] = useUpdateProfileMutation({ refetchQueries: ['MyProfile'] });
  const initialFormValues = {
    twitter,
    facebook,
    instagram,
  };

  const getSocialMediaLiks = (values: ProfileFormProps): SocialMedia[] => {
    const { twitter, facebook, instagram } = values;
    const socialMediaLinks: SocialMedia[] = [];
    if (twitter) socialMediaLinks.push({ name: SocialMediaName.Twitter, link: twitter });
    if (facebook) socialMediaLinks.push({ name: SocialMediaName.Facebook, link: facebook });
    if (instagram) socialMediaLinks.push({ name: SocialMediaName.Instagram, link: instagram });
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
          <span className="mr-1">Twitter</span>
          <Field type="text" name="twitter" />
          <ErrorMessage name="twitter" component="div" />
        </div>
        <div className="flex flex-col">
          <span className="mr-1">Facebook</span>
          <Field type="text" name="facebook" />
          <ErrorMessage name="facebook" component="div" />
        </div>
        <div className="flex flex-col">
          <span className="mr-1">Instagram</span>
          <Field type="text" name="instagram" />
          <ErrorMessage name="instagram" component="div" />
        </div>
        {error && <p>{error.message}</p>}
        <button type="submit" disabled={loading} className="p-3 border-2 w-full">
          Update profile
        </button>
      </Form>
    </Formik>
  );
};
