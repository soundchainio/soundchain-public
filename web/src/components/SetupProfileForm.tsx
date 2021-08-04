import { ErrorMessage, Field, Form, Formik } from 'formik';
import { Camera } from 'icons/Camera';
import React from 'react';
import { handleRegex } from 'utils/Validation';
import * as yup from 'yup';
import Button from './Button';
import { InputField } from './InputField';
import { Label } from './Label';
import { ProfilePictureUploader } from './ProfilePictureUploader';
import { Title } from './Title';

interface FormValues {
  displayName: string;
  handle: string;
}

interface FormProps {
  onSubmit: (values: FormValues) => void;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  displayName: yup.string().min(3).max(255).required().label('Name'),
  handle: yup
    .string()
    .min(1)
    .max(32)
    .matches(handleRegex, 'Invalid characters. Only letters and numbers are accepted.')
    .required()
    .label('Username'),
});

const initialFormValues = { displayName: '', handle: '' };

export const SetupProfileForm = ({ onSubmit }: FormProps) => {
  const handleSubmit = async (values: FormValues) => {
    onSubmit(values);
  };

  return (
    <div className="flex flex-col flex-1 mt-6 h-full">
      <Title>Let’s setup your profile.</Title>
      <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
        <Form className="flex flex-1 flex-col items-left w-full my-6 ">
          <div className="mb-auto space-y-6">
            <ProfilePictureUploader />
            <InputField
              label="First or full name. (This will be displayed publically to other users."
              type="text"
              name="displayName"
              placeholder="Name"
            />
            <InputField
              label="Enter username. Only letters and numbers allowed."
              type="text"
              name="handle"
              placeholder="Username"
            />
          </div>
          <div className="flex flex-col">
            <Button className="border-2 border-white border-solid w-full " variant="default" type="submit">
              NEXT
            </Button>
          </div>
        </Form>
      </Formik>
    </div>
  );
};
