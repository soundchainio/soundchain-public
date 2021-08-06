import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import { LockedLayout } from 'components/LockedLayout';
import { Title } from 'components/Title';
import { Form, Formik, FormikHelpers } from 'formik';
import Head from 'next/head';
import * as yup from 'yup';
import { useForgotPasswordMutation } from '../lib/graphql';

interface FormValues {
  email: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  email: yup.string().email().required(),
});

export default function ForgotPasswordPage() {
  const [forgotPassword, { data, loading, error }] = useForgotPasswordMutation();
  const handleSubmit = async ({ email }: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    await forgotPassword({ variables: { input: { email } } });
    resetForm();
  };

  return (
    <LockedLayout>
      <Head>
        <title>Soundchain - Forgot Password</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Title>Forgot Password</Title>
      <Formik initialValues={{ email: '' }} validationSchema={validationSchema} onSubmit={handleSubmit}>
        <Form className="flex flex-1 flex-col">
          <div className="space-y-6 mb-auto mt-6">
            <div className={error ? 'text-green-500' : 'text-gray-400'}>
              {data && 'An email with a link to reset your password has been sent to you'}
              {error && error.message}
            </div>
            <InputField type="email" name="email" placeholder="Enter your email" />
          </div>
          <Button type="submit" disabled={loading}>
            Reset Password
          </Button>
        </Form>
      </Formik>
    </LockedLayout>
  );
}
