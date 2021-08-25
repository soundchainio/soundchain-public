import { AuthLayout } from 'components/AuthLayout';
import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import { Title } from 'components/Title';
import { Form, Formik, FormikHelpers } from 'formik';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import * as yup from 'yup';
import { cacheFor, createApolloClient } from '../lib/apollo';
import {
  useResetPasswordMutation,
  ValidPasswordResetTokenDocument,
  ValidPasswordResetTokenQuery,
  ValidPasswordResetTokenQueryVariables,
} from '../lib/graphql';

interface ResetPasswordPageProps {
  token: string;
}

interface FormValues {
  password: string;
  passwordConfirmation: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  password: yup.string().required().min(8),
  passwordConfirmation: yup
    .string()
    .required()
    .test('passwords-match', 'Passwords must match', function (value) {
      return this.parent.password === value;
    }),
});

export const getServerSideProps: GetServerSideProps<ResetPasswordPageProps> = async context => {
  const { token } = context.query;

  if (typeof token !== 'string') {
    return { notFound: true };
  }

  const apolloClient = createApolloClient(context);
  const { data } = await apolloClient.query<ValidPasswordResetTokenQuery, ValidPasswordResetTokenQueryVariables>({
    query: ValidPasswordResetTokenDocument,
    variables: { token },
  });

  if (!data.validPasswordResetToken) {
    return { notFound: true };
  }

  return cacheFor(ResetPasswordPage, { token }, context, apolloClient);
};

export default function ResetPasswordPage({ token }: ResetPasswordPageProps) {
  const [resetPassword, { data, loading, error }] = useResetPasswordMutation();
  const handleSubmit = async ({ password }: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    await resetPassword({ variables: { input: { password, token } } });
    resetForm();
  };

  return (
    <AuthLayout>
      <Head>
        <title>Soundchain - Reset Password</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Title>Reset Password</Title>
      <p className="text-gray-80 leading-none mt-4">Please enter and confirm the new password for your account.</p>
      <Formik
        initialValues={{ password: '', passwordConfirmation: '' }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        <Form className="flex flex-1 flex-col">
          <div className="space-y-6 mb-auto mt-6">
            <InputField type="password" name="password" placeholder="Password" />
            <InputField type="password" name="passwordConfirmation" placeholder="Password" />
            <p className="text-gray-80 leading-none">
              {data && 'Your password has been reset.'}
              {error && error.message}
            </p>
          </div>
          <Button type="submit" disabled={loading}>
            Change Password
          </Button>
        </Form>
      </Formik>
    </AuthLayout>
  );
}
