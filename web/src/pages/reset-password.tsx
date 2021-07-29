import { ErrorMessage, Field, Form, Formik, FormikHelpers } from 'formik';
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
  confirmPassword: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  password: yup.string().required().min(8),
  confirmPassword: yup
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
  const [resetPassword, { data }] = useResetPasswordMutation();
  const handleSubmit = async ({ password }: FormValues, { setSubmitting, resetForm }: FormikHelpers<FormValues>) => {
    await resetPassword({ variables: { input: { password, token } } });
    resetForm();
    setSubmitting(false);
  };

  return (
    <div>
      {data && 'Your password has been reset'}
      <Formik
        initialValues={{ password: '', confirmPassword: '' }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form>
            <Field type="password" name="password" />
            <ErrorMessage name="password" />
            <Field type="password" name="confirmPassword" />
            <ErrorMessage name="confirmPassword" />
            <button type="submit" disabled={isSubmitting}>
              Change password
            </button>
          </Form>
        )}
      </Formik>
    </div>
  );
}
