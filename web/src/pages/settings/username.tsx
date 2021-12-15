import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { InputField } from 'components/InputField';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Form, Formik, FormikHelpers } from 'formik';
import { useMe } from 'hooks/useMe';
import { useUpdateHandleMutation } from 'lib/graphql';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';
import { formatValidationErrors } from 'utils/errorHelpers';
import { handleRegex } from 'utils/Validation';
import * as yup from 'yup';

interface FormValues {
  handle: string | undefined;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
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
  const initialFormValues: FormValues = { handle: me?.handle };
  const [updateHandle, { loading }] = useUpdateHandleMutation();

  const onSubmit = async ({ handle }: FormValues, { setErrors }: FormikHelpers<FormValues>) => {
    try {
      await updateHandle({ variables: { input: { handle: handle as string } } });
      router.push('/settings');
    } catch (error) {
      const formatted = formatValidationErrors<FormValues>(error.graphQLErrors[0]);
      setErrors(formatted);
    }
  };

  if (!me) return null;

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <Head>
        <title>Soundchain - Name Settings</title>
        <meta name="description" content="Name Settings" />
        <link rel="icon" href="/favicons/favicon.ico" />
      </Head>
      <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
          <Form className="flex flex-1 flex-col space-y-6">
            <div>
              <InputField label="Username" type="text" name="handle" placeholder="Username" />
            </div>
            <p className="text-gray-50 flex-grow">
              Usernames can only have letters and numbers and can be a max of 10 characters.
            </p>
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
