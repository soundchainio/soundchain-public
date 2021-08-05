import { LockClosedIcon } from '@heroicons/react/solid';
import { Form, Formik } from 'formik';
import { Genre } from 'lib/graphql';
import React, { useState } from 'react';
import * as yup from 'yup';
import Button from './Button';
import { GenreSelector } from './GenreSelector';
import { InputField } from './InputField';
import { Label } from './Label';
import { Title } from './Title';

interface FormValidationValues {
  password: string;
  passwordConfirmation: string | undefined;
}

interface FormValues {
  password: string;
  favoriteGenres: Genre[];
}

interface FormProps {
  onSubmit: (values: FormValues) => void;
  loading: boolean;
  error: string | undefined;
}

const validationSchema: yup.SchemaOf<FormValidationValues> = yup.object().shape({
  password: yup.string().min(8).required().label('Password'),
  passwordConfirmation: yup
    .string()
    .required()
    .test('passwords-match', 'Passwords must match', function (value) {
      return this.parent.password === value;
    })
    .label('Password confirmation'),
});

const initialFormValues = { password: '', passwordConfirmation: '' };

export const CompleteProfileForm = ({ onSubmit, loading, error }: FormProps) => {
  const [favoriteGenres, setFavoriteGenres] = useState<Genre[]>([]);
  const handleSubmit = async (values: FormValidationValues) => {
    onSubmit({ ...values, favoriteGenres });
  };

  return (
    <div className="flex flex-col flex-1 mt-6 h-full">
      <Title>Complete your profile.</Title>
      <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
        <Form className="flex flex-1 flex-col items-left w-full my-6 ">
          <div className="mb-auto space-y-6">
            <InputField
              label="Please enter and cofirm the password for your account:"
              type="password"
              name="password"
              placeholder="Password"
              icon={LockClosedIcon}
            />
            <InputField
              type="password"
              name="passwordConfirmation"
              placeholder="Confirm Password"
              icon={LockClosedIcon}
            />
            <GenreSelector onSelect={setFavoriteGenres} />
          </div>
          <div className="flex flex-col">
            {error && <Label className="text-red-500 mb-2">{error}</Label>}
            <Button
              className="border-2 border-white border-solid w-full "
              variant="default"
              type="submit"
              disabled={loading}
            >
              NEXT
            </Button>
          </div>
        </Form>
      </Formik>
    </div>
  );
};
