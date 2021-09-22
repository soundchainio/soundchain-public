import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { InputField } from 'components/InputField';
import { Label } from 'components/Label';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Form, Formik } from 'formik';
import { useMe } from 'hooks/useMe';
import { useUpdateProfileDisplayNameMutation } from 'lib/graphql';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';
import * as yup from 'yup';

interface FormValues {
  displayName: string | undefined;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  displayName: yup.string().min(3).max(255).required().label('Name'),
});

const topNavBarProps: TopNavBarProps = {
  title: 'Name',
  leftButton: <BackButton />,
};

export default function NamePage() {
  const me = useMe();
  const router = useRouter();
  const initialFormValues: FormValues = { displayName: me?.profile?.displayName };
  const [updateDisplayName, { loading }] = useUpdateProfileDisplayNameMutation();

  const onSubmit = async ({ displayName }: FormValues) => {
    await updateDisplayName({ variables: { input: { displayName: displayName as string } } });
    router.push('/settings');
  };

  if (!me) return null;

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <Head>
        <title>Soundchain - Edit Name</title>
        <meta name="description" content="Edit Name" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
          <Form className="flex flex-1 flex-col space-y-6">
            <div>
              <Label>First or full name</Label>
              <InputField type="text" name="displayName" placeholder="Name" />
            </div>
            <p className="text-gray-50 flex-grow"> This will be displayed publically to other users. </p>
            <div className="flex flex-col">
              <Button
                type="submit"
                disabled={loading}
                variant="outline"
                borderColor="bg-green-gradient"
                className="h-12"
              >
                SAVE
              </Button>
            </div>
          </Form>
        </Formik>
      </div>
    </Layout>
  );
}
