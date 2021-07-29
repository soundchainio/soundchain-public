import { ErrorMessage, Field, Form, Formik } from 'formik';
import { useRouter } from 'next/dist/client/router';
import React from 'react';
import * as yup from 'yup';
import { SocialMedia, SocialMediaName, useUpdateProfileMutation } from '../lib/graphql';

interface FormValues {
  twitter: string | undefined;
  facebook: string | undefined;
  instagram: string | undefined;
}
const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  twitter: yup
    .string()
    .matches(
      /(?:https?:)?\/\/(?:[A-z]+\.)?twitter\.com\/@?(?!home|share|privacy|tos)([A-z0-9_]+)\/?/,
      'Invalid twitter profile link',
    ),
  facebook: yup
    .string()
    .matches(
      /(?:https?:)?\/\/(?:www\.)?(?:facebook|fb)\.com\/((?![A-z]+\.php)(?!marketplace|gaming|watch|me|messages|help|search|groups)[A-z0-9_\-\.]+)\/?/,
      'Invalid facebook profile link',
    ),
  instagram: yup
    .string()
    .matches(
      /(?:https?:)?\/\/(?:www\.)?(?:instagram\.com|instagr\.am)\/([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)/,
      'Invalid instagram link',
    ),
});

export const ProfileForm = () => {
  const router = useRouter();
  const [updateProfile, { loading, error }] = useUpdateProfileMutation();
  const initialFormValues = { twitter: '', facebook: '', instagram: '' };

  const getSocialMediaLiks = (values: FormValues): SocialMedia[] => {
    const { twitter, facebook, instagram } = values;
    const socialMediaLinks: SocialMedia[] = [];
    if (twitter) socialMediaLinks.push({ name: SocialMediaName.Twitter, link: twitter });
    if (facebook) socialMediaLinks.push({ name: SocialMediaName.Facebook, link: facebook });
    if (instagram) socialMediaLinks.push({ name: SocialMediaName.Instagram, link: instagram });
    return socialMediaLinks;
  };

  const handleSubmit = async (values: FormValues) => {
    const socialMediaLinks = getSocialMediaLiks(values);
    try {
      await updateProfile({ variables: { input: { socialMediaLinks } } });
      router.push('/');
    } catch (error) {}
  };

  return (
    <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
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
