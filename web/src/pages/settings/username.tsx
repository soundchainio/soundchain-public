import { Form, Formik } from 'formik';
import React, { useState } from 'react';
import * as yup from 'yup';
import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import { Label } from 'components/Label';
import { Layout } from 'components/Layout';
import { useMe } from 'hooks/useMe';
import Head from 'next/head';
import { TopNavBarProps } from 'components/TopNavBar';
import { BackButton } from 'components/Buttons/BackButton';
import { useUpdateHandleMutation, useUpdateProfileDisplayNameMutation } from 'lib/graphql';
import { useRouter } from 'next/router';
import { handleRegex } from 'utils/Validation';

export interface SetupProfileFormValues {
  profilePicture?: string;
  coverPicture?: string;
  displayName: string;
  handle: string;
}

const validationSchema: yup.SchemaOf<SetupProfileFormValues> = yup.object().shape({
  handle: yup
    .string()
    .min(1)
    .max(32)
    .matches(handleRegex, 'Invalid characters. Only letters and numbers are accepted.')
    .required()
    .label('Username'),
});

const topNovaBarProps: TopNavBarProps = {
  leftButton: BackButton,
};

export default function SettingsUsernamePage() {
  const me = useMe()
  console.log({me})
  const router = useRouter()
  const initialFormValues = { handle: me?.handle };
  const [updateHandle] = useUpdateHandleMutation()
  const [loading, setLoading] = useState(false)

  const onSubmit = async ({ handle }: any) => {
    setLoading(true)
    await updateHandle({ variables: { input: { handle } } });
    setLoading(false)
    router.push('/settings')
  }

  if (!me) return null

  return (
    <Layout topNavBarProps={topNovaBarProps}>
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
              <InputField
                type="text"
                name="handle"
                placeholder="Username"
              />
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
  )
}
