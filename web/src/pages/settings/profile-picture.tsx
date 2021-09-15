import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { ImageUploadField } from 'components/ImageUploadField';
import { Label } from 'components/Label';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Form, Formik } from 'formik';
import { useMe } from 'hooks/useMe';
import { useUpdateProfilePictureMutation } from 'lib/graphql';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';
import * as yup from 'yup';

export interface ProfilePictureFormValues {
  profilePicture?: string | undefined;
}

const validationSchema: yup.SchemaOf<ProfilePictureFormValues> = yup.object().shape({
  profilePicture: yup.string(),
});

const topNavBarProps: TopNavBarProps = {
  title: 'Profile Picture',
  leftButton: <BackButton />,
};

export default function ProfilePicturePage() {
  const me = useMe();
  const router = useRouter();
  const fromSettings = Boolean(router.query.fromSettings);
  const initialFormValues: ProfilePictureFormValues = { profilePicture: '' };
  const [updateProfilePicture, { loading }] = useUpdateProfilePictureMutation();

  const onSubmit = async ({ profilePicture }: ProfilePictureFormValues) => {
    await updateProfilePicture({ variables: { input: { picture: profilePicture as string } } });
    router.push('/settings');
  };

  if (!me) return null;

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <Head>
        <title>Soundchain - Name Settings</title>
        <meta name="description" content="Name Settings" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
          <Form className="flex flex-1 flex-col space-y-6">
            <div className="flex-grow">
              <Label textSize="base">Custom Profile Photo:</Label>
              <ImageUploadField name="profilePicture" className="mt-4">
                Upload Profile Photo
              </ImageUploadField>
            </div>
            <div className="flex flex-col ">
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
                variant="outline"
                borderColor="bg-green-gradient"
                className="h-12"
              >
                {fromSettings ? 'Next' : 'Save'}
              </Button>
            </div>
          </Form>
        </Formik>
      </div>
    </Layout>
  );
}
