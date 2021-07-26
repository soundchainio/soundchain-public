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
  confirm: string | undefined;
}

interface RegisterFormProps {
  onRegister: () => void;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  email: yup.string().required(),
  handle: yup.string().required(),
  displayName: yup.string().required(),
  password: yup.string().required(),
  confirm: yup.string().oneOf([yup.ref('password'), null], 'Passwords must match'),
});

export const RegisterForm = ({ onRegister }: RegisterFormProps) => {
  const [register, { loading, error }] = useRegisterMutation();

  async function handleSubmit(values: FormValues) {
    delete values.confirm;
    try {
      const result = await register({ variables: { input: values } });
      setJwt(result.data?.register.jwt);
      onRegister();
    } catch (error) {
      // handled by error state
    }
  }

  return (
    <Formik
      initialValues={{ email: '', handle: '', displayName: '', password: '', confirm: '' }}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
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
          <Field type="password" name="confirm" />
          <ErrorMessage name="confirm" component="div" />
        </div>
        {error && <p>{error.message}</p>}
        <button type="submit" disabled={loading} className="p-3 border-2 w-full">
          Register
        </button>
      </Form>
    </Formik>
  );
};
