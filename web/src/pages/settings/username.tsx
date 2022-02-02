/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { InputField } from 'components/InputField';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { Form, Formik, FormikHelpers } from 'formik';
import { useMe } from 'hooks/useMe';
import { useUpdateHandleMutation } from 'lib/graphql';
import { useRouter } from 'next/router';
import { HANDLE_MAX_CHARS } from 'pages/create-account';
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
    .max(HANDLE_MAX_CHARS)
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
    } catch (error: any) {
      const formatted = formatValidationErrors<FormValues>(error.graphQLErrors[0]);
      setErrors(formatted);
    }
  };

  if (!me) return null;

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <SEO
        title="Name Settings | SoundChain"
        canonicalUrl="/settings/username/"
        description="SoundChain Name Settings"
      />
      <div className="min-h-full flex flex-col px-6 lg:px-8 py-6">
        <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
          <Form className="flex flex-1 flex-col space-y-6">
            <div>
              <InputField
                label="Username"
                type="text"
                name="handle"
                placeholder="Username"
                maxLength={HANDLE_MAX_CHARS}
              />
            </div>
            <p className="text-gray-50 flex-grow">
              Usernames can only have letters and numbers and can be a max of {HANDLE_MAX_CHARS} characters.
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
