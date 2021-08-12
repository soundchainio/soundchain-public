import { Form, Formik } from 'formik';
import React from 'react';
import * as yup from 'yup';
import { Button } from './Button';
import { InputField } from './InputField';
import { Label } from './Label';
import { Title } from './Title';

export interface RegisterEmailFormValues {
  email: string;
}

interface FormProps {
  onSubmit: (values: RegisterEmailFormValues) => void;
}

const validationSchema: yup.SchemaOf<RegisterEmailFormValues> = yup.object().shape({
  email: yup.string().email().required().label('Email'),
});

const initialFormValues = { email: '' };

export const RegisterEmailForm = ({ onSubmit }: FormProps) => {
  const handleSubmit = async (values: RegisterEmailFormValues) => {
    onSubmit(values);
  };

  return (
    <div className="flex flex-col flex-1 mt-6">
      <Title>Create Account</Title>
      <Label className="my-3">Please enter your email below.</Label>
      <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
        <Form className="flex flex-1 flex-col">
          <div className="flex flex-col mb-auto">
            <InputField type="text" name="email" placeholder="Email Address" />
          </div>
          <div className="flex flex-col">
            <Label className="text-center mb-6">
              By creating an account, I agree to the Terms & Conditions, Privacy Policy, and Distribution Agreement.
            </Label>
            <Button type="submit">CREATE ACCOUNT</Button>
          </div>
        </Form>
      </Formik>
    </div>
  );
};
