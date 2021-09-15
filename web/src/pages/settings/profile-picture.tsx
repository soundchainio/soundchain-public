import { Badge } from 'components/Badge';
import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { DefaultProfilePictureSelector } from 'components/DefaultProfilePictureSelector';
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

export default function ProfilePicturePage() {
  const me = useMe();
  const router = useRouter();
  const newAccount = Boolean(router.query.newAccount);
  const initialFormValues: ProfilePictureFormValues = { profilePicture: '' };
  const [updateProfilePicture, { loading }] = useUpdateProfilePictureMutation();

  const onClose = () => {
    router.push('/');
  };

  const onSubmit = async ({ profilePicture }: ProfilePictureFormValues) => {
    await updateProfilePicture({ variables: { input: { picture: profilePicture as string } } });
    router.push('/settings');
  };

  const topNavBarProps: TopNavBarProps = {
    title: 'Profile Picture',
    leftButton: newAccount ? (
      <div className="p-2 text-gray-400 font-bold flex-1 text-left" onClick={onClose}>
        Cancel
      </div>
    ) : (
      <BackButton />
    ),
    rightButton: newAccount ? <Badge label="Skip" onClick={onClose} selected={false} /> : undefined,
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
          <Form className="flex flex-1 flex-col">
            <div className="flex-grow space-y-8">
              <div className="flex flex-col">
                <Label textSize="base">Custom Profile Photo:</Label>
                <ImageUploadField name="profilePicture" className="mt-8">
                  Upload Profile Photo
                </ImageUploadField>
              </div>
              <div className="flex flex-col space-y-8">
                <Label textSize="base">Default Profile Photos:</Label>
                <DefaultProfilePictureSelector onSelect={picture => console.log(picture)} />
              </div>
            </div>
            <div className="flex flex-col">
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
                variant="outline"
                borderColor="bg-green-gradient"
                className="h-12"
              >
                {newAccount ? 'Next' : 'Save'}
              </Button>
            </div>
          </Form>
        </Formik>
      </div>
    </Layout>
  );
}
