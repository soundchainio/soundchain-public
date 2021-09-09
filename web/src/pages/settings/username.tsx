import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { InputField } from 'components/InputField';
import { Label } from 'components/Label';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Form, Formik } from 'formik';
import { useMe } from 'hooks/useMe';
import { useUpdateHandleMutation } from 'lib/graphql';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';
import { handleRegex } from 'utils/Validation';
import * as yup from 'yup';

export interface SetupProfileHandleFormValues {
  handle: string | undefined;
}

const validationSchema: yup.SchemaOf<SetupProfileHandleFormValues> = yup.object().shape({
  handle: yup
    .string()
    .min(1)
    .max(32)
    .matches(handleRegex, 'Invalid characters. Only letters and numbers are accepted.')
    .required()
    .label('Username'),
});

const topNavBarProps: TopNavBarProps = {
  title: 'Username',
  leftButton: <BackButton />,
};

export default function SettingsUsernamePage() {
  const me = useMe();
  const router = useRouter();
  const initialFormValues: SetupProfileHandleFormValues = { handle: me?.handle };
  const [updateHandle, { loading }] = useUpdateHandleMutation();

  const onSubmit = async ({ handle }: SetupProfileHandleFormValues) => {
    await updateHandle({ variables: { input: { handle: handle as string } } });
    router.push('/settings');
  };

  if (!me) return null;

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain - Name Settings</title>
        <meta name="description" content="Name Settings" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
          <Form className="flex flex-1 flex-col space-y-6">
            <div>
              <Label>Username</Label>
              <InputField type="text" name="handle" placeholder="Username" />
            </div>
            <p className="text-gray-50">
              Usernames can only have letters and numbers and can be a max of 10 characters.
            </p>
            <div className="flex flex-col">
              <Button type="submit">{loading ? 'Saving...' : 'Save'}</Button>
            </div>
          </Form>
        </Formik>
      </div>
    </Layout>
  );
}
