import { ErrorMessage, Field, Form, Formik, FormikHelpers, FormikProps } from 'formik';
import * as yup from 'yup';

interface FormValues {
  username: string;
  password: string;
}

export default function LoginForm() {
  const initialValues: FormValues = { username: '', password: '' };
  const validationSchema = yup.object().shape({
    username: yup.string().required(),
    password: yup.string().required(),
  });

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={(values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
        setTimeout(() => {
          alert(JSON.stringify(values, null, 2));
          setSubmitting(false);
        }, 400);
      }}
    >
      {({ isSubmitting }: FormikProps<FormValues>) => (
        <Form className="flex flex-col items-center space-y-6">
          <div>
            <Field type="text" name="username" />
            <ErrorMessage name="username" component="div" />
          </div>
          <div>
            <Field type="password" name="password" />
            <ErrorMessage name="password" component="div" />
          </div>
          <a href="#">Forgot password?</a>
          <button type="submit" disabled={isSubmitting} className="p-3 border-2 w-full">
            Login
          </button>
        </Form>
      )}
    </Formik>
  );
}
