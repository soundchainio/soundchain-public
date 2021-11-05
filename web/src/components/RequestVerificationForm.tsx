import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import { Form, Formik } from 'formik';
import { Bandcamp } from 'icons/Bandcamp';
import { Soundcloud } from 'icons/Soundcloud';
import { Youtube } from 'icons/Youtube';
import React from 'react';
import * as yup from 'yup';

export interface FormValues {
  soundcloud?: string;
  youtube?: string;
  bandcamp?: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  soundcloud: yup.string(),
  youtube: yup.string(),
  bandcamp: yup.string(),
});

interface Props {
  handleSubmit: (values: FormValues) => void;
  loading: boolean;
}

const sourceList = [
  { name: 'SoundCloud', fieldName: 'soundcloud', icon: <Soundcloud className="h-7 w-7" /> },
  { name: 'YouTube', fieldName: 'youtube', icon: <Youtube className="h-7 w-7" /> },
  { name: 'BandCamp', fieldName: 'bandcamp', icon: <Bandcamp className="h-6 scale-50" /> },
];

export const RequestVerificationForm = ({ handleSubmit, loading }: Props) => {
  const defaultValues: FormValues = {
    soundcloud: '',
    bandcamp: '',
    youtube: '',
  };

  return (
    <Formik<FormValues>
      initialValues={defaultValues}
      enableReinitialize
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      <Form className="flex flex-col gap-4">
        <div className="flex flex-col flex-1 gap-6 mt-2">
          {sourceList.map(src => (
            <div key={src.name} className="flex items-center gap-2">
              <div className="flex flex-col items-center justify-center  text-xs">
                <div className="w-20 flex flex-col text-xs items-center">{src.icon}</div>
                {src.name}
              </div>
              <div className="flex-1">
                <InputField name={src.fieldName} type="text" placeholder={`${src.name} Link`} />
              </div>
            </div>
          ))}
        </div>
        <Button
          type="submit"
          variant="outline"
          borderColor="bg-green-gradient"
          className="h-12 mt-5"
          disabled={loading}
        >
          REQUEST VERIFICATION
        </Button>
      </Form>
    </Formik>
  );
};
