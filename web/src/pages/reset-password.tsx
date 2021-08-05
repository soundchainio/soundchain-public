import Button from 'components/Button';
import { InputField } from 'components/InputField';
import { LockedLayout } from 'components/LockedLayout';
import { Title } from 'components/Title';
import { Form, Formik, FormikHelpers } from 'formik';
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
  const handleSubmit = async ({ password }: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    await resetPassword({ variables: { input: { password, token } } });
    resetForm();
  };

  return (
    <LockedLayout>
      <Title>Reset Password</Title>
      <Formik
        initialValues={{ password: '', passwordConfirmation: '' }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        <Form className="flex flex-1 flex-col">
          <div className={error ? 'text-green-500' : 'text-gray-400'}>
            {data && 'Your password has been reset'}
            {error && error.message}
          </div>
          <div className="space-y-6 mb-auto mt-6">
            <InputField type="password" name="password" />
            <InputField type="password" name="passwordConfirmation" />
          </div>
          <Button type="submit" disabled={loading}>
            Reset Password
          </Button>
        </Form>
      </Formik>
    </LockedLayout>
  );
}
