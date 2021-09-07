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
import { useUpdateProfileDisplayNameMutation } from 'lib/graphql';
import { useRouter } from 'next/router';

export interface SetupProfileFormValues {
  profilePicture?: string;
  coverPicture?: string;
  displayName: string;
  handle: string;
}

const validationSchema: yup.SchemaOf<SetupProfileFormValues> = yup.object().shape({
  displayName: yup.string().min(3).max(255).required().label('Name'),
});

const topNovaBarProps: TopNavBarProps = {
  leftButton: BackButton,
};

export default function SettingsNamePage() {
  const me = useMe()
  const router = useRouter()
  const initialFormValues = { displayName: me?.profile?.displayName };
  const [updateDisplayName] = useUpdateProfileDisplayNameMutation()
  const [loading, setLoading] = useState(false)

  const onSubmit = async ({ displayName }: any) => {
    setLoading(true)
    await updateDisplayName({ variables: { input: { displayName } } });
    setLoading(false)
    router.push('/settings')
  }

  if(!me) return null

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
              <Label>First or full name.</Label>
              <InputField
                type="text"
                name="displayName"
                placeholder="Name"
              />
            </div>
            <p className="text-gray-50"> This will be displayed publically to other users. </p>
            <div className="flex flex-col">
              <Button type="submit">{loading ? 'Saving...' : 'Save'}</Button>
            </div>
          </Form>
        </Formik>
      </div>
    </Layout>
  )
}
