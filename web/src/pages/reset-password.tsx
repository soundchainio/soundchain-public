import { ErrorMessage, Field, Form, Formik } from 'formik';
import { GetServerSideProps } from 'next';
import * as yup from 'yup';
import { apolloClient } from '../lib/apollo';
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

export const getServerSideProps: GetServerSideProps<ResetPasswordPageProps> = async ({ query: { token } }) => {
  if (typeof token !== 'string') {
    return { notFound: true };
  }

  const { data } = await apolloClient.query<ValidPasswordResetTokenQuery, ValidPasswordResetTokenQueryVariables>({
    query: ValidPasswordResetTokenDocument,
    variables: { token },
  });

  if (!data.validPasswordResetToken) {
    return { notFound: true };
  }

  return { props: { token } };
};

export default function ResetPasswordPage({ token }: ResetPasswordPageProps) {
  const [resetPassword, { data, loading, error }] = useResetPasswordMutation();
  const handleSubmit = async ({ password }: FormValues) => {
    await resetPassword({ variables: { input: { password, token } } });
  };

  return (
    <div>
      {data && 'Your password has been reset'}
      {error && 'An error occurred'}
      <Formik
        initialValues={{ password: '', passwordConfirmation: '' }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        <Form>
          <Field type="password" name="password" />
          <ErrorMessage name="password" />
          <Field type="password" name="passwordConfirmation" />
          <ErrorMessage name="passwordConfirmation" />
          <button type="submit" disabled={loading}>
            Change password
          </button>
        </Form>
      </Formik>
    </div>
  );
}
