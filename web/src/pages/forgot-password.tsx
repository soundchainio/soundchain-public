import { ErrorMessage, Field, Form, Formik, FormikHelpers } from 'formik';
import * as yup from 'yup';
import { useForgotPasswordMutation } from '../lib/graphql';

interface FormValues {
  email: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  email: yup.string().email().required(),
});

export default function ForgotPasswordPage() {
  const [forgotPassword, { data }] = useForgotPasswordMutation();
  const handleSubmit = async ({ email }: FormValues, { setSubmitting, resetForm }: FormikHelpers<FormValues>) => {
    await forgotPassword({ variables: { email } });
    resetForm();
    setSubmitting(false);
  };

  return (
    <div>
      {data && 'Check your inbox for an email with a link to reset your password'}
      <Formik initialValues={{ email: '' }} validationSchema={validationSchema} onSubmit={handleSubmit}>
        {({ isSubmitting }) => (
          <Form>
            <Field type="email" name="email" />
            <ErrorMessage name="email" />
            <button type="submit" disabled={isSubmitting}>
              Send reset email
            </button>
          </Form>
        )}
      </Formik>
    </div>
  );
}
