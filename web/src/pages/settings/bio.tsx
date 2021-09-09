import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { InputField } from 'components/InputField';
import { Label } from 'components/Label';
import { Layout } from 'components/Layout';
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
  bio: yup.string().min(3).max(255).required().label('Name'),
});

const topNavBarProps: TopNavBarProps = {
  title: 'Bio',
  leftButton: <BackButton />,
};

export default function SettingsBioPage() {
  const me = useMe();
  const router = useRouter();
  const initialFormValues: SetupProfileBioFormValues = { bio: me?.profile?.bio };
  const [updateBio, { loading }] = useUpdateProfileBioMutation();

  const onSubmit = async ({ bio }: SetupProfileBioFormValues) => {
    await updateBio({ variables: { input: { bio: bio as string } } });
    router.push('/settings');
  };

  if (!me) return null;

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain - Bio Settings</title>
        <meta name="description" content="Name Settings" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
          <Form className="flex flex-1 flex-col space-y-6">
            <div>
              <Label>First or full name</Label>
              <InputField type="text" name="bio" placeholder="Add a bio..." />
            </div>
            <p className="text-gray-50"> This will be displayed publically to other users. </p>
            <div className="flex flex-col">
              <Button type="submit">{loading ? 'Saving...' : 'Save'}</Button>
            </div>
          </Form>
        </Formik>
      </div>
    </Layout>
  );
}
