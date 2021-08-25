import { AuthLayout } from 'components/AuthLayout';
import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import { Title } from 'components/Title';
import { Form, Formik, FormikHelpers } from 'formik';
import { cacheFor } from 'lib/apollo';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import * as yup from 'yup';
import { useForgotPasswordMutation } from '../lib/graphql';

interface FormValues {
  email: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  email: yup.string().email().required(),
});

export const getServerSideProps: GetServerSideProps = context => {
  return cacheFor(ForgotPasswordPage, {}, context);
};

export default function ForgotPasswordPage() {
  const [forgotPassword, { data, loading, error }] = useForgotPasswordMutation();
  const handleSubmit = async ({ email }: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    await forgotPassword({ variables: { input: { email } } });
    resetForm();
  };

  return (
    <AuthLayout>
      <Head>
        <title>Soundchain - Forgot Password</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Title>Forgot Password</Title>
      <p className="text-gray-80 leading-none mt-4">
        Please enter your email address below and we will send you a secure link to reset your password.
      </p>
      <Formik initialValues={{ email: '' }} validationSchema={validationSchema} onSubmit={handleSubmit}>
        <Form className="flex flex-1 flex-col">
          <div className="space-y-6 mb-auto mt-6">
            <InputField type="email" name="email" placeholder="Email Address" />
            <p className="text-gray-80 leading-none">
              {data && 'An email with a link to reset your password has been sent to you'}
              {error && error.message}
            </p>
          </div>
          <Button type="submit" disabled={loading}>
            Reset Password
          </Button>
        </Form>
      </Formik>
    </AuthLayout>
  );
}
