import { ErrorMessage, Field, Form, Formik } from 'formik';
import { setJwt } from 'lib/apollo';
import { useRegisterMutation } from 'lib/graphql';
import React from 'react';
import { handleRegex } from 'utils/Validation';
import * as yup from 'yup';
import Button from './Button';

interface FormValues {
  email: string;
  handle: string;
  displayName: string;
  password: string;
  passwordConfirmation: string | undefined;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  email: yup.string().email().required().label('Email'),
  handle: yup
    .string()
    .min(1)
    .max(32)
    .matches(handleRegex, 'Invalid characters. Only letters and numbers are accepted.')
    .required(),
  displayName: yup.string().min(3).max(255).required().label('Display Name'),
  password: yup.string().min(8).required().label('Password'),
  passwordConfirmation: yup
    .string()
    .required()
    .test('passwords-match', 'Passwords must match', function (value) {
      return this.parent.password === value;
    }),
});

export const RegisterForm = () => {
  const [register, { loading, error }] = useRegisterMutation();
  const initialFormValues = { email: '', handle: '', displayName: '', password: '', passwordConfirmation: '' };

  const handleSubmit = async (values: FormValues) => {
    delete values.passwordConfirmation;
    try {
      const result = await register({ variables: { input: values } });
      setJwt(result.data?.register.jwt);
    } catch (error) {
      // handled by error state
    }
  };

  return (
    <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      <Form className="flex flex-col items-left space-y-6 w-full px-6">
        <div className="flex flex-col">
          <span className="mr-1">Email*</span>
          <Field type="text" name="email" />
          <ErrorMessage name="email" component="div" />
        </div>
        <div className="flex flex-col">
          <span className="mr-1">Handle*</span>
          <Field type="text" name="handle" />
          <ErrorMessage name="handle" component="div" />
        </div>
        <div className="flex flex-col">
          <span className="mr-1">Display Name*</span>
          <Field type="text" name="displayName" />
          <ErrorMessage name="displayName" component="div" />
        </div>
        <div className="flex flex-col">
          <span className="mr-1">Password*</span>
          <Field type="password" name="password" />
          <ErrorMessage name="password" component="div" />
        </div>
        <div className="flex flex-col">
          <span className="mr-1">Confirm password*</span>
          <Field type="password" name="passwordConfirmation" />
          <ErrorMessage name="passwordConfirmation" component="div" />
        </div>
        {error && <p>{error.message}</p>}
        <Button variant="outlined" type="submit" disabled={loading}>
          Create Account
        </Button>
      </Form>
    </Formik>
  );
};
