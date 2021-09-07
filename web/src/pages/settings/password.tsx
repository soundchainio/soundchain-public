import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { InputField } from 'components/InputField';
import { Label } from 'components/Label';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Form, Formik } from 'formik';
import { useMe } from 'hooks/useMe';
import { useUpdatePasswordMutation } from 'lib/graphql';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';
import * as yup from 'yup';
import { LockClosedIcon } from '@heroicons/react/solid';

export interface PasswordFormValues {
  password: string | undefined;
  passwordConfirmation: string | undefined;
}

const validationSchema: yup.SchemaOf<PasswordFormValues> = yup.object().shape({
  password: yup.string().min(8).required().label('Password'),
  passwordConfirmation: yup
    .string()
    .required()
    .test('passwords-match', 'Passwords must match', function (value) {
      return this.parent.password === value;
    })
    .label('Password confirmation'),
});

const topNavBarProps: TopNavBarProps = {
  leftButton: BackButton,
};

export default function SettingsUsernamePage() {
  const me = useMe();
  const router = useRouter();
  const initialFormValues: PasswordFormValues = { password: '', passwordConfirmation: '' };
  const [updatePassword, { loading }] = useUpdatePasswordMutation();

  const onSubmit = async ({ password }: PasswordFormValues) => {
    await updatePassword({ variables: { input: { password: password as string } } });
    router.push('/settings');
  };

  if (!me) return null;

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain - Password Settings</title>
        <meta name="description" content="Password Settings" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
          <Form className="flex flex-1 flex-col space-y-6">
            <div>
              <Label>Password</Label>
              <InputField type="password" name="password" icon={LockClosedIcon} />
            </div>
            <div>
              <Label>Confirm Password</Label>
              <InputField type="password" name="passwordConfirmation" icon={LockClosedIcon} />
            </div>
            <p className="text-gray-50">
              Must be at least 8 characters
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
