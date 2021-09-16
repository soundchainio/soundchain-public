import { Badge } from 'components/Badge';
import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { DefaultCoverPictureSelector } from 'components/DefaultCoverPictureSelector';
import { ImageUploadField } from 'components/ImageUploadField';
import { Label } from 'components/Label';
import { Layout } from 'components/Layout';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import { Form, Formik } from 'formik';
import { useMe } from 'hooks/useMe';
import { useUpdateCoverPictureMutation } from 'lib/graphql';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { getRandomProfilePicture } from 'utils/DefaultPictures';
import * as yup from 'yup';

export interface CoverPictureFormValues {
  coverPicture?: string | undefined;
}

const validationSchema: yup.SchemaOf<CoverPictureFormValues> = yup.object().shape({
  coverPicture: yup.string(),
});

export default function CoverPicturePage() {
  const me = useMe();
  const router = useRouter();
  const newAccount = Boolean(router.query.newAccount);
  const initialFormValues: CoverPictureFormValues = { coverPicture: '' };
  const [updateCoverPicture, { loading }] = useUpdateCoverPictureMutation();
  const [defaultPicture, setDefaultPicture] = useState<string>();

  const onClose = () => {
    router.push('/');
  };

  const onSubmit = async ({ coverPicture }: CoverPictureFormValues) => {
    await updateCoverPicture({
      variables: {
        input: {
          picture: coverPicture
            ? (coverPicture as string)
            : defaultPicture
            ? defaultPicture
            : getRandomProfilePicture(),
        },
      },
    });
    if (newAccount) {
      router.push('/settings/favorite-genres?newAccount=true');
    } else {
      router.back();
    }
  };

  const onDefaultPicture = (picture: string) => {
    console.log(picture);
    setDefaultPicture(picture);
  };

  const topNavBarProps: TopNavBarProps = {
    title: 'Cover Picture',
    leftButton: <BackButton />,
    rightButton: newAccount ? <Badge label="Skip" onClick={onClose} selected={false} /> : undefined,
    subtitle: newAccount ? <StepProgressBar steps={3} actualStep={2} /> : undefined,
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
                <Label textSize="base">CUSTOM COVER PHOTO:</Label>
                <ImageUploadField name="coverPicture" className="mt-8">
                  Upload Cover Photo
                </ImageUploadField>
              </div>
              <div className="flex flex-col space-y-8">
                <Label textSize="base">DEFAULT COVER PHOTOS:</Label>
                <DefaultCoverPictureSelector onSelect={onDefaultPicture} />
              </div>
            </div>
            <div className="flex flex-col">
              <Button
                type="submit"
                loading={loading ? true : undefined}
                disabled={loading}
                variant="outline"
                borderColor={newAccount ? 'bg-blue-gradient' : 'bg-green-gradient'}
                className="h-12 mt-4"
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
