import { Form, Formik } from 'formik';
import React from 'react';
import { handleRegex } from 'utils/Validation';
import * as yup from 'yup';
import { Button } from './Button';
import { ImageUploadField } from './ImageUploadField';
import { InputField } from './InputField';
import { Label } from './Label';
import { Title } from './Title';
import { setMaxInputLength } from '../pages/settings/bio';

export interface SetupProfileFormValues {
  profilePicture?: string;
  coverPicture?: string;
  displayName: string;
  handle: string;
  bio?: string;
}

interface FormProps {
  onSubmit: (values: SetupProfileFormValues) => void;
}

const validationSchema: yup.SchemaOf<SetupProfileFormValues> = yup.object().shape({
  profilePicture: yup.string(),
  coverPicture: yup.string(),
  displayName: yup.string().min(3).max(255).required().label('Name'),
  bio: yup.string().label('Bio'),
  handle: yup
    .string()
    .min(1)
    .max(32)
    .matches(handleRegex, 'Invalid characters. Only letters and numbers are accepted.')
    .required()
    .label('Username'),
});

const initialFormValues = { displayName: '', handle: '' };

export const SetupProfileForm = ({ onSubmit }: FormProps) => (
  <div className="flex flex-col flex-1">
    <Title>Let’s setup your profile.</Title>
    <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
      {({ values }) => (

        <Form className="flex flex-1 flex-col">
          <div className="mb-auto space-y-6">
            <div className="my-2 flex items-stretch h-28">
              <ImageUploadField className="w-28" name="profilePicture" roundedFull>
                Profile Photo
              </ImageUploadField>
              <ImageUploadField className="ml-6 flex-1" name="coverPicture">
                Cover Photo
              </ImageUploadField>
            </div>
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
            <div>
              <Label className="pl-1 pb-4">Add a short bio. (Optional)</Label>
              <InputField
                textarea
                type="text"
                name="bio"
                rows="4"
                placeholder="Add a bio..."
                maxLength={setMaxInputLength(values.bio || '')}
              />
            </div>
          </div>
          <div className="flex flex-col mt-4">
            <Button type="submit">NEXT</Button>
          </div>
        </Form>
      )}
    </Formik>
  </div>
);
