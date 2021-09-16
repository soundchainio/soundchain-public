import { Badge } from 'components/Badge';
import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { DefaultProfilePictureSelector } from 'components/DefaultProfilePictureSelector';
import { ImageUploadField } from 'components/ImageUploadField';
import { Label } from 'components/Label';
import { Layout } from 'components/Layout';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import { Form, Formik } from 'formik';
import { useMe } from 'hooks/useMe';
import { useUpdateProfilePictureMutation } from 'lib/graphql';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { getRandomProfilePicture } from 'utils/DefaultPictures';
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
  const [defaultPicture, setDefaultPicture] = useState<string>();

  const onClose = () => {
    router.push('/');
  };

  const onSubmit = async ({ profilePicture }: ProfilePictureFormValues) => {
    if (!newAccount && !profilePicture && !defaultPicture) return router.back();
    await updateProfilePicture({
      variables: {
        input: {
          picture: profilePicture
            ? (profilePicture as string)
            : defaultPicture
            ? defaultPicture
            : getRandomProfilePicture(),
        },
      },
    });
    if (newAccount) {
      router.push('/settings/cover-picture?newAccount=true');
    } else {
      router.back();
    }
  };

  const onDefaultPicture = (picture: string) => {
    setDefaultPicture(picture);
  };

  const topNavBarProps: TopNavBarProps = {
    title: 'Profile Picture',
    leftButton: newAccount ? (
      <div className="text-gray-400 font-bold flex-1 text-left" onClick={onClose}>
        Cancel
      </div>
    ) : (
      <BackButton />
    ),
    rightButton: newAccount ? <Badge label="Skip" onClick={onClose} selected={false} /> : undefined,
    subtitle: newAccount ? <StepProgressBar steps={3} actualStep={1} /> : undefined,
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
                <ImageUploadField name="profilePicture" className="mt-8" rounded>
                  Upload Profile Photo
                </ImageUploadField>
              </div>
              <div className="flex flex-col space-y-8">
                <Label textSize="base">Default Profile Photos:</Label>
                <DefaultProfilePictureSelector onSelect={onDefaultPicture} />
              </div>
            </div>
            <div className="flex flex-col">
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
                variant="outline"
                borderColor={newAccount ? 'bg-blue-gradient' : 'bg-green-gradient'}
                className="h-12"
              >
                {newAccount ? 'NEXT' : 'SAVE'}
              </Button>
            </div>
          </Form>
        </Formik>
      </div>
    </Layout>
  );
}
