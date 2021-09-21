import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { Label } from 'components/Label';
import { Layout } from 'components/Layout';
import { getBodyCharacterCount } from 'components/NewPostModal';
import { TextareaField } from 'components/TextareaField';
import { TopNavBarProps } from 'components/TopNavBar';
import { Form, Formik } from 'formik';
import { useMe } from 'hooks/useMe';
import { useUpdateProfileBioMutation } from 'lib/graphql';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';
import * as yup from 'yup';

export interface SetupProfileBioFormValues {
  bio: string | undefined;
}

const validationSchema: yup.SchemaOf<SetupProfileBioFormValues> = yup.object().shape({
  bio: yup.string().label('Bio'),
});

const topNavBarProps: TopNavBarProps = {
  title: 'Bio',
  leftButton: <BackButton />,
};

export const maxBioLength = 120;

export const setMaxInputLength = (input: string) => {
  const rawValue = input.length;

  return maxBioLength + (rawValue - getBodyCharacterCount(input));
};

export default function EditBioPage() {
  const me = useMe();
  const router = useRouter();
  const initialFormValues: SetupProfileBioFormValues = { bio: me?.profile?.bio || '' };
  const [updateBio, { loading }] = useUpdateProfileBioMutation();

  const onSubmit = async ({ bio }: SetupProfileBioFormValues) => {
    await updateBio({ variables: { input: { bio: bio as string } } });
    router.push('/settings');
  };

  if (!me) return null;

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <Head>
        <title>Soundchain - Bio</title>
        <meta name="description" content="Name Settings" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
          {({ values }) => (
            <Form className="flex flex-1 flex-col space-y-6">
              <div>
                <Label>Bio</Label>
                <TextareaField name="bio" placeholder="Add a bio..." maxLength={setMaxInputLength(values.bio || '')} />
              </div>
              <p className="text-gray-50 text-right flex-grow">
                {' '}
                {`${getBodyCharacterCount(values.bio || '')} / ${maxBioLength}`}{' '}
              </p>
              <div className="flex flex-col">
                <Button
                  type="submit"
                  loading={loading}
                  disabled={loading}
                  variant="outline"
                  borderColor="bg-green-gradient"
                  className="h-12"
                >
                  SAVE
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </Layout>
  );
}
