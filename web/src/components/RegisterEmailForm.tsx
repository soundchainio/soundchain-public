import { ErrorMessage, Field, Form, Formik } from 'formik';
import React from 'react';
import * as yup from 'yup';
import Button from './Button';
import { Label } from './Label';
import { Subtitle } from './Subtitle';
import { Title } from './Title';

interface FormValues {
  email: string;
}

interface FormProps {
  onSubmit: (values: FormValues) => void;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  email: yup.string().email().required().label('Email'),
});

const initialFormValues = { email: '' };

export const RegisterEmailForm = ({ onSubmit }: FormProps) => {
  const handleSubmit = async (values: FormValues) => {
    onSubmit(values);
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="h-60 flex items-center justify-center">
        <Title className="text-center">Soundchain</Title>
      </div>
      <Title>Create Account</Title>
      <Subtitle className="mt-1">Please enter your email below</Subtitle>
      <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
        <Form className="flex flex-1 flex-col items-left w-full mt-6">
          <div className="flex flex-col mb-auto">
            <Field type="text" name="email" />
            <ErrorMessage className="text-white" name="email" component="div" />
          </div>
          <div className="flex flex-col">
            <Label className="text-center">
              By creating an account, I agree to the Terms & Conditions, Privacy Policy, and Distribution Agreement.
            </Label>
            <Button className="border-2 border-white border-solid w-full my-6" variant="default" type="submit">
              CREATE ACCOUNT
            </Button>
          </div>
        </Form>
      </Formik>
    </div>
  );
};
