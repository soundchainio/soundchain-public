import { Form, Formik } from 'formik';
import React, { useState } from 'react';
import { handleRegex } from 'utils/Validation';
import * as yup from 'yup';
import { Button } from './Button';
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
  const [profilePicture, setProfilePicture] = useState<File>();
  const [coverPicture, setCoverPicture] = useState<File>();
  const handleSubmit = async (values: FormValues) => {
    onSubmit(values);
  };

  const onProfilePictureSelected = <T extends File>(picture: T) => {
    console.log(picture);
    setProfilePicture(picture);
  };

  const onCoverPictureSelected = <T extends File>(picture: T) => {
    console.log(picture);
    setCoverPicture(picture);
  };

  return (
    <div className="flex flex-col flex-1 mt-6">
      <Title>Let’s setup your profile.</Title>
      <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
        <Form className="flex flex-1 flex-col">
          <div className="mb-auto space-y-6">
            <ProfilePictureUploader
              onProfilePictureSelected={onProfilePictureSelected}
              onCoverPictureSelected={onCoverPictureSelected}
            />
            <div>
              <Label className="pl-1">First or full name.</Label>
              <InputField
                label="(This will be displayed publically to other users.)"
                type="text"
                name="displayName"
                placeholder="Name"
              />
            </div>
            <div>
              <Label className="pl-1">Enter username.</Label>
              <InputField label="Only letters and numbers allowed." type="text" name="handle" placeholder="Username" />
            </div>
          </div>
          <div className="flex flex-col">
            <Button type="submit">NEXT</Button>
          </div>
        </Form>
      </Formik>
    </div>
  );
};
