import { ErrorMessage, Field, Form, Formik } from 'formik';
import React from 'react';
import * as yup from 'yup';
import { setJwt } from '../lib/apollo';
import { useRegisterMutation } from '../lib/graphql';

interface FormValues {
  email: string;
  handle: string;
  displayName: string;
  password: string;
  passwordConfirmation: string | undefined;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  email: yup.string().email().required(),
  handle: yup
    .string()
    .min(1)
    .max(32)
    .matches(/^[A-z0-9_]*$/, 'Invalid characters. Only letters and nubers accepted')
    .required(),
  displayName: yup.string().min(3).max(255).required(),
  password: yup.string().min(8).required(),
  passwordConfirmation: yup.string().oneOf([yup.ref('password'), null], 'Passwords must match'),
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
      <Form className="flex flex-col items-left space-y-6">
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
        <button type="submit" disabled={loading} className="p-3 border-2 w-full">
          Register
        </button>
      </Form>
    </Formik>
  );
};
